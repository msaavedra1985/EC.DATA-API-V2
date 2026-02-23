// modules/resource-hierarchy/repository.js
// Capa de acceso a datos para ResourceHierarchy
// Implementa operaciones de árbol usando ltree de PostgreSQL

import { Op, QueryTypes } from 'sequelize';
import ResourceHierarchy from './models/ResourceHierarchy.js';
import UserResourceAccess from './models/UserResourceAccess.js';
import sequelize from '../../db/sql/sequelize.js';
import { generateUuidV7, generatePublicCode } from '../../utils/identifiers.js';

/**
 * Obtener el siguiente human_id para una organización usando contador atómico
 * Usa UPDATE ... RETURNING para garantizar unicidad sin race conditions
 * Si la organización no tiene contador, lo crea con valor 1
 * 
 * @param {string} organizationId - UUID de la organización
 * @param {Object} transaction - Transacción de Sequelize (opcional)
 * @returns {Promise<number>} - Siguiente human_id
 */
const getNextHumanId = async (organizationId, transaction = null) => {
    // Intentar incrementar el contador existente
    const [results] = await sequelize.query(`
        INSERT INTO organization_resource_counters (organization_id, last_value, created_at, updated_at)
        VALUES ($1, 1, NOW(), NOW())
        ON CONFLICT (organization_id) 
        DO UPDATE SET last_value = organization_resource_counters.last_value + 1, updated_at = NOW()
        RETURNING last_value
    `, {
        bind: [organizationId],
        type: QueryTypes.SELECT,
        transaction
    });
    
    return results.last_value;
};

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
 * El human_id se obtiene del contador atómico por organización
 * Usa transacción para garantizar atomicidad entre contador e insert
 * 
 * @param {Object} data - Datos del nodo (debe incluir organization_id)
 * @returns {Promise<Object>} - Nodo creado con conteo de hijos
 */
