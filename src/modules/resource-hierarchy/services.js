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
 * @param {string|null} nodeData.reference_id - UUID del recurso referenciado (opcional)
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
 * Mover un nodo a un nuevo padre
 * 
 * @param {string} nodePublicCode - Código público del nodo a mover
 * @param {string|null} newParentPublicCode - Código público del nuevo padre (null para raíz)
 * @param {string} userId - UUID del usuario
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent
 * @returns {Promise<Object>} - Nodo actualizado
 */
export const moveNode = async (nodePublicCode, newParentPublicCode, userId, ipAddress, userAgent) => {
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    const oldParentId = node.parent_id;
    let newParentUuid = null;
    
    if (newParentPublicCode) {
        const newParent = await repository.findNodeByPublicCodeInternal(newParentPublicCode);
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
    
    const updatedNode = await repository.moveNode(node.id, newParentUuid);
    
    // Audit log
    await logAuditAction({
        entityType: 'resource_hierarchy',
        entityId: nodePublicCode,
        action: 'moved',
        performedBy: userId,
        changes: {
            parent_id: { old: oldParentId, new: newParentUuid }
        },
        metadata: {
            node_type: node.node_type,
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
 * 
 * @param {string} nodePublicCode - Código público del nodo
 * @param {boolean} cascade - Si eliminar también los descendientes
 * @param {string} userId - UUID del usuario
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent
 * @returns {Promise<Object>} - Resultado de la eliminación
 */
export const deleteNode = async (nodePublicCode, cascade, userId, ipAddress, userAgent) => {
    const node = await repository.findNodeByPublicCodeInternal(nodePublicCode);
    
    if (!node) {
        const error = new Error('Nodo no encontrado');
        error.status = 404;
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    
    const deletedCount = await repository.deleteNode(node.id, cascade);
    
    // Audit log
    await logAuditAction({
        entityType: 'resource_hierarchy',
        entityId: nodePublicCode,
        action: 'deleted',
        performedBy: userId,
        changes: { old: { name: node.name, node_type: node.node_type } },
        metadata: {
            cascade,
            deleted_count: deletedCount
        },
        ipAddress,
        userAgent
    });
    
    // Invalidar cache de toda la organización (puede afectar múltiples nodos en cascade)
    const parentPublicCode = node.parent_id ? (await repository.findNodeById(node.parent_id))?.public_code : null;
    await cache.invalidateNodeAndRelated(nodePublicCode, node.organization_id, parentPublicCode);
    
    hierarchyLogger.info({ nodeId: nodePublicCode, deletedCount, cascade, userId }, 'Node deleted successfully');
    
    return {
        deleted_count: deletedCount,
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
    grantNodeAccess,
    revokeNodeAccess,
    checkNodeAccess,
    getAccessibleNodes
};
