// modules/resource-hierarchy/cache.js
// Sistema de caché Redis para Resource Hierarchy
// Optimiza consultas de árbol, nodos y conteo de hijos

import { getCache, setCache, deleteCache, scanAndDelete } from '../../db/redis/client.js';
import logger from '../../utils/logger.js';
import crypto from 'crypto';

const rhLogger = logger.child({ component: 'resource-hierarchy-cache' });

// Prefijo de cache para Resource Hierarchy
const CACHE_PREFIX = 'ec:rh:';

// TTLs en segundos
const TTL = {
    NODE: 10 * 60,           // 10 min - nodo individual
    CHILDREN: 5 * 60,        // 5 min - hijos de un nodo
    TREE: 5 * 60,            // 5 min - árbol completo/parcial
    LIST: 5 * 60,            // 5 min - listado de nodos
    ANCESTORS: 10 * 60,      // 10 min - ancestros (cambian poco)
    DESCENDANTS: 5 * 60,     // 5 min - descendientes
};

/**
 * Construye la clave de cache con prefijo
 * @param {string} type - Tipo de cache (node, children, tree, etc)
 * @param {...string} parts - Partes adicionales de la clave
 * @returns {string} Clave completa
 */
const buildKey = (type, ...parts) => {
    return `${CACHE_PREFIX}${type}:${parts.join(':')}`;
};

/**
 * Genera un hash MD5 de las opciones para usar como key de cache
 * @param {Object} options - Objeto con opciones (limit, offset, nodeType, etc.)
 * @returns {string} Hash MD5 de las opciones
 */
const generateOptionsHash = (options) => {
    if (!options || Object.keys(options).length === 0) {
        return 'default';
    }
    
    // Ordenar las keys para que el mismo objeto genere el mismo hash
    const sortedOptions = Object.keys(options)
        .sort()
        .reduce((acc, key) => {
            if (options[key] !== undefined && options[key] !== null) {
                acc[key] = options[key];
            }
            return acc;
        }, {});
    
    return crypto.createHash('md5').update(JSON.stringify(sortedOptions)).digest('hex').substring(0, 12);
};

// ============================================
// CACHE DE NODO INDIVIDUAL
// ============================================

/**
 * Cachea un nodo individual por public_code
 * @param {string} publicCode - Public code del nodo
 * @param {Object} node - DTO del nodo
 * @returns {Promise<boolean>}
 */
export const cacheNode = async (publicCode, node) => {
    try {
        if (!publicCode || !node) return false;
        
        const key = buildKey('node', publicCode);
        await setCache(key, node, TTL.NODE);
        
        rhLogger.debug({ publicCode }, 'Node cached');
        return true;
    } catch (error) {
        rhLogger.error({ err: error, publicCode }, 'Error caching node');
        return false;
    }
};

/**
 * Obtiene un nodo desde cache
 * @param {string} publicCode - Public code del nodo
 * @returns {Promise<Object|null>}
 */
export const getCachedNode = async (publicCode) => {
    try {
        const key = buildKey('node', publicCode);
        const cached = await getCache(key);
        
        if (cached) {
            rhLogger.debug({ publicCode }, 'Node cache hit');
        }
        
        return cached;
    } catch (error) {
        rhLogger.error({ err: error, publicCode }, 'Error getting cached node');
        return null;
    }
};

/**
 * Invalida cache de un nodo específico
 * @param {string} publicCode - Public code del nodo
 * @returns {Promise<boolean>}
 */
export const invalidateNode = async (publicCode) => {
    try {
        const key = buildKey('node', publicCode);
        await deleteCache(key);
        
        rhLogger.debug({ publicCode }, 'Node cache invalidated');
        return true;
    } catch (error) {
        rhLogger.error({ err: error, publicCode }, 'Error invalidating node cache');
        return false;
    }
};

// ============================================
// CACHE DE HIJOS
// ============================================

/**
 * Cachea los hijos de un nodo
 * @param {string} parentPublicCode - Public code del nodo padre (o 'root' para raíz)
 * @param {string} organizationId - UUID de la organización
 * @param {Object} options - Opciones (limit, offset, nodeType)
 * @param {Object} result - Resultado con data y total
 * @returns {Promise<boolean>}
 */
export const cacheChildren = async (parentPublicCode, organizationId, options, result) => {
    try {
        const optionsHash = generateOptionsHash(options);
        const key = buildKey('children', organizationId, parentPublicCode || 'root', optionsHash);
        await setCache(key, result, TTL.CHILDREN);
        
        rhLogger.debug({ parentPublicCode, organizationId, optionsHash }, 'Children cached');
        return true;
    } catch (error) {
        rhLogger.error({ err: error, parentPublicCode }, 'Error caching children');
        return false;
    }
};

/**
 * Obtiene hijos desde cache
 * @param {string} parentPublicCode - Public code del nodo padre
 * @param {string} organizationId - UUID de la organización
 * @param {Object} options - Opciones de consulta
 * @returns {Promise<Object|null>}
 */
