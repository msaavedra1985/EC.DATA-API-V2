// modules/resource-hierarchy/services.js
// Lógica de negocio para ResourceHierarchy (Jerarquía de Recursos)

import * as repository from './repository.js';
import { findOrganizationByPublicCodeInternal } from '../organizations/repository.js';
import { findSiteByPublicCodeInternal } from '../sites/repository.js';
import { findChannelByPublicCodeInternal } from '../channels/repository.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import logger from '../../utils/logger.js';
import * as cache from './cache.js';
import { invalidateChannelCache } from '../channels/cache.js';

const hierarchyLogger = logger.child({ component: 'resource-hierarchy' });

// ============ OPERACIONES DE NODOS ============

/**
 * Crear un nuevo nodo en la jerarquía
 * 
 * @param {Object} nodeData - Datos del nodo
 * @param {string} nodeData.organization_id - ID de la organización (public_code o UUID)
 * @param {string|null} nodeData.parent_id - ID del nodo padre (public_code o UUID, null para raíz)
 * @param {string} nodeData.node_type - Tipo: folder, site, channel
 * @param {string} nodeData.name - Nombre del nodo
 * @param {string|null} nodeData.reference_id - Public code del recurso referenciado (ej: CHN-xxx, SIT-xxx) (opcional)
 * @param {string} userId - UUID del usuario que crea
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent
 * @returns {Promise<Object>} - Nodo creado
 */
export const createNode = async (nodeData, userId, ipAddress, userAgent) => {
    const organizationUuid = await resolveOrganizationId(nodeData.organizationId);
    
    let parentUuid = null;
    let parentNode = null;
    
    if (nodeData.parentId) {
        parentNode = await resolveNodeId(nodeData.parentId);
        if (!parentNode) {
            const error = new Error('Nodo padre no encontrado');
            error.status = 404;
            error.code = 'PARENT_NODE_NOT_FOUND';
            throw error;
        }
        
        // Validar que el padre pertenece a la misma organización
        if (parentNode._organizationId !== organizationUuid) {
            const error = new Error('El nodo padre debe pertenecer a la misma organización');
            error.status = 400;
            error.code = 'PARENT_ORG_MISMATCH';
            throw error;
        }
        
        parentUuid = parentNode._uuid;
    }
    
    validateNodeTypeRules(nodeData.nodeType, parentNode);
    
    let enrichedNodeData = { ...nodeData };
    
    if (nodeData.nodeType === 'site') {
        enrichedNodeData = await enrichSiteNode(nodeData, organizationUuid);
    } else if (nodeData.nodeType === 'channel') {
        enrichedNodeData = await enrichChannelNode(nodeData, organizationUuid);
    }
    
    if (enrichedNodeData.referenceId && (enrichedNodeData.nodeType === 'site' || enrichedNodeData.nodeType === 'channel')) {
        const existingNode = await repository.findNodeByReferenceId(enrichedNodeData.referenceId, organizationUuid);
        if (existingNode) {
            const duplicatePublicCode = existingNode.public_code || existingNode.publicCode;
            const error = new Error(`Este recurso (${enrichedNodeData.referenceId}) ya existe en la jerarquía de la organización`);
            error.status = 409;
            error.code = 'REFERENCE_ALREADY_IN_HIERARCHY';
            error.details = { duplicateNodePublicCode: duplicatePublicCode };
            throw error;
        }
    }
    
    const node = await repository.createNode({
        organizationId: organizationUuid,
        parentId: parentUuid,
        nodeType: enrichedNodeData.nodeType,
        referenceId: enrichedNodeData.referenceId || null,
        name: enrichedNodeData.name,
        description: enrichedNodeData.description || null,
        icon: enrichedNodeData.icon || getDefaultIcon(enrichedNodeData.nodeType),
        displayOrder: enrichedNodeData.displayOrder || 0,
        metadata: enrichedNodeData.metadata || {},
        assetCategoryId: enrichedNodeData.assetCategoryId || null
    });
    
    await logAuditAction({
        entityType: 'resource_hierarchy',
        entityId: node.id,
        action: 'created',
        performedBy: userId,
        changes: { new: node },
        metadata: {
            nodeType: nodeData.nodeType,
            parentId: nodeData.parentId,
            organizationId: nodeData.organizationId
        },
        ipAddress,
        userAgent
    });
    
    await cache.invalidateNodeAndRelated(node.id, organizationUuid, parentNode?.publicCode || null);
    
    if (nodeData.nodeType === 'channel') {
        await invalidateChannelCache();
    }
    
    hierarchyLogger.info({ nodeId: node.id, nodeType: nodeData.nodeType, userId }, 'Node created successfully');
    
    return sanitizeNode(node);
};

/**
 * Obtener un nodo por su public_code
 * 
 * @param {string} publicCode - Código público del nodo
 * @returns {Promise<Object>} - Nodo encontrado
 */
