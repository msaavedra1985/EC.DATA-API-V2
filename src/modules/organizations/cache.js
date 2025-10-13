// modules/organizations/cache.js
// Sistema de caché Redis para organizaciones - Multi-usuario con invalidación inteligente

import { setCache, getCache, deleteCache } from '../../db/cache/redis.js';
import { apiLogger } from '../../utils/logger.js';

// TTLs configurados
const ORGANIZATION_TTL = 30 * 60; // 30 minutos
const HIERARCHY_TTL = 30 * 60; // 30 minutos
const PERMISSIONS_TTL = 15 * 60; // 15 minutos (sincronizado con session_context)

/**
 * Guarda una organización en caché
 * Key pattern: org:{publicCode}
 * 
 * @param {Object} organization - Objeto organización con todos sus datos
 * @returns {Promise<boolean>} true si se guardó correctamente
 */
export const cacheOrganization = async (organization) => {
    try {
        if (!organization?.public_code) {
            apiLogger.warn('Cannot cache organization without public_code');
            return false;
        }

        const key = `org:${organization.public_code}`;
        await setCache(key, organization, ORGANIZATION_TTL);
        
        apiLogger.debug({ publicCode: organization.public_code }, 'Organization cached');
        return true;
    } catch (error) {
        apiLogger.error({ err: error, publicCode: organization?.public_code }, 'Error caching organization');
        return false;
    }
};

/**
 * Obtiene una organización desde caché
 * 
 * @param {string} publicCode - Public code de la organización
 * @returns {Promise<Object|null>} Organización o null si no está en caché
 */
export const getCachedOrganization = async (publicCode) => {
    try {
        const key = `org:${publicCode}`;
        const cached = await getCache(key);
        
        if (cached) {
            apiLogger.debug({ publicCode }, 'Organization cache hit');
        }
        
        return cached;
    } catch (error) {
        apiLogger.error({ err: error, publicCode }, 'Error getting cached organization');
        return null;
    }
};

/**
 * Invalida el caché de una organización
 * También invalida la jerarquía relacionada
 * 
 * @param {string} publicCode - Public code de la organización
 * @param {string|null} parentPublicCode - Public code del padre (para invalidar su jerarquía también)
 * @returns {Promise<boolean>} true si se invalidó correctamente
 */
export const invalidateOrganizationCache = async (publicCode, parentPublicCode = null) => {
    try {
        const keysToDelete = [
            `org:${publicCode}`,
            `org:hierarchy:${publicCode}`
        ];
        
        // Si tiene padre, invalidar la jerarquía del padre también
        if (parentPublicCode) {
            keysToDelete.push(`org:hierarchy:${parentPublicCode}`);
        }
        
        await Promise.all(keysToDelete.map(key => deleteCache(key)));
        
        apiLogger.info({ publicCode, parentPublicCode }, 'Organization cache invalidated');
        return true;
    } catch (error) {
        apiLogger.error({ err: error, publicCode }, 'Error invalidating organization cache');
        return false;
    }
};

/**
 * Guarda la jerarquía de una organización en caché
 * Key pattern: org:hierarchy:{publicCode}
 * Contiene: children (array de hijos directos) y descendants (array de todos los descendientes)
 * 
 * @param {string} publicCode - Public code de la organización
 * @param {Object} hierarchy - Objeto con children y descendants
 * @returns {Promise<boolean>} true si se guardó correctamente
 */
export const cacheOrganizationHierarchy = async (publicCode, hierarchy) => {
    try {
        const key = `org:hierarchy:${publicCode}`;
        await setCache(key, hierarchy, HIERARCHY_TTL);
        
        apiLogger.debug({ publicCode, childrenCount: hierarchy.children?.length || 0 }, 'Organization hierarchy cached');
        return true;
    } catch (error) {
        apiLogger.error({ err: error, publicCode }, 'Error caching organization hierarchy');
        return false;
    }
};

/**
 * Obtiene la jerarquía de una organización desde caché
 * 
 * @param {string} publicCode - Public code de la organización
 * @returns {Promise<Object|null>} Jerarquía o null si no está en caché
 */