export const getCachedChildren = async (parentPublicCode, organizationId, options) => {
    try {
        const optionsHash = generateOptionsHash(options);
        const key = buildKey('children', organizationId, parentPublicCode || 'root', optionsHash);
        const cached = await getCache(key);
        
        if (cached) {
            rhLogger.debug({ parentPublicCode, organizationId }, 'Children cache hit');
        }
        
        return cached;
    } catch (error) {
        rhLogger.error({ err: error, parentPublicCode }, 'Error getting cached children');
        return null;
    }
};

// ============================================
// CACHE DE ÁRBOL
// ============================================

/**
 * Cachea un árbol de organización
 * @param {string} organizationId - UUID de la organización
 * @param {Object} options - Opciones (rootId, maxDepth)
 * @param {Array} tree - Árbol estructurado
 * @returns {Promise<boolean>}
 */
export const cacheTree = async (organizationId, options, tree) => {
    try {
        const optionsHash = generateOptionsHash(options);
        const key = buildKey('tree', organizationId, optionsHash);
        await setCache(key, tree, TTL.TREE);
        
        rhLogger.debug({ organizationId, optionsHash }, 'Tree cached');
        return true;
    } catch (error) {
        rhLogger.error({ err: error, organizationId }, 'Error caching tree');
        return false;
    }
};

/**
 * Obtiene árbol desde cache
 * @param {string} organizationId - UUID de la organización
 * @param {Object} options - Opciones de consulta
 * @returns {Promise<Array|null>}
 */
export const getCachedTree = async (organizationId, options) => {
    try {
        const optionsHash = generateOptionsHash(options);
        const key = buildKey('tree', organizationId, optionsHash);
        const cached = await getCache(key);
        
        if (cached) {
            rhLogger.debug({ organizationId }, 'Tree cache hit');
        }
        
        return cached;
    } catch (error) {
        rhLogger.error({ err: error, organizationId }, 'Error getting cached tree');
        return null;
    }
};

// ============================================
// CACHE DE LISTADOS
// ============================================

/**
 * Cachea un listado de nodos
 * @param {string} organizationId - UUID de la organización
 * @param {Object} options - Opciones de filtro y paginación
 * @param {Object} result - Resultado con data y total
 * @returns {Promise<boolean>}
 */
export const cacheList = async (organizationId, options, result) => {
    try {
        const optionsHash = generateOptionsHash(options);
        const key = buildKey('list', organizationId, optionsHash);
        await setCache(key, result, TTL.LIST);
        
        rhLogger.debug({ organizationId, optionsHash }, 'List cached');
        return true;
    } catch (error) {
        rhLogger.error({ err: error, organizationId }, 'Error caching list');
        return false;
    }
};

/**
 * Obtiene listado desde cache
 * @param {string} organizationId - UUID de la organización
 * @param {Object} options - Opciones de consulta
 * @returns {Promise<Object|null>}
 */
export const getCachedList = async (organizationId, options) => {
    try {
        const optionsHash = generateOptionsHash(options);
        const key = buildKey('list', organizationId, optionsHash);
        const cached = await getCache(key);
        
        if (cached) {
            rhLogger.debug({ organizationId }, 'List cache hit');
        }
        
        return cached;
    } catch (error) {
        rhLogger.error({ err: error, organizationId }, 'Error getting cached list');
        return null;
    }
};

// ============================================
// CACHE DE ANCESTROS
// ============================================

/**
 * Cachea ancestros de un nodo
 * @param {string} nodePublicCode - Public code del nodo
 * @param {Array} ancestors - Lista de ancestros
 * @returns {Promise<boolean>}
 */
export const cacheAncestors = async (nodePublicCode, ancestors) => {
    try {
        const key = buildKey('ancestors', nodePublicCode);
        await setCache(key, ancestors, TTL.ANCESTORS);
        
        rhLogger.debug({ nodePublicCode }, 'Ancestors cached');
        return true;
    } catch (error) {
        rhLogger.error({ err: error, nodePublicCode }, 'Error caching ancestors');
        return false;
    }
};

/**
 * Obtiene ancestros desde cache
 * @param {string} nodePublicCode - Public code del nodo
 * @returns {Promise<Array|null>}
 */
export const getCachedAncestors = async (nodePublicCode) => {
    try {
        const key = buildKey('ancestors', nodePublicCode);
        const cached = await getCache(key);
        
        if (cached) {
            rhLogger.debug({ nodePublicCode }, 'Ancestors cache hit');
        }
        
        return cached;
    } catch (error) {
        rhLogger.error({ err: error, nodePublicCode }, 'Error getting cached ancestors');
        return null;
    }
};

// ============================================
// INVALIDACIÓN DE CACHE
// ============================================

/**
 * Invalida todo el cache relacionado con una organización
 * Se usa cuando hay cambios que afectan la estructura del árbol
 * @param {string} organizationId - UUID de la organización
 * @returns {Promise<number>} Número de claves eliminadas
 */
