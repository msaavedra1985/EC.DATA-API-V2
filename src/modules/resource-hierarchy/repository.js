// modules/resource-hierarchy/repository.js
// Capa de acceso a datos para ResourceHierarchy
// Implementa operaciones de árbol usando ltree de PostgreSQL

import { Op, QueryTypes } from 'sequelize';
import ResourceHierarchy from './models/ResourceHierarchy.js';
import UserResourceAccess from './models/UserResourceAccess.js';
import sequelize from '../../db/sql/sequelize.js';
import { generateUuidV7, generateHumanId, generatePublicCode } from '../../utils/identifiers.js';

/**
 * Obtener un nodo por ID con conteo de hijos (uso interno)
 * Retorna el DTO listo para usar
 * 
 * @param {string} nodeId - UUID del nodo
 * @returns {Promise<Object|null>} - DTO del nodo o null
 */
const getNodeByIdWithChildrenCount = async (nodeId) => {
    const query = `
        SELECT rh.*,
               (SELECT COUNT(*) FROM resource_hierarchy c 
                WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count
        FROM resource_hierarchy rh
        WHERE rh.id = $1
          AND rh.deleted_at IS NULL
    `;
    
    const rows = await sequelize.query(query, {
        bind: [nodeId],
        type: QueryTypes.SELECT
    });
    
    return rows.length > 0 ? toNodeDto(rows[0]) : null;
};

/**
 * Crear un nuevo nodo en la jerarquía
 * El path ltree se calcula automáticamente por el trigger de BD
 * 
 * @param {Object} data - Datos del nodo
 * @returns {Promise<Object>} - Nodo creado con conteo de hijos
 */
export const createNode = async (data) => {
    const id = generateUuidV7();
    const humanId = await generateHumanId(ResourceHierarchy, null, null);
    const publicCode = generatePublicCode('RES', id);
    
    const node = await ResourceHierarchy.create({
        id,
        human_id: humanId,
        public_code: publicCode,
        ...data
    });
    
    // Recargar para obtener el path calculado por el trigger
    await node.reload();
    
    // Para nodos nuevos, children_count siempre es 0
    // Usamos el modelo Sequelize y agregamos children_count manualmente
    const nodeData = node.toJSON();
    nodeData.children_count = 0;
    
    return toNodeDto(nodeData);
};

/**
 * Buscar nodo por public_code
 * Incluye conteo de hijos
 * 
 * @param {string} publicCode - Código público del nodo
 * @returns {Promise<Object|null>} - Nodo o null
 */
export const findNodeByPublicCode = async (publicCode) => {
    const query = `
        SELECT rh.*,
               (SELECT COUNT(*) FROM resource_hierarchy c 
                WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count
        FROM resource_hierarchy rh
        WHERE rh.public_code = $1
          AND rh.deleted_at IS NULL
    `;
    
    const rows = await sequelize.query(query, {
        bind: [publicCode],
        type: QueryTypes.SELECT
    });
    
    return rows.length > 0 ? toNodeDto(rows[0]) : null;
};

/**
 * Buscar nodo por public_code (USO INTERNO - retorna modelo completo)
 * 
 * @param {string} publicCode - Código público del nodo
 * @returns {Promise<Object|null>} - Modelo Sequelize o null
 */
export const findNodeByPublicCodeInternal = async (publicCode) => {
    return await ResourceHierarchy.findOne({
        where: { public_code: publicCode, deleted_at: null }
    });
};

/**
 * Buscar nodo por UUID (USO INTERNO)
 * 
 * @param {string} id - UUID del nodo
 * @returns {Promise<Object|null>} - Modelo Sequelize o null
 */
export const findNodeById = async (id) => {
    return await ResourceHierarchy.findOne({
        where: { id, deleted_at: null }
    });
};

/**
 * Obtener hijos directos de un nodo
 * Incluye conteo de hijos para cada nodo usando subconsulta SQL
 * 
 * @param {string} parentId - UUID del nodo padre (null para raíces)
 * @param {string} organizationId - UUID de la organización
 * @param {Object} options - Opciones (limit, offset, nodeType)
 * @returns {Promise<Object>} - Lista de hijos y total
 */