export const getNodeByPublicCode = async (publicCode) => {
    // Intentar obtener de cache primero
    const cachedNode = await cache.getCachedNode(publicCode);
    if (cachedNode) {
        return sanitizeNode(cachedNode);
    }
    
    const node = await repository.findNodeByPublicCode(publicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    // Guardar en cache
    await cache.cacheNode(publicCode, node);
    
    return sanitizeNode(node);
};

/**
 * Obtener hijos directos de un nodo
 * 
 * @param {string} nodePublicCode - Código público del nodo padre (o 'root' para raíces)
 * @param {string} organizationId - ID de la organización
 * @param {Object} options - Opciones de paginación y filtro
 * @returns {Promise<Object>} - Lista de hijos
 */
export const getNodeChildren = async (nodePublicCode, organizationId, options = {}) => {
    const { showAll = false } = options;
    
    // En modo showAll (God View), no resolvemos ni filtramos por organización
    const organizationUuid = showAll ? null : await resolveOrganizationId(organizationId);
    
    // Intentar obtener de cache primero (solo si hay organización específica)
    if (!showAll && organizationUuid) {
        const cachedResult = await cache.getCachedChildren(nodePublicCode, organizationUuid, options);
        if (cachedResult) {
            return {
                data: cachedResult.data.map(sanitizeNode),
                meta: cachedResult.meta
            };
        }
    }
    
    let parentUuid = null;
    
    if (nodePublicCode && nodePublicCode !== 'root') {
        const parentNode = await repository.findNodeByPublicCodeInternal(nodePublicCode);
        if (!parentNode) {
            const error = new Error('Nodo padre no encontrado');
            error.status = 404;
            error.code = 'NODE_NOT_FOUND';
            throw error;
        }
        parentUuid = parentNode.id;
    }
    
    const result = await repository.getChildren(parentUuid, organizationUuid, { ...options, showAll });
    
    const response = {
        data: result.data,
        meta: {
            total: result.total,
            limit: options.limit || 100,
            offset: options.offset || 0
        }
    };
    
    // Guardar en cache
    await cache.cacheChildren(nodePublicCode, organizationUuid, options, response);
    
    return {
        data: result.data.map(sanitizeNode),
        meta: response.meta
    };
};

/**
 * Obtener todos los descendientes de un nodo
 * 
 * @param {string} nodePublicCode - Código público del nodo ancestro
 * @param {Object} options - Opciones (limit, offset, nodeType, maxDepth)
 * @returns {Promise<Object>} - Lista de descendientes
 */
export const getNodeDescendants = async (nodePublicCode, options = {}) => {
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    const result = await repository.getDescendants(node.id, options);
    
    return {
        data: result.data.map(sanitizeNode),
        meta: {
            total: result.total,
            limit: options.limit || 500,
            offset: options.offset || 0
        }
    };
};

/**
 * Obtener ancestros de un nodo hasta la raíz
 * 
 * @param {string} nodePublicCode - Código público del nodo
 * @returns {Promise<Array>} - Lista de ancestros (desde raíz hasta padre directo)
 */
export const getNodeAncestors = async (nodePublicCode) => {
    // Intentar obtener de cache primero
    const cachedAncestors = await cache.getCachedAncestors(nodePublicCode);
    if (cachedAncestors) {
        return cachedAncestors.map(sanitizeNode);
    }
    
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    const ancestors = await repository.getAncestors(node.id);
    
    // Guardar en cache
    await cache.cacheAncestors(nodePublicCode, ancestors);
    
    return ancestors.map(sanitizeNode);
};

/**
 * Obtener árbol completo de una organización
 * 
 * @param {string} organizationId - ID de la organización
 * @param {Object} options - Opciones (rootId para subárbol, maxDepth)
 * @returns {Promise<Array>} - Árbol estructurado
 */
export const getTree = async (organizationId, options = {}) => {
    const { showAll = false } = options;
    
    // En modo showAll (God View), no resolvemos ni filtramos por organización
    const organizationUuid = showAll ? null : await resolveOrganizationId(organizationId);
    
    // Intentar obtener de cache primero (solo si hay organización específica)
    if (!showAll && organizationUuid) {
        const cacheOptions = { rootId: options.rootId, maxDepth: options.maxDepth };
        const cachedTree = await cache.getCachedTree(organizationUuid, cacheOptions);
        if (cachedTree) {
            return sanitizeTree(cachedTree);
        }
    }
    
    let rootUuid = null;
    if (options.rootId) {
        const rootNode = await repository.findNodeByPublicCodeInternal(options.rootId);
        if (!rootNode) {
            const error = new Error('Nodo raíz no encontrado');
            error.status = 404;
            error.code = 'NODE_NOT_FOUND';
            throw error;
        }
        rootUuid = rootNode.id;
    }
    
    const tree = await repository.getTree(organizationUuid, {
        rootId: rootUuid,
        maxDepth: options.maxDepth,
        showAll
    });
    
    // Guardar en cache (solo si hay organización específica)
    if (!showAll && organizationUuid) {
        const cacheOptions = { rootId: options.rootId, maxDepth: options.maxDepth };
        await cache.cacheTree(organizationUuid, cacheOptions, tree);
    }
    
    return sanitizeTree(tree);
};

/**
 * Obtener árbol filtrado por categoría de asset
 * Retorna solo las ramas que contienen nodos con el tag especificado
 * Útil para mostrar solo canales de cierto tipo (ej: "Aire Acondicionado")
 * 
 * @param {string} organizationId - Public code o UUID de la organización
 * @param {number} categoryId - ID de la categoría (asset_category.id)
 * @param {Object} options - Opciones adicionales
 * @param {boolean} options.includeSubcategories - Si incluir subcategorías del tag (default: true)
 * @returns {Promise<Array>} - Árbol filtrado con solo ramas relevantes
 */
export const getFilteredTree = async (organizationId, categoryId, options = {}) => {
    const organizationUuid = await resolveOrganizationId(organizationId);
    
    const tree = await repository.getFilteredTree(organizationUuid, categoryId, {
        includeSubcategories: options.includeSubcategories ?? true,
        limit: options.limit || 500
    });
    
    return sanitizeTree(tree);
};

/**
 * Verificar si un nodo tiene descendientes con cierta categoría
 * Útil para lazy loading en frontend
 * 
 * @param {string} nodePublicCode - Public code del nodo padre
 * @param {number} categoryId - ID de la categoría
 * @param {boolean} includeSubcategories - Si incluir subcategorías
 * @returns {Promise<boolean>} - true si hay descendientes con el tag
 */
export const hasDescendantsWithCategory = async (nodePublicCode, categoryId, includeSubcategories = true) => {
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    return await repository.hasDescendantsWithCategory(node.id, categoryId, includeSubcategories);
};

/**
 * Mover un nodo a un nuevo padre y/o cambiar su display_order
 * Incluye validaciones:
 * - Nodo y nuevo padre existen
 * - Misma organización (no se permite mover entre orgs)
 * - Detección de ciclos (no mover a un descendiente)
 * - No mover a sí mismo
 * - Permisos cruzados: usuario debe tener acceso 'edit' en origen Y destino
 * 
 * @param {string} nodePublicCode - Código público del nodo a mover
 * @param {string|null} newParentPublicCode - Código público del nuevo padre (null para raíz)
 * @param {string} userId - UUID del usuario
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent
 * @param {boolean} skipPermissionCheck - Si true, no verifica permisos (para admins)
 * @param {number|undefined} displayOrder - Nuevo orden de visualización (opcional)
 * @returns {Promise<Object>} - Nodo actualizado
 */
export const moveNode = async (nodePublicCode, newParentPublicCode, userId, ipAddress, userAgent, skipPermissionCheck = false, displayOrder = undefined, organizationContext = null) => {
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    if (organizationContext && !organizationContext.canAccessAll) {
        if (organizationContext.id) {
            if (node.organizationId !== organizationContext.id) {
                const error = new Error('No tienes permiso para mover nodos de otra organización');
                error.status = 403;
                error.code = 'NODE_ORG_MISMATCH';
                throw error;
            }
        } else if (organizationContext.allowedIds && organizationContext.allowedIds.length > 0) {
            if (!organizationContext.allowedIds.includes(node.organizationId)) {
                const error = new Error('No tienes permiso para mover nodos de otra organización');
                error.status = 403;
                error.code = 'NODE_ORG_MISMATCH';
                throw error;
            }
        }
    }
    
    const oldParentId = node.parentId;
    const oldDisplayOrder = node.displayOrder;
    let newParentUuid = null;
    let newParent = null;
    
    if (newParentPublicCode) {
        newParent = await repository.findNodeByPublicCodeInternal(newParentPublicCode);
        if (!newParent) {
            const error = new Error('Nuevo nodo padre no encontrado');
            error.status = 404;
            error.code = 'NEW_PARENT_NOT_FOUND';
            throw error;
        }
        
        if (newParent.organizationId !== node.organizationId) {
            const error = new Error('No se puede mover a una organización diferente');
            error.status = 400;
            error.code = 'CROSS_ORG_MOVE_NOT_ALLOWED';
            throw error;
        }
        
        newParentUuid = newParent.id;
    }
    
    // Verificar permisos cruzados: usuario necesita 'edit' en origen Y destino
    // Los admins pueden saltarse esta verificación
    if (!skipPermissionCheck) {
        // Verificar permiso en el nodo origen
        const hasSourceAccess = await repository.checkAccess(userId, node.id, 'edit');
        if (!hasSourceAccess) {
            const error = new Error('No tiene permisos para mover este nodo');
            error.status = 403;
            error.code = 'INSUFFICIENT_SOURCE_PERMISSIONS';
            throw error;
        }
        
        // Si hay nuevo padre, verificar permiso en el destino
        if (newParentUuid) {
            const hasDestinationAccess = await repository.checkAccess(userId, newParentUuid, 'edit');
            if (!hasDestinationAccess) {
                const error = new Error('No tiene permisos sobre el nodo destino');
                error.status = 403;
                error.code = 'INSUFFICIENT_DESTINATION_PERMISSIONS';
                throw error;
            }
        }
        // Nota: Si newParentPublicCode es null (mover a raíz), 
        // solo verificamos acceso al nodo origen ya que el nivel raíz no tiene permisos específicos
    }
    
    let updatedNode;
    
    try {
        // Mover el nodo (cambia parent_id y path)
        updatedNode = await repository.moveNode(node.id, newParentUuid);
        
        if (displayOrder !== undefined) {
            updatedNode = await repository.updateNode(node.id, { displayOrder: displayOrder });
        }
    } catch (repoError) {
        // Convertir errores del repository a errores HTTP
        if (repoError.code === 'CYCLE_DETECTED') {
            const error = new Error('No se puede mover un nodo a uno de sus descendientes');
            error.status = 400;
            error.code = 'CYCLE_DETECTED';
            throw error;
        }
        if (repoError.code === 'SELF_REFERENCE') {
            const error = new Error('No se puede mover un nodo a sí mismo');
            error.status = 400;
            error.code = 'SELF_REFERENCE';
            throw error;
        }
        throw repoError;
    }
    
    const changes = {
        parentId: { 
            old: oldParentId, 
            new: newParentUuid 
        }
    };
    
    if (displayOrder !== undefined && displayOrder !== oldDisplayOrder) {
        changes.displayOrder = {
            old: oldDisplayOrder,
            new: displayOrder
        };
    }
    
    await logAuditAction({
        entityType: 'resource_hierarchy',
        entityId: nodePublicCode,
        action: 'moved',
        performedBy: userId,
        changes,
        metadata: {
            nodeType: node.nodeType,
            oldParentPublicCode: oldParentId ? (await repository.findNodeById(oldParentId))?.publicCode : null,
            newParentPublicCode: newParentPublicCode
        },
        ipAddress,
        userAgent
    });
    
    const oldParentPublicCode = oldParentId ? (await repository.findNodeById(oldParentId))?.publicCode : null;
    await cache.invalidateAfterMove(nodePublicCode, node.organizationId, oldParentPublicCode, newParentPublicCode);
    
    hierarchyLogger.info({ nodeId: nodePublicCode, newParent: newParentPublicCode, userId }, 'Node moved successfully');
    
    return sanitizeNode(updatedNode);
};

/**
 * Actualizar un nodo
 * 
 * @param {string} nodePublicCode - Código público del nodo
 * @param {Object} updates - Campos a actualizar
 * @param {string} userId - UUID del usuario
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent
 * @returns {Promise<Object>} - Nodo actualizado
 */
export const updateNode = async (nodePublicCode, updates, userId, ipAddress, userAgent, organizationContext = null) => {
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    if (organizationContext && !organizationContext.canAccessAll) {
        if (organizationContext.id) {
            if (node.organizationId !== organizationContext.id) {
                const error = new Error('No tienes permiso para modificar nodos de otra organización');
                error.status = 403;
                error.code = 'NODE_ORG_MISMATCH';
                throw error;
            }
        } else if (organizationContext.allowedIds && organizationContext.allowedIds.length > 0) {
            if (!organizationContext.allowedIds.includes(node.organizationId)) {
                const error = new Error('No tienes permiso para modificar nodos de otra organización');
                error.status = 403;
                error.code = 'NODE_ORG_MISMATCH';
                throw error;
            }
        }
    }
    
    const oldValues = {
        name: node.name,
        description: node.description,
        icon: node.icon,
        displayOrder: node.displayOrder,
        isActive: node.isActive
    };
    
    const updatedNode = await repository.updateNode(node.id, updates);
    
    // Calcular cambios
    const changes = {};
    for (const [key, oldValue] of Object.entries(oldValues)) {
        if (updates[key] !== undefined && updates[key] !== oldValue) {
            changes[key] = { old: oldValue, new: updates[key] };
        }
    }
    
    // Audit log (crítico para compliance - debe esperarse)
    await logAuditAction({
        entityType: 'resource_hierarchy',
        entityId: nodePublicCode,
        action: 'updated',
        performedBy: userId,
        changes,
        metadata: { nodeType: node.nodeType },
        ipAddress,
        userAgent
    });
    
    try {
        const parentPublicCode = node.parentId ? (await repository.findNodeById(node.parentId))?.publicCode : null;
        await Promise.race([
            cache.invalidateNodeAndRelated(nodePublicCode, node.organizationId, parentPublicCode),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Cache timeout')), 5000))
        ]);
    } catch (err) {
        // Si el cache falla o timeout, logueamos pero no bloqueamos al usuario
        hierarchyLogger.warn({ err: err.message, nodePublicCode }, 'Cache invalidation failed or timed out, continuing');
    }
    
    hierarchyLogger.info({ nodeId: nodePublicCode, userId }, 'Node updated successfully');
    
    return sanitizeNode(updatedNode);
};

/**
 * Eliminar un nodo (soft delete)
 * Si el nodo tiene hijos y no se envía cascade=true, retorna error con lista de nodos afectados
 * Si cascade=true, elimina el nodo y todos sus descendientes
 * 
 * @param {string} nodePublicCode - Código público del nodo
 * @param {boolean} cascade - Si eliminar también los descendientes (default false)
 * @param {string} userId - UUID del usuario
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent
 * @returns {Promise<Object>} - Resultado de la eliminación con lista de nodos eliminados
 */
export const deleteNode = async (nodePublicCode, cascade = false, userId, ipAddress, userAgent, organizationContext = null) => {
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    if (organizationContext && !organizationContext.canAccessAll) {
        if (organizationContext.id) {
            if (node.organizationId !== organizationContext.id) {
                const error = new Error('No tienes permiso para eliminar nodos de otra organización');
                error.status = 403;
                error.code = 'NODE_ORG_MISMATCH';
                throw error;
            }
        } else if (organizationContext.allowedIds && organizationContext.allowedIds.length > 0) {
            if (!organizationContext.allowedIds.includes(node.organizationId)) {
                const error = new Error('No tienes permiso para eliminar nodos de otra organización');
                error.status = 403;
                error.code = 'NODE_ORG_MISMATCH';
                throw error;
            }
        }
    }
    
    let result;
    
    try {
        // Intentar eliminar - el repository lanzará error si tiene hijos y no es cascade
        result = await repository.deleteNode(node.id, cascade);
    } catch (repoError) {
        // Si tiene hijos y no vino cascade, re-lanzar con status HTTP apropiado
        if (repoError.code === 'HAS_CHILDREN') {
            const error = new Error('El nodo tiene hijos. Debe confirmar la eliminación en cascada.');
            error.status = 409;
            error.code = 'HAS_CHILDREN';
            error.data = repoError.data;
            throw error;
        }
        throw repoError;
    }
    
    // Audit log con detalle de todos los nodos eliminados (crítico para compliance)
    await logAuditAction({
        entityType: 'resource_hierarchy',
        entityId: nodePublicCode,
        action: 'deleted',
        performedBy: userId,
        changes: { 
            old: { name: node.name, nodeType: node.nodeType }
        },
        metadata: {
            cascade,
            userConfirmedCascade: cascade,
            deletedCount: result.deletedCount,
            deletedNodes: result.deletedNodes
        },
        ipAddress,
        userAgent
    });
    
    // Invalidar cache de toda la organización
    // Usar timeout para evitar bloqueos indefinidos si Redis tiene problemas
    try {
        const parentPublicCode = node.parentId ? (await repository.findNodeById(node.parentId))?.publicCode : null;
        await Promise.race([
            cache.invalidateNodeAndRelated(nodePublicCode, node.organizationId, parentPublicCode),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Cache timeout')), 5000))
        ]);
    } catch (err) {
        hierarchyLogger.warn({ err: err.message, nodePublicCode }, 'Cache invalidation failed or timed out, continuing');
    }
    
    await invalidateChannelCache();
    
    hierarchyLogger.info({ 
        nodeId: nodePublicCode, 
        deletedCount: result.deletedCount, 
        cascade, 
        userId 
    }, 'Node deleted successfully');
    
    return {
        deletedCount: result.deletedCount,
        deletedNodes: result.deletedNodes,
        cascade
    };
};

/**
 * Listar nodos de una organización con filtros
 * Soporta modo God View cuando showAll=true (no filtra por organización)
 * 
 * @param {string|null} organizationId - ID de la organización (null si showAll)
 * @param {Object} options - Opciones de filtro y paginación
 * @param {boolean} options.showAll - Si true, no filtra por organización (God View)
 * @returns {Promise<Object>} - Lista de nodos
 */
export const listNodes = async (organizationId, options = {}) => {
    const { showAll = false } = options;
    
    // En modo showAll (God View), no resolvemos ni filtramos por organización
    const organizationUuid = showAll ? null : await resolveOrganizationId(organizationId);
    
    // Intentar obtener de cache primero (solo si hay organización específica)
    if (!showAll && organizationUuid) {
        const cachedResult = await cache.getCachedList(organizationUuid, options);
        if (cachedResult) {
            return {
                data: cachedResult.data.map(sanitizeNode),
                meta: cachedResult.meta
            };
        }
    }
    
    // Resolver parent_id si se proporciona como public_code
    let parentUuid = undefined;
    if (options.parentId !== undefined) {
        if (options.parentId === null || options.parentId === 'root') {
            parentUuid = null;
        } else {
            const parentNode = await repository.findNodeByPublicCodeInternal(options.parentId);
            if (parentNode) {
                parentUuid = parentNode.id;
            }
        }
    }
    
    const result = await repository.listNodes(organizationUuid, {
        ...options,
        parentId: parentUuid,
        showAll
    });
    
    const response = {
        data: result.data,
        meta: {
            total: result.total,
            limit: options.limit || 50,
            offset: options.offset || 0
        }
    };
    
    // Guardar en cache
    await cache.cacheList(organizationUuid, options, response);
    
    return {
        data: result.data.map(sanitizeNode),
        meta: response.meta
    };
};

// ============ OPERACIONES DE ACCESO ============

/**
 * Otorgar acceso a un usuario sobre un nodo
 * 
 * @param {Object} accessData - Datos del acceso
 * @param {string} grantedBy - UUID del usuario que otorga
 * @param {string} ipAddress - IP
 * @param {string} userAgent - User agent
 * @returns {Promise<Object>} - Acceso creado/actualizado
 */
export const grantNodeAccess = async (accessData, grantedBy, ipAddress, userAgent) => {
    const node = await repository.findNodeByPublicCodeInternal(accessData.nodeId);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    const access = await repository.grantAccess({
        userId: accessData.userId,
        resourceNodeId: node.id,
        organizationId: node.organizationId,
        accessType: accessData.accessType || 'view',
        includeDescendants: accessData.includeDescendants !== false,
        grantedBy: grantedBy,
        expiresAt: accessData.expiresAt || null,
        notes: accessData.notes || null
    });
    
    await logAuditAction({
        entityType: 'user_resource_access',
        entityId: `${accessData.userId}:${accessData.nodeId}`,
        action: 'granted',
        performedBy: grantedBy,
        changes: { new: access },
        metadata: {
            nodeId: accessData.nodeId,
            accessType: accessData.accessType,
            includeDescendants: accessData.includeDescendants
        },
        ipAddress,
        userAgent
    });
    
    hierarchyLogger.info({ userId: accessData.userId, nodeId: accessData.nodeId, grantedBy }, 'Access granted successfully');
    
    return access;
};

/**
 * Revocar acceso de un usuario sobre un nodo
 * 
 * @param {string} userId - UUID del usuario
 * @param {string} nodePublicCode - Código público del nodo
 * @param {string} revokedBy - UUID del usuario que revoca
 * @param {string} ipAddress - IP
 * @param {string} userAgent - User agent
 * @returns {Promise<boolean>} - true si se revocó
 */
export const revokeNodeAccess = async (userId, nodePublicCode, revokedBy, ipAddress, userAgent) => {
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    const revoked = await repository.revokeAccess(userId, node.id);
    
    if (revoked) {
        // Audit log
        await logAuditAction({
            entityType: 'user_resource_access',
            entityId: `${userId}:${nodePublicCode}`,
            action: 'revoked',
            performedBy: revokedBy,
            metadata: { nodeId: nodePublicCode },
            ipAddress,
            userAgent
        });
        
        hierarchyLogger.info({ userId, nodeId: nodePublicCode, revokedBy }, 'Access revoked successfully');
    }
    
    return revoked;
};

/**
 * Verificar si un usuario tiene acceso a un nodo
 * 
 * @param {string} userId - UUID del usuario
 * @param {string} nodePublicCode - Código público del nodo
 * @param {string} requiredAccess - Nivel requerido (view, edit, admin)
 * @returns {Promise<boolean>} - true si tiene acceso
 */
export const checkNodeAccess = async (userId, nodePublicCode, requiredAccess = 'view') => {
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        return false;
    }
    
    return await repository.checkAccess(userId, node.id, requiredAccess);
};

