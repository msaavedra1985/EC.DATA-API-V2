// modules/sites/cache.js
// Gestión de cache Redis para Sites

import { getCache, setCache, deleteCache } from '../../db/redis/client.js';
import logger from '../../utils/logger.js';

const SITE_LIST_CACHE_PREFIX = 'ec:sites:list:';
const SITE_LIST_CACHE_TTL = 600; // 10 minutos

/**
 * Cachear lista de sites
 * @param {string} cacheKey - Clave única del cache basada en filtros
 * @param {Object} data - Datos a cachear
 */
export const cacheSiteList = async (cacheKey, data) => {
    try {
        const fullKey = `${SITE_LIST_CACHE_PREFIX}${cacheKey}`;
        await setCache(fullKey, JSON.stringify(data), SITE_LIST_CACHE_TTL);
        logger.debug({ cacheKey: fullKey }, 'Site list cached');
    } catch (error) {
        logger.error({ err: error, cacheKey }, 'Error caching site list');
    }
};

/**
 * Obtener lista de sites cacheada
 * @param {string} cacheKey - Clave única del cache
 * @returns {Promise<Object|null>} - Datos cacheados o null
 */
export const getCachedSiteList = async (cacheKey) => {
    try {
        const fullKey = `${SITE_LIST_CACHE_PREFIX}${cacheKey}`;
        const cached = await getCache(fullKey);
        
        if (cached) {
            logger.debug({ cacheKey: fullKey }, 'Site list cache hit');
            return JSON.parse(cached);
        }
        
        logger.debug({ cacheKey: fullKey }, 'Site list cache miss');
        return null;
    } catch (error) {
        logger.error({ err: error, cacheKey }, 'Error getting cached site list');
        return null;
    }
};

/**
 * Invalidar cache de listas de sites
 * Invalida todos los caches que comienzan con el prefijo
 */
export const invalidateSiteCache = async () => {
    try {
        // En Redis, buscamos todas las keys que comienzan con el prefijo y las eliminamos
        // Esto requiere escanear las keys del patrón
        await deleteCache(`${SITE_LIST_CACHE_PREFIX}*`);
        logger.debug('Site list cache invalidated');
    } catch (error) {
        logger.error({ err: error }, 'Error invalidating site cache');
    }
};