export const invalidateOrganizationHierarchy = async (organizationId) => {
    try {
        // Patrones a invalidar para la organización
        const patterns = [
            `${CACHE_PREFIX}tree:${organizationId}:*`,
            `${CACHE_PREFIX}children:${organizationId}:*`,
            `${CACHE_PREFIX}list:${organizationId}:*`,
        ];
        
        let totalDeleted = 0;
        for (const pattern of patterns) {
            const deleted = await scanAndDelete(pattern);
            totalDeleted += deleted;
        }
        
        rhLogger.info({ organizationId, deletedKeys: totalDeleted }, 'Organization hierarchy cache invalidated');
        return totalDeleted;
    } catch (error) {
        rhLogger.error({ err: error, organizationId }, 'Error invalidating organization hierarchy cache');
        return 0;
    }
};

/**
 * Invalida cache de un nodo y sus relaciones
 * Se usa cuando se actualiza un nodo específico
 * @param {string} publicCode - Public code del nodo
 * @param {string} organizationId - UUID de la organización
 * @param {string} parentPublicCode - Public code del padre (opcional)
 * @returns {Promise<void>}
 */
export const invalidateNodeAndRelated = async (publicCode, organizationId, parentPublicCode = null) => {
    try {
        // Invalidar el nodo individual
        await invalidateNode(publicCode);
        
        // Invalidar ancestros del nodo
        await deleteCache(buildKey('ancestors', publicCode));
        
        // Invalidar hijos del padre (este nodo cambió en esa lista)
        if (parentPublicCode) {
            const parentChildrenPattern = `${CACHE_PREFIX}children:${organizationId}:${parentPublicCode}:*`;
            await scanAndDelete(parentChildrenPattern);
        }
        
        // Invalidar cache de root children si era nodo raíz
        const rootChildrenPattern = `${CACHE_PREFIX}children:${organizationId}:root:*`;
        await scanAndDelete(rootChildrenPattern);
        
        // Invalidar árboles y listados de la organización
        await invalidateOrganizationHierarchy(organizationId);
        
        rhLogger.debug({ publicCode, organizationId }, 'Node and related cache invalidated');
    } catch (error) {
        rhLogger.error({ err: error, publicCode }, 'Error invalidating node and related cache');
    }
};

/**
 * Invalida cache después de mover un nodo
 * Afecta tanto al padre antiguo como al nuevo
 * @param {string} publicCode - Public code del nodo movido
 * @param {string} organizationId - UUID de la organización
 * @param {string} oldParentPublicCode - Public code del padre anterior
 * @param {string} newParentPublicCode - Public code del nuevo padre
 * @returns {Promise<void>}
 */
export const invalidateAfterMove = async (publicCode, organizationId, oldParentPublicCode, newParentPublicCode) => {
    try {
        // Invalidar el nodo movido
        await invalidateNode(publicCode);
        
        // Invalidar ancestros (cambiaron)
        await deleteCache(buildKey('ancestors', publicCode));
        
        // Invalidar hijos del padre anterior
        if (oldParentPublicCode) {
            const oldParentPattern = `${CACHE_PREFIX}children:${organizationId}:${oldParentPublicCode}:*`;
            await scanAndDelete(oldParentPattern);
        }
        
        // Invalidar hijos del nuevo padre
        if (newParentPublicCode) {
            const newParentPattern = `${CACHE_PREFIX}children:${organizationId}:${newParentPublicCode}:*`;
            await scanAndDelete(newParentPattern);
        }
        
        // Si cualquiera de los padres es null (root), invalidar root children
        if (!oldParentPublicCode || !newParentPublicCode) {
            const rootPattern = `${CACHE_PREFIX}children:${organizationId}:root:*`;
            await scanAndDelete(rootPattern);
        }
        
        // Invalidar árboles y listados
        await invalidateOrganizationHierarchy(organizationId);
        
        rhLogger.info({ publicCode, organizationId, oldParentPublicCode, newParentPublicCode }, 'Cache invalidated after move');
    } catch (error) {
        rhLogger.error({ err: error, publicCode }, 'Error invalidating cache after move');
    }
};

/**
 * Invalida todo el cache de Resource Hierarchy
 * Usar con precaución, solo para mantenimiento
 * @returns {Promise<number>} Número de claves eliminadas
 */
export const invalidateAllHierarchyCache = async () => {
    try {
        const pattern = `${CACHE_PREFIX}*`;
        const deleted = await scanAndDelete(pattern);
        
        rhLogger.warn({ deletedKeys: deleted }, 'All hierarchy cache invalidated');
        return deleted;
    } catch (error) {
        rhLogger.error({ err: error }, 'Error invalidating all hierarchy cache');
        return 0;
    }
};

// ============================================
// EXPORTS
// ============================================

export default {
    // Nodos
    cacheNode,
    getCachedNode,
    invalidateNode,
    
    // Hijos
    cacheChildren,
    getCachedChildren,
    
    // Árbol
    cacheTree,
    getCachedTree,
    
    // Listados
    cacheList,
    getCachedList,
    
    // Ancestros
    cacheAncestors,
    getCachedAncestors,
    
    // Invalidación
    invalidateOrganizationHierarchy,
    invalidateNodeAndRelated,
    invalidateAfterMove,
    invalidateAllHierarchyCache,
    
    // TTLs (para referencia externa)
    TTL,
};