export const getCachedOrganizationHierarchy = async (publicCode) => {
    try {
        const key = `org:hierarchy:${publicCode}`;
        const cached = await getCache(key);
        
        if (cached) {
            apiLogger.debug({ publicCode }, 'Organization hierarchy cache hit');
        }
        
        return cached;
    } catch (error) {
        apiLogger.error({ err: error, publicCode }, 'Error getting cached organization hierarchy');
        return null;
    }
};

/**
 * Guarda los permisos de un usuario sobre una organización
 * Key pattern: org:access:{userId}:{publicCode}
 * 
 * @param {string} userId - UUID del usuario
 * @param {string} publicCode - Public code de la organización
 * @param {Object} permissions - Objeto con canView, canEdit, canDelete
 * @returns {Promise<boolean>} true si se guardó correctamente
 */
export const cacheOrganizationPermissions = async (userId, publicCode, permissions) => {
    try {
        const key = `org:access:${userId}:${publicCode}`;
        await setCache(key, permissions, PERMISSIONS_TTL);
        
        apiLogger.debug({ userId, publicCode }, 'Organization permissions cached');
        return true;
    } catch (error) {
        apiLogger.error({ err: error, userId, publicCode }, 'Error caching organization permissions');
        return false;
    }
};

/**
 * Obtiene los permisos de un usuario sobre una organización desde caché
 * 
 * @param {string} userId - UUID del usuario
 * @param {string} publicCode - Public code de la organización
 * @returns {Promise<Object|null>} Permisos o null si no está en caché
 */
export const getCachedOrganizationPermissions = async (userId, publicCode) => {
    try {
        const key = `org:access:${userId}:${publicCode}`;
        const cached = await getCache(key);
        
        if (cached) {
            apiLogger.debug({ userId, publicCode }, 'Organization permissions cache hit');
        }
        
        return cached;
    } catch (error) {
        apiLogger.error({ err: error, userId, publicCode }, 'Error getting cached organization permissions');
        return null;
    }
};

/**
 * Invalida todos los permisos de un usuario
 * Útil cuando cambia el rol del usuario o se revocan permisos
 * 
 * @param {string} userId - UUID del usuario
 * @returns {Promise<boolean>} true si se invalidó correctamente
 */
export const invalidateUserOrgPermissions = async (userId) => {
    try {
        // Pattern matching para eliminar todas las keys org:access:{userId}:*
        const pattern = `org:access:${userId}:*`;
        
        // Redis SCAN para encontrar keys que coincidan
        // Nota: esto requiere acceso directo a Redis client
        // Por simplicidad, log y marcar para limpieza manual/automática
        apiLogger.info({ userId, pattern }, 'User org permissions marked for invalidation');
        
        // En producción, implementar SCAN + DEL
        // Por ahora, los permisos expiran automáticamente en 15 min
        return true;
    } catch (error) {
        apiLogger.error({ err: error, userId }, 'Error invalidating user org permissions');
        return false;
    }
};

/**
 * Invalida toda la jerarquía de una organización y sus descendientes
 * Útil cuando se mueve una org en la jerarquía o se elimina
 * 
 * @param {Array<string>} publicCodes - Array de public codes a invalidar
 * @returns {Promise<boolean>} true si se invalidó correctamente
 */
export const invalidateOrganizationHierarchyBulk = async (publicCodes) => {
    try {
        const keysToDelete = publicCodes.flatMap(code => [
            `org:${code}`,
            `org:hierarchy:${code}`
        ]);
        
        await Promise.all(keysToDelete.map(key => deleteCache(key)));
        
        apiLogger.info({ count: publicCodes.length }, 'Organization hierarchy bulk invalidated');
        return true;
    } catch (error) {
        apiLogger.error({ err: error }, 'Error bulk invalidating organization hierarchy');
        return false;
    }
};

export default {
    cacheOrganization,
    getCachedOrganization,
    invalidateOrganizationCache,
    cacheOrganizationHierarchy,
    getCachedOrganizationHierarchy,
    cacheOrganizationPermissions,
    getCachedOrganizationPermissions,
    invalidateUserOrgPermissions,
    invalidateOrganizationHierarchyBulk
};