/**
 * Obtener todos los nodos accesibles por un usuario
 * 
 * @param {string} userId - UUID del usuario
 * @param {string} organizationId - ID de la organización
 * @param {string} accessType - Nivel de acceso requerido
 * @returns {Promise<Array>} - Lista de nodos accesibles
 */
export const getAccessibleNodes = async (userId, organizationId, accessType = 'view') => {
    const organizationUuid = await resolveOrganizationId(organizationId);
    
    const nodeIds = await repository.getAccessibleNodeIds(userId, organizationUuid, accessType);
    
    // Obtener detalles de los nodos
    const nodes = [];
    for (const nodeId of nodeIds) {
        const node = await repository.findNodeById(nodeId);
        if (node) {
            nodes.push(sanitizeNode(node));
        }
    }
    
    return nodes;
};

// ============ HELPERS PRIVADOS ============

/**
 * Resolver organization_id de public_code a UUID
 */
const resolveOrganizationId = async (organizationId) => {
    // Validar que organizationId no sea undefined o null
    if (!organizationId) {
        const error = new Error('ID de organización es requerido');
        error.status = 400;
        error.code = 'ORGANIZATION_ID_REQUIRED';
        throw error;
    }
    
    // Si ya es UUID, retornar
    if (organizationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return organizationId;
    }
    
    // Buscar por public_code
    const org = await findOrganizationByPublicCodeInternal(organizationId);
    if (!org) {
        const error = new Error('Organización no encontrada');
        error.status = 404;
        error.code = 'ORGANIZATION_NOT_FOUND';
        throw error;
    }
    
    return org.id;
};