export const createNode = async (data) => {
    const id = generateUuidV7();
    const publicCode = generatePublicCode('RES', id);
    
    // Usar transacción para que el incremento del contador y el insert sean atómicos
    // Si el insert falla, el contador también se revierte
    const result = await sequelize.transaction(async (transaction) => {
        // Obtener human_id del contador atómico por organización (O(1), sin race conditions)
        const humanId = await getNextHumanId(data.organization_id, transaction);
        
        const node = await ResourceHierarchy.create({
            id,
            human_id: humanId,
            public_code: publicCode,
            ...data
        }, { transaction });
        
        // Recargar para obtener el path calculado por el trigger
        await node.reload({ transaction });
        
        return node;
    });
    
    // Para nodos nuevos, children_count siempre es 0
    // Usamos el modelo Sequelize y agregamos children_count manualmente
    const nodeData = result.toJSON();
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
 * Buscar nodo por reference_id dentro de una organización
 * Usado para validar que un recurso no esté duplicado en la jerarquía
 * 
 * @param {string} referenceId - Public code del recurso (ej: CHN-xxx, SIT-xxx)
 * @param {string} organizationId - UUID de la organización
 * @returns {Promise<Object|null>} - Nodo encontrado o null
 */
export const findNodeByReferenceId = async (referenceId, organizationId) => {
    const query = `
        SELECT rh.*
        FROM resource_hierarchy rh
        WHERE rh.reference_id = $1
          AND rh.organization_id = $2
          AND rh.deleted_at IS NULL
        LIMIT 1
    `;
    
    const rows = await sequelize.query(query, {
        bind: [referenceId, organizationId],
        type: QueryTypes.SELECT
    });
    
    return rows.length > 0 ? rows[0] : null;
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
    const { limit = 100, offset = 0, nodeType = null, includeCounts = true, showAll = false } = options;
    
    // Seleccionar columnas: incluir conteo de hijos solo si se solicita
    const selectColumns = includeCounts
        ? `rh.*, (SELECT COUNT(*) FROM resource_hierarchy c 
            WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count`
        : 'rh.*';
    
    // Si showAll=true, no filtramos por organización (God View)
    let query = `
        SELECT ${selectColumns}
        FROM resource_hierarchy rh
        WHERE rh.deleted_at IS NULL
          AND rh.is_active = true
    `;
    
    const replacements = [];
    let paramIndex = 1;
    
    // Solo filtrar por organización si no está en modo showAll
    if (!showAll && organizationId) {
        query += ` AND rh.organization_id = $${paramIndex}`;
        replacements.push(organizationId);
        paramIndex++;
    }
    
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
    
    // Construir query de conteo dinámicamente
    let countQuery = `SELECT COUNT(*) as count FROM resource_hierarchy rh WHERE rh.deleted_at IS NULL AND rh.is_active = true`;
    const countReplacements = [];
    let countParamIndex = 1;
    
    if (!showAll && organizationId) {
        countQuery += ` AND rh.organization_id = $${countParamIndex}`;
        countReplacements.push(organizationId);
        countParamIndex++;
    }
    
    if (parentId === null) {
        countQuery += ` AND rh.parent_id IS NULL`;
    } else {
        countQuery += ` AND rh.parent_id = $${countParamIndex}`;
        countReplacements.push(parentId);
        countParamIndex++;
    }
    
    if (nodeType) {
        countQuery += ` AND rh.node_type = $${countParamIndex}`;
        countReplacements.push(nodeType);
    }
    const countResult = await sequelize.query(countQuery, {
        bind: countReplacements,
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
        data: rows.map(row => toNodeDto(row, includeCounts)),
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
    // maxDepth por defecto: 3 niveles para evitar cargas masivas
    // Se puede aumentar hasta 10 o null para carga completa
    const { rootId = null, maxDepth = 3, limit = 500, showAll = false } = options;
    
    let nodes;
    
    if (rootId) {
        // Obtener subárbol desde un nodo específico
        const result = await getDescendantsWithChildCount(rootId, { limit, maxDepth });
        const rootNode = await getNodeByIdWithChildrenCount(rootId);
        nodes = rootNode ? [rootNode, ...result.data] : result.data;
    } else {
        // Obtener árbol completo con conteo de hijos y límite de profundidad
        // Si showAll=true, no filtramos por organización (God View)
        let query = `
            SELECT rh.*,
                   (SELECT COUNT(*) FROM resource_hierarchy c 
                    WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count
            FROM resource_hierarchy rh
            WHERE rh.deleted_at IS NULL
              AND rh.is_active = true
        `;
        
        const replacements = [];
        let paramIndex = 1;
        
        // Solo filtrar por organización si no está en modo showAll
        if (!showAll && organizationId) {
            query += ` AND rh.organization_id = $${paramIndex}`;
            replacements.push(organizationId);
            paramIndex++;
        }
        
        // Agregar filtro de profundidad si está definido
        if (maxDepth !== null) {
            query += ` AND rh.depth <= $${paramIndex}`;
            replacements.push(maxDepth);
            paramIndex++;
        }
        
        query += ` ORDER BY rh.depth ASC, rh.display_order ASC, rh.name ASC LIMIT $${paramIndex}`;
        replacements.push(limit);
        
        const rows = await sequelize.query(query, {
            bind: replacements,
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
 * Verificar si un nodo es descendiente de otro
 * Usa ltree para verificación eficiente O(1) sin cargar todos los descendientes
 * 
 * @param {string} potentialDescendantId - UUID del posible descendiente
 * @param {string} ancestorId - UUID del posible ancestro
 * @returns {Promise<boolean>} - true si potentialDescendantId es descendiente de ancestorId
 */
export const isDescendantOf = async (potentialDescendantId, ancestorId) => {
    const query = `
        SELECT EXISTS (
            SELECT 1 
            FROM resource_hierarchy descendant, resource_hierarchy ancestor
            WHERE descendant.id = $1
              AND ancestor.id = $2
              AND descendant.path <@ ancestor.path
              AND descendant.id != ancestor.id
              AND descendant.deleted_at IS NULL
              AND ancestor.deleted_at IS NULL
        ) as is_descendant
    `;
    
    const [result] = await sequelize.query(query, {
        bind: [potentialDescendantId, ancestorId],
        type: QueryTypes.SELECT
    });
    
    return result?.is_descendant === true;
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
        // Usa ltree para verificación eficiente O(1)
        const wouldCreateCycle = await isDescendantOf(newParentId, nodeId);
        if (wouldCreateCycle) {
            const error = new Error('No se puede mover un nodo a uno de sus descendientes');
            error.code = 'CYCLE_DETECTED';
            throw error;
        }
        
        // Verificar que no estamos moviendo a sí mismo
        if (newParentId === nodeId) {
            const error = new Error('No se puede mover un nodo a sí mismo');
            error.code = 'SELF_REFERENCE';
            throw error;
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
 * Obtener información básica de todos los descendientes de un nodo
 * Incluye el nodo raíz en la respuesta
 * Se usa para mostrar al usuario qué nodos serán afectados por cascade delete
 * 
 * @param {string} nodeId - UUID del nodo
 * @returns {Promise<Array>} - Lista de descendientes con info básica (public_code, name, node_type)
 */
export const getDescendantsForDeletion = async (nodeId) => {
    const node = await ResourceHierarchy.findByPk(nodeId, {
        attributes: ['id', 'path', 'public_code', 'name', 'node_type']
    });
    
    if (!node) {
        return [];
    }
    
    // Obtener todos los nodos que serán eliminados (incluido el nodo raíz)
    const query = `
        SELECT public_code, name, node_type
        FROM resource_hierarchy
        WHERE path <@ $1::ltree
          AND deleted_at IS NULL
        ORDER BY path ASC
    `;
    
    const descendants = await sequelize.query(query, {
        bind: [node.dataValues.path],
        type: QueryTypes.SELECT
    });
    
    return descendants;
};

/**
 * Eliminar un nodo (soft delete)
 * También elimina todos los descendientes si cascade=true
 * 
 * @param {string} nodeId - UUID del nodo
 * @param {boolean} cascade - Si true, elimina descendientes (default false)
 * @returns {Promise<Object>} - Resultado con count y lista de nodos eliminados
 */
export const deleteNode = async (nodeId, cascade = false) => {
    // Obtener nodo con path ltree (necesario para cascade delete)
    const [nodeRow] = await sequelize.query(
        `SELECT * FROM resource_hierarchy WHERE id = $1 AND deleted_at IS NULL`,
        { bind: [nodeId], type: QueryTypes.SELECT }
    );
    
    if (!nodeRow) {
        throw new Error('Nodo no encontrado');
    }
    
    // Crear objeto node compatible para el resto del código
    const node = {
        id: nodeRow.id,
        organization_id: nodeRow.organization_id,
        public_code: nodeRow.public_code,
        name: nodeRow.name,
        node_type: nodeRow.node_type,
        path: nodeRow.path,
        dataValues: { path: nodeRow.path },
        destroy: async () => {
            await sequelize.query(
                `UPDATE resource_hierarchy SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
                { bind: [nodeId] }
            );
        }
    };
    
    // Verificar si tiene hijos activos
    const children = await getChildren(nodeId, node.organization_id, { limit: 1 });
    const hasChildren = children.total > 0;
    
    // Si tiene hijos y no viene cascade, lanzar error con info de descendientes
    if (hasChildren && !cascade) {
        const descendants = await getDescendantsForDeletion(nodeId);
        const error = new Error('El nodo tiene hijos. Debe confirmar la eliminación en cascada.');
        error.code = 'HAS_CHILDREN';
        error.data = {
            // Excluir el nodo raíz de la lista de hijos afectados
            affected_nodes: descendants.filter(d => d.public_code !== node.public_code),
            total_affected: descendants.length
        };
        throw error;
    }
    
    let deletedNodes = [];
    
    if (cascade || hasChildren) {
        // Obtener info de todos los nodos antes de eliminar
        deletedNodes = await getDescendantsForDeletion(nodeId);
        
        // Soft delete de todos los descendientes
        const query = `
            UPDATE resource_hierarchy
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE path <@ $1::ltree
              AND deleted_at IS NULL
        `;
        
        await sequelize.query(query, {
            bind: [node.dataValues.path]
        });
    } else {
        // Solo eliminar el nodo individual
        deletedNodes = [{
            public_code: node.public_code,
            name: node.name,
            node_type: node.node_type
        }];
        
        await node.destroy(); // Soft delete (paranoid: true)
    }
    
    return {
        deleted_count: deletedNodes.length,
        deleted_nodes: deletedNodes,
        cascade
    };
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
        isActive = true,
        showAll = false  // Nuevo: si true, no filtra por organización (God View)
    } = options;
    
    // Usar raw query para incluir conteo de hijos
    // Si showAll=true, no filtramos por organización (para system-admin en God View)
    let query = `
        SELECT rh.*,
               (SELECT COUNT(*) FROM resource_hierarchy c 
                WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count
        FROM resource_hierarchy rh
        WHERE rh.deleted_at IS NULL
    `;
    
    const replacements = [];
    let paramIndex = 1;
    
    // Solo filtrar por organización si no está en modo showAll
    if (!showAll && organizationId) {
        query += ` AND rh.organization_id = $${paramIndex}`;
        replacements.push(organizationId);
        paramIndex++;
    }
    
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

/**
 * Obtener múltiples nodos por sus public_codes
 * Útil para cargas batch desde el frontend
 * Filtra por organizationId para garantizar aislamiento multi-tenant
 * 
 * @param {Array<string>} publicCodes - Array de public codes
 * @param {Object} options - Opciones (includeCounts, organizationId)
 * @returns {Promise<Array>} - Lista de nodos encontrados (solo de la organización especificada)
 */
export const batchFindByPublicCodes = async (publicCodes, options = {}) => {
    const { includeCounts = true, organizationId = null } = options;
    
    if (!publicCodes || publicCodes.length === 0) {
        return [];
    }
    
    // Limitar a 100 nodos por consulta
    const limitedCodes = publicCodes.slice(0, 100);
    
    // Construir placeholders para la consulta
    const placeholders = limitedCodes.map((_, i) => `$${i + 1}`).join(', ');
    
    const selectColumns = includeCounts
        ? `rh.*, (SELECT COUNT(*) FROM resource_hierarchy c 
            WHERE c.parent_id = rh.id AND c.deleted_at IS NULL AND c.is_active = true) as children_count`
        : 'rh.*';
    
    // Filtrar por organización si se especifica (seguridad multi-tenant)
    let orgFilter = '';
    const bindings = [...limitedCodes];
    if (organizationId) {
        orgFilter = ` AND rh.organization_id = $${bindings.length + 1}`;
        bindings.push(organizationId);
    }
    
    const query = `
        SELECT ${selectColumns}
        FROM resource_hierarchy rh
        WHERE rh.public_code IN (${placeholders})
          AND rh.deleted_at IS NULL${orgFilter}
    `;
    
    const rows = await sequelize.query(query, {
        bind: bindings,
        type: QueryTypes.SELECT
    });
    
    return rows.map(row => toNodeDto(row, includeCounts));
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
function toNodeDto(node, includeCounts = true) {
    if (!node) return null;
    
    const data = node.toJSON ? node.toJSON() : node;
    
    const dto = {
        id: data.public_code,
        name: data.name,
        description: data.description,
        node_type: data.node_type,
        icon: data.icon,
        display_order: data.display_order,
        depth: data.depth,
        parent_id: data.parent_id ? data.parent?.public_code || data.parent_id : null,
        metadata: data.metadata,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // Campos internos para operaciones (no exponer en API)
        _uuid: data.id,
        _organization_id: data.organization_id
    };
    
    // Solo incluir has_children y children_count si se solicita
    if (includeCounts) {
        const childrenCount = parseInt(data.children_count, 10) || 0;
        const hasChildren = childrenCount > 0 || (data.children?.length > 0);
        dto.has_children = hasChildren;
        dto.children_count = childrenCount;
    }
    
    return dto;
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
    foreignKey: 'resourceNodeId',
    as: 'accesses'
});

UserResourceAccess.belongsTo(ResourceHierarchy, {
    foreignKey: 'resourceNodeId',
    as: 'resourceNode'
});

/**
 * Crear múltiples nodos en una transacción
 * Todos los nodos deben compartir el mismo parent_id y organization_id
 * 
 * @param {Array<Object>} nodesData - Array de datos de nodos
 * @param {Object} options - Opciones { parentId, organizationId, transaction }
 * @returns {Promise<Array<Object>>} - Array de nodos creados
 */
export const batchCreateNodes = async (nodesData, options = {}) => {
    const { parentId = null, organizationId, transaction } = options;
    
    const createdNodes = [];
    
    for (let i = 0; i < nodesData.length; i++) {
        const data = nodesData[i];
        const id = generateUuidV7();
        const humanId = await generateHumanId(ResourceHierarchy, null, transaction);
        const publicCode = generatePublicCode('RES', id);
        
        const node = await ResourceHierarchy.create({
            id,
            human_id: humanId,
            public_code: publicCode,
            organization_id: organizationId,
            parent_id: parentId,
            node_type: data.node_type,
            reference_id: data.reference_id || null,
            name: data.name,
            description: data.description || null,
            icon: data.icon || null,
            color: data.color || null,
            display_order: data.display_order ?? i,
            metadata: data.metadata || {}
        }, { transaction });
        
        await node.reload({ transaction });
        
        const nodeData = node.toJSON();
        nodeData.children_count = 0;
        
        createdNodes.push(toNodeDto(nodeData));
    }
    
    return createdNodes;
};

/**
 * Obtener árbol filtrado por categoría de asset
 * Retorna solo las ramas que contienen nodos (típicamente channels) con el tag especificado
 * 
 * Algoritmo:
 * 1. Encontrar todos los nodos con asset_category_id que coincida (incluyendo subcategorías)
 * 2. Obtener los paths de esos nodos y extraer todos los IDs de ancestros
 * 3. Retornar esos nodos estructurados como árbol
 * 
 * @param {string} organizationId - UUID de la organización
 * @param {number} categoryId - ID de la categoría a filtrar
 * @param {Object} options - Opciones adicionales
 * @param {boolean} options.includeSubcategories - Si incluir subcategorías del tag (default: true)
 * @param {number} options.limit - Límite de nodos (default: 500)
 * @returns {Promise<Array>} - Árbol filtrado
 */
export const getFilteredTree = async (organizationId, categoryId, options = {}) => {
    const { includeSubcategories = true, limit = 500 } = options;
    
    // 1. Obtener los IDs de categorías a buscar (la categoría + sus descendientes si aplica)
    let categoryIds = [categoryId];
    
    if (includeSubcategories) {
        // Obtener path de la categoría para encontrar descendientes
        const [categoryRow] = await sequelize.query(`
            SELECT id, path FROM asset_categories WHERE id = $1
        `, {
            bind: [categoryId],
            type: QueryTypes.SELECT
        });
        
        if (categoryRow && categoryRow.path) {
            // Buscar todas las categorías que tienen el path como prefijo
            const descendants = await sequelize.query(`
                SELECT id FROM asset_categories 
                WHERE path LIKE $1 || '%'
                  AND is_active = true
            `, {
                bind: [categoryRow.path],
                type: QueryTypes.SELECT
            });
            
            categoryIds = descendants.map(d => d.id);
        }
    }
    
    if (categoryIds.length === 0) {
        return [];
    }
    
    // 2. Encontrar todos los nodos que tienen el asset_category_id (típicamente channels)
    // y obtener sus paths para extraer ancestros
    const matchingNodesQuery = `
        SELECT id, path
        FROM resource_hierarchy
        WHERE organization_id = $1
          AND asset_category_id = ANY($2::int[])
          AND deleted_at IS NULL
          AND is_active = true
    `;
    
    const matchingNodes = await sequelize.query(matchingNodesQuery, {
        bind: [organizationId, categoryIds],
        type: QueryTypes.SELECT
    });
    
    if (matchingNodes.length === 0) {
        return [];
    }
    
    // 3. Extraer todos los UUIDs de ancestros desde los paths ltree
    // El path ltree tiene formato: uuid1.uuid2.uuid3 (sin guiones, con underscores en lugar de guiones)
    // Necesitamos obtener todos los nodos en esos paths
    const matchingNodeIds = matchingNodes.map(n => n.id);
    
    // Usar query SQL para obtener todos los ancestros de los nodos matching
    // Esto incluye los nodos matching + todos sus padres hasta la raíz
    const ancestorQuery = `
        WITH matching AS (
            SELECT id, path
            FROM resource_hierarchy
            WHERE id = ANY($1::uuid[])
        ),
        all_ancestor_ids AS (
            -- Obtener todos los nodos que son ancestros O el nodo mismo de los matching
            -- m.path <@ rh.path = m es descendiente de rh (rh es ancestro de m)
            -- m.path @> rh.path = m es ancestro de rh (incluir el nodo mismo)
            SELECT DISTINCT rh.id
            FROM resource_hierarchy rh, matching m
            WHERE (m.path <@ rh.path OR rh.id = m.id)
              AND rh.organization_id = $2
              AND rh.deleted_at IS NULL
              AND rh.is_active = true
        )
        SELECT rh.*,
               (SELECT COUNT(*) FROM resource_hierarchy c 
                WHERE c.parent_id = rh.id 
                  AND c.deleted_at IS NULL 
                  AND c.is_active = true
                  AND (c.asset_category_id = ANY($3::int[]) 
                       OR EXISTS (
                           SELECT 1 FROM resource_hierarchy d
                           WHERE d.path <@ c.path
                             AND d.asset_category_id = ANY($3::int[])
                             AND d.deleted_at IS NULL
                             AND d.is_active = true
                       ))
               ) as children_count,
               CASE WHEN rh.asset_category_id = ANY($3::int[]) THEN true ELSE false END as matches_filter
        FROM resource_hierarchy rh
        WHERE rh.id IN (SELECT id FROM all_ancestor_ids)
        ORDER BY rh.depth ASC, rh.display_order ASC, rh.name ASC
        LIMIT $4
    `;
    
    const rows = await sequelize.query(ancestorQuery, {
        bind: [matchingNodeIds, organizationId, categoryIds, limit],
        type: QueryTypes.SELECT
    });
    
    // 4. Convertir a DTOs y construir árbol
    const nodes = rows.map(row => {
        const dto = toNodeDto(row);
        dto.matches_filter = row.matches_filter;
        return dto;
    });
    
    return buildTree(nodes, null);
};

/**
 * Verificar si un nodo tiene descendientes con cierta categoría
 * Útil para lazy loading - saber si al expandir un nodo habrá resultados
 * 
 * @param {string} nodeId - UUID del nodo padre
 * @param {number} categoryId - ID de la categoría
 * @param {boolean} includeSubcategories - Si incluir subcategorías
 * @returns {Promise<boolean>} - true si hay descendientes con el tag
 */
export const hasDescendantsWithCategory = async (nodeId, categoryId, includeSubcategories = true) => {
    // Obtener IDs de categorías
    let categoryIds = [categoryId];
    
    if (includeSubcategories) {
        const [categoryRow] = await sequelize.query(`
            SELECT path FROM asset_categories WHERE id = $1
        `, {
            bind: [categoryId],
            type: QueryTypes.SELECT
        });
        
        if (categoryRow && categoryRow.path) {
            const descendants = await sequelize.query(`
                SELECT id FROM asset_categories 
                WHERE path LIKE $1 || '%' AND is_active = true
            `, {
                bind: [categoryRow.path],
                type: QueryTypes.SELECT
            });
            categoryIds = descendants.map(d => d.id);
        }
    }
    
    // Obtener el path del nodo padre
    const [node] = await sequelize.query(`
        SELECT path FROM resource_hierarchy WHERE id = $1 AND deleted_at IS NULL
    `, {
        bind: [nodeId],
        type: QueryTypes.SELECT
    });
    
    if (!node) return false;
    
    // Verificar si hay descendientes con el tag
    const [result] = await sequelize.query(`
        SELECT EXISTS (
            SELECT 1 
            FROM resource_hierarchy
            WHERE path <@ $1::ltree
              AND id != $2
              AND asset_category_id = ANY($3::int[])
              AND deleted_at IS NULL
              AND is_active = true
        ) as has_descendants
    `, {
        bind: [node.path, nodeId, categoryIds],
        type: QueryTypes.SELECT
    });
    
    return result?.has_descendants === true;
};

export default {
    createNode,
    findNodeByPublicCode,
    findNodeByPublicCodeInternal,
    findNodeById,
    getChildren,
    getDescendants,
    getAncestors,
    getTree,
    getFilteredTree,
    hasDescendantsWithCategory,
    moveNode,
    updateNode,
    deleteNode,
    listNodes,
    findNodesByReferenceId,
    grantAccess,
    revokeAccess,
    checkAccess,
    getAccessibleNodeIds,
    listUserAccess,
    batchCreateNodes
};
