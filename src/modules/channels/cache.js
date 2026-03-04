// modules/channels/cache.js
// Gestión de cache Redis para Channels

import { getCache, setCache, deleteCache, scanAndDelete } from '../../db/redis/client.js';
import logger from '../../utils/logger.js';

// v2: Nueva estructura de respuesta con items[] en lugar de channels[]
const CHANNEL_LIST_CACHE_PREFIX = 'ec:v2:channels:list:';
const CHANNEL_LIST_CACHE_TTL = 600; // 10 minutos

/**
 * Cachear lista de channels
 * @param {string} cacheKey - Clave única del cache basada en filtros
 * @param {Object} data - Datos a cachear
 */
export const cacheChannelList = async (cacheKey, data) => {
    try {
        const fullKey = `${CHANNEL_LIST_CACHE_PREFIX}${cacheKey}`;
        await setCache(fullKey, data, CHANNEL_LIST_CACHE_TTL);
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
            const parsed = typeof cached === 'object' ? cached : JSON.parse(cached);
            // Validar estructura nueva (items) - si tiene estructura legacy (channels), invalidar
            if (!parsed.items && parsed.channels) {
                logger.debug({ cacheKey: fullKey }, 'Channel list cache has legacy structure, invalidating');
                await deleteCache(fullKey);
                return null;
            }
            logger.debug({ cacheKey: fullKey }, 'Channel list cache hit');
            return parsed;
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
        await scanAndDelete(`${CHANNEL_LIST_CACHE_PREFIX}*`);
        logger.debug('Channel list cache invalidated');
    } catch (error) {
        logger.error({ err: error }, 'Error invalidating channel cache');
    }
};