/**
 * Resolver node_id de public_code a modelo
 */
const resolveNodeId = async (nodeId) => {
    // Si ya es UUID, buscar por ID
    if (nodeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const node = await repository.findNodeById(nodeId);
        if (node) {
            return {
                _uuid: node.id,
                _organizationId: node.organizationId
            };
        }
        return null;
    }
    
    // Buscar por public_code
    return await repository.findNodeByPublicCode(nodeId);
};

/**
 * Validar reglas de tipo de nodo
 * 
 * Reglas actuales (flexibles para soportar canales totalizadores):
 * - Los channels pueden contener cualquier tipo de hijo (channels, folders, sites)
 *   porque pueden actuar como totalizadores que agregan datos de sites o conjuntos de canales
 * - Los sites pueden estar en carpetas, canales o en la raíz
 * - Las carpetas pueden estar en cualquier lugar
 * 
 * Esta flexibilidad permite estructuras como:
 * - Canal totalizador → Site (el canal agrega los datos del site)
 * - Canal totalizador → Múltiples canales (el canal agrega datos de varios canales)
 * - Canal totalizador → Carpeta → Sites/Canales (organización jerárquica)
 */
const validateNodeTypeRules = (nodeType, parentNode) => {
    // Actualmente no hay restricciones de tipo padre-hijo
    // Los canales totalizadores pueden contener cualquier tipo de nodo
    // Se pueden agregar validaciones específicas aquí si el negocio lo requiere
};

