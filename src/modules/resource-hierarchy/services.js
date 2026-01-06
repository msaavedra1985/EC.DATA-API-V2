// modules/resource-hierarchy/services.js
// Lógica de negocio para ResourceHierarchy (Jerarquía de Recursos)

import * as repository from './repository.js';
import { findOrganizationByPublicCodeInternal } from '../organizations/repository.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import logger from '../../utils/logger.js';
import * as cache from './cache.js';

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
    // Resolver organization_id
    const organizationUuid = await resolveOrganizationId(nodeData.organization_id);
    
    // Resolver parent_id si se proporciona
    let parentUuid = null;
    let parentNode = null;
    
    if (nodeData.parent_id) {
        parentNode = await resolveNodeId(nodeData.parent_id);
        if (!parentNode) {
            const error = new Error('Nodo padre no encontrado');
            error.status = 404;
            error.code = 'PARENT_NODE_NOT_FOUND';
            throw error;
        }
        
        // Validar que el padre pertenece a la misma organización
        if (parentNode._organization_id !== organizationUuid) {
            const error = new Error('El nodo padre debe pertenecer a la misma organización');
            error.status = 400;
            error.code = 'PARENT_ORG_MISMATCH';
            throw error;
        }
        
        parentUuid = parentNode._uuid;
    }
    
    // Validar reglas de tipo de nodo
    validateNodeTypeRules(nodeData.node_type, parentNode);
    
    // Validar que el reference_id no esté duplicado en la jerarquía de esta organización
    if (nodeData.reference_id && (nodeData.node_type === 'site' || nodeData.node_type === 'channel')) {
        const existingNode = await repository.findNodeByReferenceId(nodeData.reference_id, organizationUuid);
        if (existingNode) {
            const error = new Error(`Este recurso (${nodeData.reference_id}) ya existe en la jerarquía de la organización`);
            error.status = 409;
            error.code = 'REFERENCE_ALREADY_IN_HIERARCHY';
            throw error;
        }
    }
    
    // Crear nodo
    const node = await repository.createNode({
        organization_id: organizationUuid,
        parent_id: parentUuid,
        node_type: nodeData.node_type,
        reference_id: nodeData.reference_id || null,
        name: nodeData.name,
        description: nodeData.description || null,
        icon: nodeData.icon || getDefaultIcon(nodeData.node_type),
        display_order: nodeData.display_order || 0,
        metadata: nodeData.metadata || {}
    });
    
    // Audit log
    await logAuditAction({
        entityType: 'resource_hierarchy',
        entityId: node.id,
        action: 'created',
        performedBy: userId,
        changes: { new: node },
        metadata: {
            node_type: nodeData.node_type,
            parent_id: nodeData.parent_id,
            organization_id: nodeData.organization_id
        },
        ipAddress,
        userAgent
    });
    
    // Invalidar cache de la organización (listas, árboles, hijos del padre)
    await cache.invalidateNodeAndRelated(node.id, organizationUuid, parentNode?.public_code || null);
    
    hierarchyLogger.info({ nodeId: node.id, nodeType: nodeData.node_type, userId }, 'Node created successfully');
    
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
    const organizationUuid = await resolveOrganizationId(organizationId);
    
    // Intentar obtener de cache primero
    const cachedResult = await cache.getCachedChildren(nodePublicCode, organizationUuid, options);
    if (cachedResult) {
        return {
            data: cachedResult.data.map(sanitizeNode),
            meta: cachedResult.meta
        };
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
    
    const result = await repository.getChildren(parentUuid, organizationUuid, options);
    
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
    const organizationUuid = await resolveOrganizationId(organizationId);
    
    // Intentar obtener de cache primero
    const cacheOptions = { rootId: options.rootId, maxDepth: options.maxDepth };
    const cachedTree = await cache.getCachedTree(organizationUuid, cacheOptions);
    if (cachedTree) {
        return sanitizeTree(cachedTree);
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
        maxDepth: options.maxDepth
    });
    
    // Guardar en cache
    await cache.cacheTree(organizationUuid, cacheOptions, tree);
    
    return sanitizeTree(tree);
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
export const moveNode = async (nodePublicCode, newParentPublicCode, userId, ipAddress, userAgent, skipPermissionCheck = false, displayOrder = undefined) => {
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    const oldParentId = node.parent_id;
    const oldDisplayOrder = node.display_order;
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
        
        // Validar misma organización
        if (newParent.organization_id !== node.organization_id) {
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
        
        // Si se especificó display_order, actualizarlo también
        if (displayOrder !== undefined) {
            updatedNode = await repository.updateNode(node.id, { display_order: displayOrder });
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
    
    // Construir objeto de cambios para auditoría
    const changes = {
        parent_id: { 
            old: oldParentId, 
            new: newParentUuid 
        }
    };
    
    // Si cambió display_order, incluirlo en el audit
    if (displayOrder !== undefined && displayOrder !== oldDisplayOrder) {
        changes.display_order = {
            old: oldDisplayOrder,
            new: displayOrder
        };
    }
    
    // Audit log
    await logAuditAction({
        entityType: 'resource_hierarchy',
        entityId: nodePublicCode,
        action: 'moved',
        performedBy: userId,
        changes,
        metadata: {
            node_type: node.node_type,
            old_parent_public_code: oldParentId ? (await repository.findNodeById(oldParentId))?.public_code : null,
            new_parent_public_code: newParentPublicCode
        },
        ipAddress,
        userAgent
    });
    
    // Invalidar cache del nodo y ambos padres (antiguo y nuevo)
    const oldParentPublicCode = oldParentId ? (await repository.findNodeById(oldParentId))?.public_code : null;
    await cache.invalidateAfterMove(nodePublicCode, node.organization_id, oldParentPublicCode, newParentPublicCode);
    
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
export const updateNode = async (nodePublicCode, updates, userId, ipAddress, userAgent) => {
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    // Guardar valores anteriores para auditoría
    const oldValues = {
        name: node.name,
        description: node.description,
        icon: node.icon,
        display_order: node.display_order,
        is_active: node.is_active
    };
    
    const updatedNode = await repository.updateNode(node.id, updates);
    
    // Calcular cambios
    const changes = {};
    for (const [key, oldValue] of Object.entries(oldValues)) {
        if (updates[key] !== undefined && updates[key] !== oldValue) {
            changes[key] = { old: oldValue, new: updates[key] };
        }
    }
    
    // Audit log
    await logAuditAction({
        entityType: 'resource_hierarchy',
        entityId: nodePublicCode,
        action: 'updated',
        performedBy: userId,
        changes,
        metadata: { node_type: node.node_type },
        ipAddress,
        userAgent
    });
    
    // Invalidar cache del nodo y estructura relacionada
    const parentPublicCode = node.parent_id ? (await repository.findNodeById(node.parent_id))?.public_code : null;
    await cache.invalidateNodeAndRelated(nodePublicCode, node.organization_id, parentPublicCode);
    
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
export const deleteNode = async (nodePublicCode, cascade = false, userId, ipAddress, userAgent) => {
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
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
    
    // Audit log con detalle de todos los nodos eliminados
    await logAuditAction({
        entityType: 'resource_hierarchy',
        entityId: nodePublicCode,
        action: 'deleted',
        performedBy: userId,
        changes: { 
            old: { name: node.name, node_type: node.node_type }
        },
        metadata: {
            cascade,
            user_confirmed_cascade: cascade,
            deleted_count: result.deleted_count,
            deleted_nodes: result.deleted_nodes
        },
        ipAddress,
        userAgent
    });
    
    // Invalidar cache de toda la organización (puede afectar múltiples nodos en cascade)
    const parentPublicCode = node.parent_id ? (await repository.findNodeById(node.parent_id))?.public_code : null;
    await cache.invalidateNodeAndRelated(nodePublicCode, node.organization_id, parentPublicCode);
    
    hierarchyLogger.info({ 
        nodeId: nodePublicCode, 
        deletedCount: result.deleted_count, 
        cascade, 
        userId 
    }, 'Node deleted successfully');
    
    return {
        deleted_count: result.deleted_count,
        deleted_nodes: result.deleted_nodes,
        cascade
    };
};

/**
 * Listar nodos de una organización con filtros
 * 
 * @param {string} organizationId - ID de la organización
 * @param {Object} options - Opciones de filtro y paginación
 * @returns {Promise<Object>} - Lista de nodos
 */
export const listNodes = async (organizationId, options = {}) => {
    const organizationUuid = await resolveOrganizationId(organizationId);
    
    // Intentar obtener de cache primero
    const cachedResult = await cache.getCachedList(organizationUuid, options);
    if (cachedResult) {
        return {
            data: cachedResult.data.map(sanitizeNode),
            meta: cachedResult.meta
        };
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
        parentId: parentUuid
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
    const node = await repository.findNodeByPublicCodeInternal(accessData.node_id);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    const access = await repository.grantAccess({
        user_id: accessData.user_id,
        resource_node_id: node.id,
        organization_id: node.organization_id,
        access_type: accessData.access_type || 'view',
        include_descendants: accessData.include_descendants !== false,
        granted_by: grantedBy,
        expires_at: accessData.expires_at || null,
        notes: accessData.notes || null
    });
    
    // Audit log
    await logAuditAction({
        entityType: 'user_resource_access',
        entityId: `${accessData.user_id}:${accessData.node_id}`,
        action: 'granted',
        performedBy: grantedBy,
        changes: { new: access },
        metadata: {
            node_id: accessData.node_id,
            access_type: accessData.access_type,
            include_descendants: accessData.include_descendants
        },
        ipAddress,
        userAgent
    });
    
    hierarchyLogger.info({ userId: accessData.user_id, nodeId: accessData.node_id, grantedBy }, 'Access granted successfully');
    
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
            metadata: { node_id: nodePublicCode },
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
            nodes.push(sanitizeNode(repository.toNodeDto ? repository.toNodeDto(node) : node));
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
                _organization_id: node.organization_id
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
 * Sanitizar nodo para respuesta API (remover campos internos)
 */
const sanitizeNode = (node) => {
    if (!node) return null;
    
    const { _uuid, _organization_id, ...publicData } = node;
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
    const { parent_id, nodes } = batchData;
    
    // Resolver organization_id
    const organizationUuid = await resolveOrganizationId(organizationId);
    
    // Resolver parent_id si se proporciona
    let parentUuid = null;
    let parentNode = null;
    
    if (parent_id) {
        parentNode = await resolveNodeId(parent_id);
        if (!parentNode) {
            const error = new Error('Nodo padre no encontrado');
            error.status = 404;
            error.code = 'PARENT_NODE_NOT_FOUND';
            throw error;
        }
        
        // Validar que el padre pertenece a la misma organización
        if (parentNode._organization_id !== organizationUuid) {
            const error = new Error('El nodo padre debe pertenecer a la misma organización');
            error.status = 400;
            error.code = 'PARENT_ORG_MISMATCH';
            throw error;
        }
        
        parentUuid = parentNode._uuid;
    }
    
    // Arrays para resultados
    const inserted = [];
    const failed = [];
    
    // Set para detectar duplicados dentro del mismo batch
    const seenReferenceIds = new Set();
    
    // Procesar cada nodo individualmente
    for (const nodeData of nodes) {
        const nodeIdentifier = nodeData.reference_id || nodeData.name;
        
        try {
            // Validar reglas de tipo de nodo
            validateNodeTypeRules(nodeData.node_type, parentNode);
            
            // Validar duplicados dentro del batch (para sites y channels con reference_id)
            if (nodeData.reference_id && (nodeData.node_type === 'site' || nodeData.node_type === 'channel')) {
                if (seenReferenceIds.has(nodeData.reference_id)) {
                    failed.push({
                        reference_id: nodeData.reference_id,
                        name: nodeData.name,
                        reason_code: 'DUPLICATE_IN_BATCH',
                        message: 'Este recurso está duplicado dentro del mismo batch'
                    });
                    continue;
                }
                seenReferenceIds.add(nodeData.reference_id);
                
                // Verificar que no exista ya en la jerarquía de esta organización
                const existingNode = await repository.findNodeByReferenceId(nodeData.reference_id, organizationUuid);
                if (existingNode) {
                    failed.push({
                        reference_id: nodeData.reference_id,
                        name: nodeData.name,
                        reason_code: 'ALREADY_IN_HIERARCHY',
                        message: 'Este recurso ya existe en la jerarquía'
                    });
                    continue;
                }
            }
            
            // Crear nodo (transacción individual implícita via repository)
            const node = await repository.createNode({
                organization_id: organizationUuid,
                parent_id: parentUuid,
                node_type: nodeData.node_type,
                reference_id: nodeData.reference_id || null,
                name: nodeData.name,
                description: nodeData.description || null,
                icon: nodeData.icon || getDefaultIcon(nodeData.node_type),
                display_order: nodeData.display_order || 0,
                metadata: nodeData.metadata || {}
            });
            
            // Audit log para el nodo creado
            await logAuditAction({
                entityType: 'resource_hierarchy',
                entityId: node.id,
                action: 'created',
                performedBy: userId,
                changes: { new: node },
                metadata: {
                    node_type: nodeData.node_type,
                    parent_id: parent_id,
                    organization_id: organizationId,
                    batch_operation: true,
                    batch_size: nodes.length
                },
                ipAddress,
                userAgent
            });
            
            // Agregar a insertados con datos mínimos para el frontend
            inserted.push({
                public_code: node.public_code,
                reference_id: node.reference_id,
                node_type: node.node_type,
                name: node.name
            });
            
        } catch (error) {
            // Capturar error y agregarlo a fallidos
            hierarchyLogger.warn({ 
                nodeIdentifier, 
                error: error.message, 
                code: error.code 
            }, 'Batch create: node failed');
            
            failed.push({
                reference_id: nodeData.reference_id || null,
                name: nodeData.name,
                reason_code: error.code || 'UNKNOWN_ERROR',
                message: error.message
            });
        }
    }
    
    // Invalidar cache si hubo al menos un nodo insertado
    if (inserted.length > 0) {
        await cache.invalidateNodeAndRelated(null, organizationUuid, parentNode?.public_code || null);
    }
    
    // Log de resultado
    hierarchyLogger.info({ 
        requested: nodes.length,
        inserted: inserted.length, 
        failed: failed.length,
        parentId: parent_id, 
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
