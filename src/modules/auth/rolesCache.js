// modules/auth/rolesCache.js
// Sistema de caché Redis para roles - Mejora performance de verificaciones RBAC

import { setCache, getCache, deleteCache, scanAndDelete } from '../../db/redis/client.js';
import { dbLogger } from '../../utils/logger.js';

const ROLE_CACHE_TTL = 30 * 60; // 30 minutos
const ROLE_PREFIX = 'ec:role:';

/**
 * Cachea un rol por nombre
 * Key pattern: ec:role:{roleName}
 * 
 * @param {Object} role - Objeto Role de Sequelize
 * @returns {Promise<boolean>} true si se guardó correctamente
 */
export const cacheRole = async (role) => {
    try {
        if (!role?.name) {
            dbLogger.warn('Cannot cache role without name');
            return false;
        }

        const key = `${ROLE_PREFIX}${role.name}`;
        const roleData = {
            id: role.id,
            name: role.name,
            description: role.description,
            is_active: role.is_active
        };

        await setCache(key, roleData, ROLE_CACHE_TTL);
        
        dbLogger.debug({ roleName: role.name }, 'Role cached');
        return true;
    } catch (error) {
        dbLogger.error({ err: error, roleName: role?.name }, 'Error caching role');
        return false;
    }
};

/**
 * Obtiene un rol desde cache por nombre
 * 
 * @param {string} roleName - Nombre del rol (ej: 'system-admin', 'user')
 * @returns {Promise<Object|null>} Role object o null si no está en cache
 */
export const getCachedRole = async (roleName) => {
    try {
        const key = `${ROLE_PREFIX}${roleName}`;
        const cached = await getCache(key);
        
        if (cached) {
            dbLogger.debug({ roleName }, 'Role cache hit');
            return cached; // getCache ya parsea JSON automáticamente
        }
        
        return null;
    } catch (error) {
        dbLogger.error({ err: error, roleName }, 'Error getting cached role');
        return null;
    }
};

/**
 * Invalida el cache de un rol específico
 * Se debe llamar cuando se actualiza o desactiva un rol
 * 
 * @param {string} roleName - Nombre del rol a invalidar
 * @returns {Promise<boolean>} true si se invalidó correctamente
 */
export const invalidateRole = async (roleName) => {
    try {
        const key = `${ROLE_PREFIX}${roleName}`;
        await deleteCache(key);
        
        dbLogger.info({ roleName }, 'Role cache invalidated');
        return true;
    } catch (error) {
        dbLogger.error({ err: error, roleName }, 'Error invalidating role cache');
        return false;
    }
};

/**
 * Invalida TODOS los roles cacheados usando SCAN+DEL
 * Útil cuando se hace un cambio masivo en roles o permisos
 * 
 * @returns {Promise<boolean>} true si se invalidó correctamente
 */
export const invalidateAllRoles = async () => {
    try {
        const pattern = 'ec:role:*';
        const deletedCount = await scanAndDelete(pattern);
        
        dbLogger.info({ deletedCount }, 'All role caches invalidated');
        return true;
    } catch (error) {
        dbLogger.error({ err: error }, 'Error invalidating all roles');
        return false;
    }
};

export default {
    cacheRole,
    getCachedRole,
    invalidateRole,
    invalidateAllRoles
};