/**
 * Obtener icono por defecto según tipo
 */
const getDefaultIcon = (nodeType) => {
    const icons = {
        folder: 'folder',
        site: 'building',
        channel: 'activity'
    };
    return icons[nodeType] || 'file';
};

/**
 * Mapear buildingType de site a icono
 */
const getIconFromBuildingType = (buildingType) => {
    const iconMap = {
        office: 'building',
        factory: 'factory',
        warehouse: 'warehouse'
    };
    return iconMap[buildingType] || 'building';
};

/**
 * Obtener icono para channel a partir de measurementTypeId
 */
const getIconFromMeasurementType = (measurementTypeId) => {
    return measurementTypeId ? 'sensor' : 'activity';
};

/**
 * Enriquecer datos de nodo tipo 'site' desde la entidad site referenciada
 * Valida que el site exista y pertenezca a la organización
 * 
 * @param {Object} nodeData - Datos del nodo a enriquecer
 * @param {string} organizationUuid - UUID de la organización
 * @returns {Promise<Object>} - Datos enriquecidos
 */
const enrichSiteNode = async (nodeData, organizationUuid) => {
    const site = await findSiteByPublicCodeInternal(nodeData.referenceId);
    
    if (!site || site.organizationId !== organizationUuid) {
        const error = new Error(`Site no encontrado o no pertenece a esta organización: ${nodeData.referenceId}`);
        error.status = 404;
        error.code = 'REFERENCE_NOT_FOUND';
        throw error;
    }
    
    return {
        ...nodeData,
        name: nodeData.name || site.name,
        icon: nodeData.icon || getIconFromBuildingType(site.buildingType)
    };
};

