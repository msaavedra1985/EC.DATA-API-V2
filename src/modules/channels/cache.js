// modules/channels/cache.js
// Gestión de cache Redis para Channels

import { getCache, setCache, deleteCache } from '../../db/redis/client.js';
import logger from '../../utils/logger.js';

const CHANNEL_LIST_CACHE_PREFIX = 'ec:channels:list:';
const CHANNEL_LIST_CACHE_TTL = 600; // 10 minutos

/**
 * Cachear lista de channels
 * @param {string} cacheKey - Clave única del cache basada en filtros
 * @param {Object} data - Datos a cachear
 */
export const cacheChannelList = async (cacheKey, data) => {
    try {
        const fullKey = `${CHANNEL_LIST_CACHE_PREFIX}${cacheKey}`;
        await setCache(fullKey, JSON.stringify(data), CHANNEL_LIST_CACHE_TTL);
        logger.debug({ cacheKey: fullKey }, 'Channel list cached');
    } catch (error) {
        logger.error({ err: error, cacheKey }, 'Error caching channel list');
    }
};

/**
 * Obtener lista de channels cacheada
 * @param {string} cacheKey - Clave única del cache
 * @returns {Promise<Object|null>} - Datos cacheados o null
 */
export const getCachedChannelList = async (cacheKey) => {
    try {
        const fullKey = `${CHANNEL_LIST_CACHE_PREFIX}${cacheKey}`;
        const cached = await getCache(fullKey);
        
        if (cached) {
            logger.debug({ cacheKey: fullKey }, 'Channel list cache hit');
            return JSON.parse(cached);
        }
        
        logger.debug({ cacheKey: fullKey }, 'Channel list cache miss');
        return null;
    } catch (error) {
        logger.error({ err: error, cacheKey }, 'Error getting cached channel list');
        return null;
    }
};

/**
 * Invalidar cache de listas de channels
 * Invalida todos los caches que comienzan con el prefijo
 */
export const invalidateChannelCache = async () => {
    try {
        // En Redis, buscamos todas las keys que comienzan con el prefijo y las eliminamos
        // Esto requiere escanear las keys del patrón
        await deleteCache(`${CHANNEL_LIST_CACHE_PREFIX}*`);
        logger.debug('Channel list cache invalidated');
    } catch (error) {
        logger.error({ err: error }, 'Error invalidating channel cache');
    }
};