export const getChildren = async (parentId, organizationId, options = {}) => {
    const { limit = 100, offset = 0, nodeType = null } = options;
    
    // Usar raw query para incluir conteo de hijos
    let query = `
        SELECT rh.*,
               (SELECT COUNT(*) FROM resource_hierarchy c 
                WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count
        FROM resource_hierarchy rh
        WHERE rh.organization_id = $1
          AND rh.deleted_at IS NULL
          AND rh.is_active = true
    `;
    
    const replacements = [organizationId];
    let paramIndex = 2;
    
    // Filtro por parent_id (null para raíces)
    if (parentId === null) {
        query += ` AND rh.parent_id IS NULL`;
    } else {
        query += ` AND rh.parent_id = $${paramIndex}`;
        replacements.push(parentId);
        paramIndex++;
    }
    
    if (nodeType) {
        query += ` AND rh.node_type = $${paramIndex}`;
        replacements.push(nodeType);
        paramIndex++;
    }
    
    // Contar total
    const countQuery = `SELECT COUNT(*) as count FROM (${query}) as subquery`;
    const countResult = await sequelize.query(countQuery, {
        bind: replacements,
        type: QueryTypes.SELECT
    });
    const total = parseInt(countResult[0].count, 10);
    
    // Agregar orden y paginación
    query += ` ORDER BY rh.display_order ASC, rh.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    replacements.push(limit, offset);
    
    const rows = await sequelize.query(query, {
        bind: replacements,
        type: QueryTypes.SELECT
    });
    
    return {
        data: rows.map(toNodeDto),
        total
    };
};

/**
 * Obtener todos los descendientes de un nodo usando ltree
 * Incluye conteo de hijos para cada nodo
 * 
 * @param {string} nodeId - UUID del nodo ancestro
 * @param {Object} options - Opciones (limit, offset, nodeType, maxDepth)
 * @returns {Promise<Object>} - Lista de descendientes y total
 */
export const getDescendants = async (nodeId, options = {}) => {
    const { limit = 500, offset = 0, nodeType = null, maxDepth = null } = options;
    
    // Obtener el path del nodo ancestro
    const ancestor = await ResourceHierarchy.findByPk(nodeId, {
        attributes: ['id', 'path', 'organization_id', 'depth']
    });
    
    if (!ancestor) {
        return { data: [], total: 0 };
    }
    
    // Usar raw query con operador ltree <@ para obtener descendientes con conteo de hijos
    let query = `
        SELECT rh.*, 
               (SELECT COUNT(*) FROM resource_hierarchy c 
                WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count,
               nlevel(rh.path) - nlevel($1::ltree) as relative_depth
        FROM resource_hierarchy rh
        WHERE rh.path <@ $1::ltree
          AND rh.id != $2
          AND rh.deleted_at IS NULL
          AND rh.is_active = true
    `;
    
    const replacements = [ancestor.dataValues.path, nodeId];
    let paramIndex = 3;
    
    if (nodeType) {
        query += ` AND rh.node_type = $${paramIndex}`;
        replacements.push(nodeType);
        paramIndex++;
    }
    
    if (maxDepth !== null) {
        query += ` AND (nlevel(rh.path) - nlevel($1::ltree)) <= $${paramIndex}`;
        replacements.push(maxDepth);
        paramIndex++;
    }
    
    // Contar total
    const countQuery = `SELECT COUNT(*) as count FROM (${query}) as subquery`;
    const countResult = await sequelize.query(countQuery, {
        bind: replacements,
        type: QueryTypes.SELECT
    });
    const total = parseInt(countResult[0].count, 10);
    
    // Agregar orden y paginación
    query += ` ORDER BY rh.path, rh.display_order, rh.name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    replacements.push(limit, offset);
    
    const descendants = await sequelize.query(query, {
        bind: replacements,
        type: QueryTypes.SELECT
    });
    
    return {
        data: descendants.map(toNodeDto),
        total
    };
};

/**
 * Obtener todos los ancestros de un nodo hasta la raíz
 * Incluye conteo de hijos para cada nodo
 * 
 * @param {string} nodeId - UUID del nodo
 * @returns {Promise<Array>} - Lista de ancestros (desde raíz hasta padre directo)
 */
export const getAncestors = async (nodeId) => {
    const node = await ResourceHierarchy.findByPk(nodeId, {
        attributes: ['id', 'path']
    });
    
    if (!node) {
        return [];
    }
    
    // Usar operador @> para obtener ancestros con conteo de hijos
    const query = `
        SELECT rh.*,
               (SELECT COUNT(*) FROM resource_hierarchy c 
                WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count
        FROM resource_hierarchy rh
        WHERE rh.path @> $1::ltree
          AND rh.id != $2
          AND rh.deleted_at IS NULL
        ORDER BY nlevel(rh.path) ASC
    `;
    
    const ancestors = await sequelize.query(query, {
        bind: [node.dataValues.path, nodeId],
        type: QueryTypes.SELECT
    });
    
    return ancestors.map(toNodeDto);
};

/**
 * Obtener árbol completo de una organización
 * Incluye conteo de hijos para cada nodo
 * 
 * @param {string} organizationId - UUID de la organización
 * @param {Object} options - Opciones (rootId para subárbol, maxDepth)
 * @returns {Promise<Array>} - Árbol estructurado
 */
export const getTree = async (organizationId, options = {}) => {
    const { rootId = null, maxDepth = null } = options;
    
    let nodes;
    
    if (rootId) {
        // Obtener subárbol desde un nodo específico
        const result = await getDescendantsWithChildCount(rootId, { limit: 1000, maxDepth });
        const rootNode = await getNodeByIdWithChildrenCount(rootId);
        nodes = rootNode ? [rootNode, ...result.data] : result.data;
    } else {
        // Obtener árbol completo con conteo de hijos
        const query = `
            SELECT rh.*,
                   (SELECT COUNT(*) FROM resource_hierarchy c 
                    WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count
            FROM resource_hierarchy rh
            WHERE rh.organization_id = $1
              AND rh.deleted_at IS NULL
              AND rh.is_active = true
            ORDER BY rh.depth ASC, rh.display_order ASC, rh.name ASC
            LIMIT 1000
        `;
        
        const rows = await sequelize.query(query, {
            bind: [organizationId],
            type: QueryTypes.SELECT
        });
        
        nodes = rows.map(toNodeDto);
    }
    
    // Construir estructura de árbol
    return buildTree(nodes, rootId);
};

/**
 * Obtener descendientes con conteo de hijos (helper interno)
 */
const getDescendantsWithChildCount = async (nodeId, options = {}) => {
    const { limit = 500, maxDepth = null } = options;
    
    // Obtener el path del nodo ancestro
    const ancestor = await ResourceHierarchy.findByPk(nodeId, {
        attributes: ['id', 'path', 'depth']
    });
    
    if (!ancestor) {
        return { data: [], total: 0 };
    }
    
    let query = `
        SELECT rh.*,
               (SELECT COUNT(*) FROM resource_hierarchy c 
                WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count,
               nlevel(rh.path) - nlevel($1::ltree) as relative_depth
        FROM resource_hierarchy rh
        WHERE rh.path <@ $1::ltree
          AND rh.id != $2
          AND rh.deleted_at IS NULL
          AND rh.is_active = true
    `;
    
    const replacements = [ancestor.dataValues.path, nodeId];
    let paramIndex = 3;
    
    if (maxDepth !== null) {
        query += ` AND (nlevel(rh.path) - nlevel($1::ltree)) <= $${paramIndex}`;
        replacements.push(maxDepth);
        paramIndex++;
    }
    
    query += ` ORDER BY rh.path, rh.display_order, rh.name LIMIT $${paramIndex}`;
    replacements.push(limit);
    
    const descendants = await sequelize.query(query, {
        bind: replacements,
        type: QueryTypes.SELECT
    });
    
    return {
        data: descendants.map(toNodeDto),
        total: descendants.length
    };
};

/**
 * Mover un nodo a un nuevo padre
 * El trigger de BD actualiza automáticamente los paths de todos los descendientes
 * 
 * @param {string} nodeId - UUID del nodo a mover
 * @param {string} newParentId - UUID del nuevo padre (null para raíz)
 * @returns {Promise<Object>} - Nodo actualizado
 */
export const moveNode = async (nodeId, newParentId) => {
    const node = await ResourceHierarchy.findByPk(nodeId);
    
    if (!node) {
        throw new Error('Nodo no encontrado');
    }
    
    // Verificar que el nuevo padre existe y está en la misma organización
    if (newParentId) {
        const newParent = await ResourceHierarchy.findByPk(newParentId);
        if (!newParent) {
            throw new Error('Nodo padre no encontrado');
        }
        if (newParent.organization_id !== node.organization_id) {
            throw new Error('No se puede mover a una organización diferente');
        }
        // Verificar que no estamos moviendo a un descendiente (causaría ciclo)
        const descendants = await getDescendants(nodeId, { limit: 1 });
        const descendantIds = descendants.data.map(d => d.id);
        if (descendantIds.includes(newParentId)) {
            throw new Error('No se puede mover un nodo a uno de sus descendientes');
        }
    }
    
    // Actualizar parent_id (el trigger actualiza path y depth)
    node.parent_id = newParentId;
    await node.save();
    
    // Re-obtener nodo con conteo de hijos actualizado (retorna DTO directamente)
    return await getNodeByIdWithChildrenCount(nodeId);
};

/**
 * Actualizar un nodo
 * 
 * @param {string} nodeId - UUID del nodo
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} - Nodo actualizado con conteo de hijos
 */
export const updateNode = async (nodeId, updates) => {
    const node = await ResourceHierarchy.findByPk(nodeId);
    
    if (!node) {
        throw new Error('Nodo no encontrado');
    }
    
    // Campos permitidos para actualizar
    const allowedFields = ['name', 'description', 'icon', 'display_order', 'metadata', 'is_active'];
    const sanitizedUpdates = {};
    
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            sanitizedUpdates[field] = updates[field];
        }
    }
    
    await node.update(sanitizedUpdates);
    
    // Re-obtener nodo con conteo de hijos actualizado (retorna DTO directamente)
    return await getNodeByIdWithChildrenCount(nodeId);
};