/**
 * Enriquecer datos de nodo tipo 'channel' desde la entidad channel referenciada
 * Valida que el channel exista y pertenezca a la organización
 * 
 * @param {Object} nodeData - Datos del nodo a enriquecer
 * @param {string} organizationUuid - UUID de la organización
 * @returns {Promise<Object>} - Datos enriquecidos
 */
const enrichChannelNode = async (nodeData, organizationUuid) => {
    const channel = await findChannelByPublicCodeInternal(nodeData.referenceId);
    
    if (!channel || channel.organizationId !== organizationUuid) {
        const error = new Error(`Canal no encontrado o no pertenece a esta organización: ${nodeData.referenceId}`);
        error.status = 404;
        error.code = 'REFERENCE_NOT_FOUND';
        throw error;
    }
    
    return {
        ...nodeData,
        name: nodeData.name || channel.name,
        icon: nodeData.icon || getIconFromMeasurementType(channel.measurementTypeId)
    };
};

/**
 * Sanitizar nodo para respuesta API (remover campos internos)
 */
const sanitizeNode = (node) => {
    if (!node) return null;
    
    const { _uuid, _parentId, _organizationId, ...publicData } = node;
    return publicData;
};

/**
 * Sanitizar árbol recursivamente
 */
const sanitizeTree = (tree) => {
    return tree.map(node => {
        const sanitized = sanitizeNode(node);
        if (node.children && node.children.length > 0) {
            sanitized.children = sanitizeTree(node.children);
        }
        return sanitized;
    });
};

