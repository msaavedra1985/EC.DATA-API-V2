// modules/users/cache.js
// Sistema de cache Redis para usuarios

import { getCache, setCache, deleteCache } from '../../db/redis/client.js';
import crypto from 'crypto';
import pino from 'pino';

const userLogger = pino({ name: 'users-cache' });

/**
 * TTLs de cache para usuarios
 * - USER_CACHE_TTL: 15 minutos para usuarios individuales
 * - LIST_CACHE_TTL: 5 minutos para listas paginadas
 */
const USER_CACHE_TTL = 15 * 60; // 15 minutos
const LIST_CACHE_TTL = 5 * 60;  // 5 minutos

/**
 * Genera hash de filtros para cache key
 * @param {Object} filters - Filtros aplicados a la query
 * @returns {string} - Hash MD5 de los filtros
 */
const generateFiltersHash = (filters) => {
    const normalized = JSON.stringify(filters, Object.keys(filters).sort());
    return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 8);
};

/**
 * Cachea un usuario individual
 * Key pattern: ec:user:{public_code}
 * 
 * @param {string} publicCode - Public code del usuario (USR-XXXXX-X)
 * @param {Object} userData - DTO del usuario
 * @returns {Promise<boolean>} - true si se guardó correctamente
 */
export const cacheUser = async (publicCode, userData) => {
    try {
        const key = `ec:user:${publicCode}`;
        await setCache(key, userData, USER_CACHE_TTL);
        
        userLogger.debug({ publicCode }, 'User cached');
        return true;
    } catch (error) {
        userLogger.error({ err: error, publicCode }, 'Error caching user');
        return false;
    }
};

/**
 * Obtiene un usuario cacheado
 * 
 * @param {string} publicCode - Public code del usuario
 * @returns {Promise<Object|null>} - Usuario cacheado o null
 */
export const getCachedUser = async (publicCode) => {
    try {
        const key = `ec:user:${publicCode}`;
        const cached = await getCache(key);
        
        if (cached) {
            userLogger.debug({ publicCode }, 'User cache hit');
        }
        
        return cached;
    } catch (error) {
        userLogger.error({ err: error, publicCode }, 'Error getting cached user');
        return null;
    }
};

/**
 * Invalida el cache de un usuario específico
 * 
 * @param {string} publicCode - Public code del usuario
 * @returns {Promise<boolean>} - true si se invalidó correctamente
 */
export const invalidateUserCache = async (publicCode) => {
    try {
        const key = `ec:user:${publicCode}`;
        await deleteCache(key);
        
        userLogger.debug({ publicCode }, 'User cache invalidated');
        return true;
    } catch (error) {
        userLogger.error({ err: error, publicCode }, 'Error invalidating user cache');
        return false;
    }
};

/**
 * Cachea una lista paginada de usuarios
 * Key pattern: ec:user:list:{limit}:{offset}:{filtersHash}
 * 
 * @param {number} limit - Límite de resultados
 * @param {number} offset - Offset para paginación
 * @param {Object} filters - Filtros aplicados
 * @param {Object} result - Resultado de la query (total y users)
 * @returns {Promise<boolean>} - true si se guardó correctamente
 */
export const cacheUserList = async (limit, offset, filters, result) => {
    try {
        const filtersHash = generateFiltersHash(filters);
        const key = `ec:user:list:${limit}:${offset}:${filtersHash}`;
        
        await setCache(key, result, LIST_CACHE_TTL);
        
        userLogger.debug({ limit, offset, filtersHash, count: result.users?.length }, 'User list cached');
        return true;
    } catch (error) {
        userLogger.error({ err: error, limit, offset }, 'Error caching user list');
        return false;
    }
};

/**
 * Obtiene una lista paginada cacheada de usuarios
 * 
 * @param {number} limit - Límite de resultados
 * @param {number} offset - Offset para paginación
 * @param {Object} filters - Filtros aplicados
 * @returns {Promise<Object|null>} - Lista cacheada o null
 */
export const getCachedUserList = async (limit, offset, filters) => {
    try {
        const filtersHash = generateFiltersHash(filters);
        const key = `ec:user:list:${limit}:${offset}:${filtersHash}`;
        
        const cached = await getCache(key);
        
        if (cached) {
            userLogger.debug({ limit, offset, filtersHash }, 'User list cache hit');
        }
        
        return cached;
    } catch (error) {
        userLogger.error({ err: error, limit, offset }, 'Error getting cached user list');
        return null;
    }
};

/**
 * Invalida todas las listas cacheadas de usuarios
 * Se usa después de CREATE/UPDATE/DELETE para forzar refresh
 * 
 * Nota: Redis no soporta pattern delete eficientemente,
 * por lo que usamos TTL corto (5 min) en lugar de invalidación activa
 * 
 * @returns {Promise<boolean>}
 */
export const invalidateAllUserLists = async () => {
    // Por ahora, simplemente loggeamos
    // Las listas se auto-invalidan por TTL (5 min)
    userLogger.debug('User lists will auto-expire via TTL');
    return true;
};