/**
 * Eliminar un nodo (soft delete)
 * También elimina todos los descendientes
 * 
 * @param {string} nodeId - UUID del nodo
 * @param {boolean} cascade - Si true, elimina descendientes (default true)
 * @returns {Promise<number>} - Cantidad de nodos eliminados
 */
export const deleteNode = async (nodeId, cascade = true) => {
    const node = await ResourceHierarchy.findByPk(nodeId);
    
    if (!node) {
        throw new Error('Nodo no encontrado');
    }
    
    let deletedCount = 0;
    
    if (cascade) {
        // Soft delete de todos los descendientes
        const query = `
            UPDATE resource_hierarchy
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE path <@ $1::ltree
              AND deleted_at IS NULL
        `;
        
        const [, result] = await sequelize.query(query, {
            bind: [node.dataValues.path]
        });
        
        deletedCount = result?.rowCount || 1;
    } else {
        // Verificar que no tiene hijos activos
        const children = await getChildren(nodeId, node.organization_id, { limit: 1 });
        if (children.total > 0) {
            throw new Error('No se puede eliminar un nodo con hijos. Use cascade=true o elimine los hijos primero.');
        }
        
        await node.destroy(); // Soft delete (paranoid: true)
        deletedCount = 1;
    }
    
    return deletedCount;
};