/**
 * Obtener múltiples nodos por sus public_codes
 * Solo retorna nodos que pertenezcan a la organización activa (seguridad multi-tenant)
 * 
 * @param {Array<string>} publicCodes - Array de public codes
 * @param {Object} options - Opciones (includeCounts, organizationId)
 * @returns {Promise<Array>} - Lista de nodos encontrados (filtrados por organización)
 */
export const batchGetNodes = async (publicCodes, options = {}) => {
    if (!publicCodes || publicCodes.length === 0) {
        return [];
    }
    
    // Resolver organizationId para filtrado multi-tenant
    let organizationUuid = null;
    if (options.organizationId) {
        organizationUuid = await resolveOrganizationId(options.organizationId);
    }
    
    const nodes = await repository.batchFindByPublicCodes(publicCodes, {
        includeCounts: options.includeCounts,
        organizationId: organizationUuid
    });
    
    return nodes.map(sanitizeNode);
};

/**
 * Crear múltiples nodos con soporte para éxito parcial
 * Los nodos que no puedan crearse (duplicados, errores) no bloquean la operación
 * 
 * @param {Object} batchData - Datos del batch
 * @param {string|null} batchData.parent_id - ID del nodo padre (public_code, null para raíz)
 * @param {Array<Object>} batchData.nodes - Array de nodos a crear
 * @param {string} organizationId - ID de la organización (UUID)
 * @param {string} userId - UUID del usuario que crea
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent
 * @returns {Promise<Object>} - Resultado con nodos insertados y fallidos
 * 
 * Respuesta:
 * {
 *   inserted: [{ public_code, reference_id, node_type, name }],
 *   failed: [{ reference_id, name, reason_code, message }],
 *   meta: { requested, inserted, failed }
 * }
 */