/**
 * Listar nodos de una organización con filtros
 * Incluye conteo de hijos para cada nodo
 * 
 * @param {string} organizationId - UUID de la organización
 * @param {Object} options - Opciones de filtro y paginación
 * @returns {Promise<Object>} - Lista de nodos y total
 */
export const listNodes = async (organizationId, options = {}) => {
    const {
        limit = 50,
        offset = 0,
        nodeType = null,
        parentId = undefined,
        search = null,
        isActive = true
    } = options;
    
    // Usar raw query para incluir conteo de hijos
    let query = `
        SELECT rh.*,
               (SELECT COUNT(*) FROM resource_hierarchy c 
                WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count
        FROM resource_hierarchy rh
        WHERE rh.organization_id = $1
          AND rh.deleted_at IS NULL
    `;
    
    const replacements = [organizationId];
    let paramIndex = 2;
    
    if (isActive !== null) {
        query += ` AND rh.is_active = $${paramIndex}`;
        replacements.push(isActive);
        paramIndex++;
    }
    
    if (nodeType) {
        query += ` AND rh.node_type = $${paramIndex}`;
        replacements.push(nodeType);
        paramIndex++;
    }
    
    if (parentId !== undefined) {
        if (parentId === null) {
            query += ` AND rh.parent_id IS NULL`;
        } else {
            query += ` AND rh.parent_id = $${paramIndex}`;
            replacements.push(parentId);
            paramIndex++;
        }
    }
    
    if (search) {
        query += ` AND (rh.name ILIKE $${paramIndex} OR rh.description ILIKE $${paramIndex})`;
        replacements.push(`%${search}%`);
        paramIndex++;
    }
    
    // Contar total
    const countQuery = `SELECT COUNT(*) as count FROM (${query}) as subquery`;
    const countResult = await sequelize.query(countQuery, {
        bind: replacements,
        type: QueryTypes.SELECT
    });
    const total = parseInt(countResult[0].count, 10);
    
    // Agregar orden y paginación
    query += ` ORDER BY rh.depth ASC, rh.display_order ASC, rh.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    replacements.push(limit, offset);
    
    const rows = await sequelize.query(query, {
        bind: replacements,
        type: QueryTypes.SELECT
    });
    
    return {
        data: rows.map(toNodeDto),
        total
    };
};

/**
 * Buscar nodos por reference_id
 * Incluye conteo de hijos para cada nodo
 * 
 * @param {string} referenceId - UUID del recurso referenciado
 * @param {string} organizationId - UUID de la organización (opcional)
 * @returns {Promise<Array>} - Lista de nodos que referencian el recurso
 */
export const findNodesByReferenceId = async (referenceId, organizationId = null) => {
    let query = `
        SELECT rh.*,
               (SELECT COUNT(*) FROM resource_hierarchy c 
                WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count
        FROM resource_hierarchy rh
        WHERE rh.reference_id = $1
          AND rh.deleted_at IS NULL
    `;
    
    const replacements = [referenceId];
    
    if (organizationId) {
        query += ` AND rh.organization_id = $2`;
        replacements.push(organizationId);
    }
    
    const nodes = await sequelize.query(query, {
        bind: replacements,
        type: QueryTypes.SELECT
    });
    
    return nodes.map(toNodeDto);
};

// ============ USER RESOURCE ACCESS ============

/**
 * Otorgar acceso a un usuario sobre un nodo
 * 
 * @param {Object} data - Datos del acceso
 * @returns {Promise<Object>} - Acceso creado
 */
export const grantAccess = async (data) => {
    const id = generateUuidV7();
    
    // Verificar si ya existe
    const existing = await UserResourceAccess.findOne({
        where: {
            user_id: data.user_id,
            resource_node_id: data.resource_node_id
        }
    });
    
    if (existing) {
        // Actualizar existente
        await existing.update({
            access_type: data.access_type || existing.access_type,
            include_descendants: data.include_descendants !== undefined ? data.include_descendants : existing.include_descendants,
            granted_by: data.granted_by || existing.granted_by,
            granted_at: new Date(),
            expires_at: data.expires_at || existing.expires_at,
            notes: data.notes || existing.notes,
            is_active: true
        });
        return existing.toJSON();
    }
    
    const access = await UserResourceAccess.create({
        id,
        ...data
    });
    
    return access.toJSON();
};

/**
 * Revocar acceso de un usuario sobre un nodo
 * 
 * @param {string} userId - UUID del usuario
 * @param {string} resourceNodeId - UUID del nodo
 * @returns {Promise<boolean>} - true si se revocó
 */
export const revokeAccess = async (userId, resourceNodeId) => {
    const result = await UserResourceAccess.update(
        { is_active: false },
        {
            where: {
                user_id: userId,
                resource_node_id: resourceNodeId
            }
        }
    );
    
    return result[0] > 0;
};

/**
 * Verificar si un usuario tiene acceso a un nodo usando función de BD
 * 
 * @param {string} userId - UUID del usuario
 * @param {string} nodeId - UUID del nodo
 * @param {string} requiredAccess - Nivel requerido (view, edit, admin)
 * @returns {Promise<boolean>} - true si tiene acceso
 */
export const checkAccess = async (userId, nodeId, requiredAccess = 'view') => {
    const query = `SELECT check_resource_access($1, $2, $3::resource_access_type) as has_access`;
    
    const result = await sequelize.query(query, {
        bind: [userId, nodeId, requiredAccess],
        type: QueryTypes.SELECT
    });
    
    return result[0]?.has_access === true;
};

/**
 * Obtener todos los nodos accesibles por un usuario
 * 
 * @param {string} userId - UUID del usuario
 * @param {string} organizationId - UUID de la organización
 * @param {string} accessType - Nivel de acceso requerido
 * @returns {Promise<Array>} - Lista de IDs de nodos accesibles
 */
export const getAccessibleNodeIds = async (userId, organizationId, accessType = 'view') => {
    const query = `SELECT node_id FROM get_accessible_resource_ids($1, $2, $3::resource_access_type)`;
    
    const result = await sequelize.query(query, {
        bind: [userId, organizationId, accessType],
        type: QueryTypes.SELECT
    });
    
    return result.map(r => r.node_id);
};

/**
 * Listar accesos de un usuario
 * 
 * @param {string} userId - UUID del usuario
 * @param {string} organizationId - UUID de la organización (opcional)
 * @returns {Promise<Array>} - Lista de accesos
 */
export const listUserAccess = async (userId, organizationId = null) => {
    const where = { user_id: userId, is_active: true };
    
    if (organizationId) {
        where.organization_id = organizationId;
    }
    
    const accesses = await UserResourceAccess.findAll({
        where,
        include: [{
            model: ResourceHierarchy,
            as: 'resourceNode',
            attributes: ['id', 'public_code', 'name', 'node_type']
        }]
    });
    
    return accesses.map(a => a.toJSON());
};

// ============ HELPERS ============

/**
 * Convertir modelo a DTO público
 * Oculta UUID interno y muestra public_code como id
 * Usa children_count de la consulta SQL para determinar has_children
 * 
 * Nota: Usamos function declaration (no arrow function) para permitir hoisting
 * ya que esta función es usada por helpers al inicio del archivo
 */
function toNodeDto(node) {
    if (!node) return null;
    
    const data = node.toJSON ? node.toJSON() : node;
    
    // Determinar has_children: priorizar children_count de la consulta SQL,
    // luego verificar array children si existe (para árbol construido)
    const childrenCount = parseInt(data.children_count, 10) || 0;
    const hasChildren = childrenCount > 0 || (data.children?.length > 0);
    
    return {
        id: data.public_code,
        name: data.name,
        description: data.description,
        node_type: data.node_type,
        icon: data.icon,
        display_order: data.display_order,
        depth: data.depth,
        parent_id: data.parent_id ? data.parent?.public_code || data.parent_id : null,
        has_children: hasChildren,
        children_count: childrenCount,
        metadata: data.metadata,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // Campos internos para operaciones (no exponer en API)
        _uuid: data.id,
        _organization_id: data.organization_id
    };
}

/**
 * Construir estructura de árbol desde lista plana
 */
const buildTree = (nodes, rootId = null) => {
    const nodeMap = new Map();
    const tree = [];
    
    // Crear mapa de nodos
    for (const node of nodes) {
        nodeMap.set(node._uuid, { ...node, children: [] });
    }
    
    // Construir árbol
    for (const node of nodes) {
        const currentNode = nodeMap.get(node._uuid);
        
        if (node.parent_id && node.parent_id !== rootId) {
            // Buscar padre por UUID en el mapa
            const parent = nodeMap.get(node.parent_id);
            if (parent) {
                parent.children.push(currentNode);
            } else {
                tree.push(currentNode);
            }
        } else {
            tree.push(currentNode);
        }
    }
    
    return tree;
};

// Definir asociación para include
ResourceHierarchy.hasMany(UserResourceAccess, {
    foreignKey: 'resource_node_id',
    as: 'accesses'
});

UserResourceAccess.belongsTo(ResourceHierarchy, {
    foreignKey: 'resource_node_id',
    as: 'resourceNode'
});

export default {
    createNode,
    findNodeByPublicCode,
    findNodeByPublicCodeInternal,
    findNodeById,
    getChildren,
    getDescendants,
    getAncestors,
    getTree,
    moveNode,
    updateNode,
    deleteNode,
    listNodes,
    findNodesByReferenceId,
    grantAccess,
    revokeAccess,
    checkAccess,
    getAccessibleNodeIds,
    listUserAccess
};