export const batchCreateNodes = async (batchData, organizationId, userId, ipAddress, userAgent) => {
    const { parentId, nodes } = batchData;
    
    const organizationUuid = await resolveOrganizationId(organizationId);
    
    let parentUuid = null;
    let parentNode = null;
    
    if (parentId) {
        parentNode = await resolveNodeId(parentId);
        if (!parentNode) {
            const error = new Error('Nodo padre no encontrado');
            error.status = 404;
            error.code = 'PARENT_NODE_NOT_FOUND';
            throw error;
        }
        
        // Validar que el padre pertenece a la misma organización
        if (parentNode._organizationId !== organizationUuid) {
            const error = new Error('El nodo padre debe pertenecer a la misma organización');
            error.status = 400;
            error.code = 'PARENT_ORG_MISMATCH';
            throw error;
        }
        
        parentUuid = parentNode._uuid;
    }
    
    const inserted = [];
    const failed = [];
    
    // Set para detectar duplicados dentro del mismo batch
    const seenReferenceIds = new Set();
    
    // Procesar cada nodo individualmente
    for (const nodeData of nodes) {
        const nodeIdentifier = nodeData.referenceId || nodeData.name;
        
        try {
            validateNodeTypeRules(nodeData.nodeType, parentNode);
            
            let enrichedNodeData = { ...nodeData };
            
            if (nodeData.nodeType === 'site') {
                enrichedNodeData = await enrichSiteNode(nodeData, organizationUuid);
            } else if (nodeData.nodeType === 'channel') {
                enrichedNodeData = await enrichChannelNode(nodeData, organizationUuid);
            }
            
            if (enrichedNodeData.referenceId && (enrichedNodeData.nodeType === 'site' || enrichedNodeData.nodeType === 'channel')) {
                if (seenReferenceIds.has(enrichedNodeData.referenceId)) {
                    failed.push({
                        referenceId: enrichedNodeData.referenceId,
                        name: enrichedNodeData.name,
                        reasonCode: 'DUPLICATE_IN_BATCH',
                        message: 'Este recurso está duplicado dentro del mismo batch'
                    });
                    continue;
                }
                seenReferenceIds.add(enrichedNodeData.referenceId);
                
                const existingNode = await repository.findNodeByReferenceId(enrichedNodeData.referenceId, organizationUuid);
                if (existingNode) {
                    failed.push({
                        referenceId: enrichedNodeData.referenceId,
                        name: enrichedNodeData.name,
                        reasonCode: 'ALREADY_IN_HIERARCHY',
                        message: 'Este recurso ya existe en la jerarquía',
                        duplicateNodePublicCode: existingNode.public_code || existingNode.publicCode
                    });
                    continue;
                }
            }
            
            const node = await repository.createNode({
                organizationId: organizationUuid,
                parentId: parentUuid,
                nodeType: enrichedNodeData.nodeType,
                referenceId: enrichedNodeData.referenceId || null,
                name: enrichedNodeData.name,
                description: enrichedNodeData.description || null,
                icon: enrichedNodeData.icon || getDefaultIcon(enrichedNodeData.nodeType),
                displayOrder: enrichedNodeData.displayOrder || 0,
                metadata: enrichedNodeData.metadata || {},
                assetCategoryId: enrichedNodeData.assetCategoryId || null
            });
            
            await logAuditAction({
                entityType: 'resource_hierarchy',
                entityId: node.id,
                action: 'created',
                performedBy: userId,
                changes: { new: node },
                metadata: {
                    nodeType: nodeData.nodeType,
                    parentId: parentId,
                    organizationId: organizationId,
                    batchOperation: true,
                    batchSize: nodes.length
                },
                ipAddress,
                userAgent
            });
            
            inserted.push({
                publicCode: node.publicCode,
                referenceId: node.referenceId,
                nodeType: node.nodeType,
                name: node.name
            });
            
        } catch (error) {
            hierarchyLogger.warn({ 
                nodeIdentifier, 
                error: error.message, 
                code: error.code 
            }, 'Batch create: node failed');
            
            failed.push({
                referenceId: nodeData.referenceId || null,
                name: nodeData.name,
                reasonCode: error.code || 'UNKNOWN_ERROR',
                message: error.message
            });
        }
    }
    
    // Invalidar cache si hubo al menos un nodo insertado
    if (inserted.length > 0) {
        await cache.invalidateNodeAndRelated(null, organizationUuid, parentNode?.publicCode || null);
        
        const hasChannelNodes = nodes.some(n => n.nodeType === 'channel');
        if (hasChannelNodes) {
            await invalidateChannelCache();
        }
    }
    
    hierarchyLogger.info({ 
        requested: nodes.length,
        inserted: inserted.length, 
        failed: failed.length,
        parentId, 
        userId 
    }, 'Batch create nodes completed');
    
    // Si todos fallaron, devolver error 409
    if (inserted.length === 0 && failed.length > 0) {
        const error = new Error('Todos los nodos fallaron al insertarse');
        error.status = 409;
        error.code = 'ALL_NODES_FAILED';
        error.data = {
            inserted: [],
            failed,
            meta: {
                requested: nodes.length,
                inserted: 0,
                failed: failed.length
            }
        };
        throw error;
    }
    
    // Éxito (total o parcial)
    return {
        inserted,
        failed,
        meta: {
            requested: nodes.length,
            inserted: inserted.length,
            failed: failed.length
        }
    };
};

export default {
    createNode,
    getNodeByPublicCode,
    getNodeChildren,
    getNodeDescendants,
    getNodeAncestors,
    getTree,
    moveNode,
    updateNode,
    deleteNode,
    listNodes,
    batchGetNodes,
    batchCreateNodes,
    grantNodeAccess,
    revokeNodeAccess,
    checkNodeAccess,
    getAccessibleNodes
};
