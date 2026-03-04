// modules/devices/cache.js
// Gestión de cache Redis para Devices

import { getCache, setCache, deleteCache, scanAndDelete } from '../../db/redis/client.js';
import logger from '../../utils/logger.js';

// v2: Nueva estructura de respuesta con items[] en lugar de devices[]
const DEVICE_LIST_CACHE_PREFIX = 'ec:v2:devices:list:';
const DEVICE_LIST_CACHE_TTL = 600; // 10 minutos

/**
 * Cachear lista de devices
 * @param {string} cacheKey - Clave única del cache basada en filtros
 * @param {Object} data - Datos a cachear
 */
export const cacheDeviceList = async (cacheKey, data) => {
    try {
        const fullKey = `${DEVICE_LIST_CACHE_PREFIX}${cacheKey}`;
        await setCache(fullKey, data, DEVICE_LIST_CACHE_TTL);
        logger.debug({ cacheKey: fullKey }, 'Device list cached');
    } catch (error) {
        logger.error({ err: error, cacheKey }, 'Error caching device list');
    }
};

/**
 * Obtener lista de devices cacheada
 * @param {string} cacheKey - Clave única del cache
 * @returns {Promise<Object|null>} - Datos cacheados o null
 */
export const getCachedDeviceList = async (cacheKey) => {
    try {
        const fullKey = `${DEVICE_LIST_CACHE_PREFIX}${cacheKey}`;
        const cached = await getCache(fullKey);
        
        if (cached) {
            const parsed = typeof cached === 'object' ? cached : JSON.parse(cached);
            if (!parsed.items && parsed.devices) {
                logger.debug({ cacheKey: fullKey }, 'Device list cache has legacy structure, invalidating');
                await deleteCache(fullKey);
                return null;
            }
            logger.debug({ cacheKey: fullKey }, 'Device list cache hit');
            return parsed;
        }
        
        logger.debug({ cacheKey: fullKey }, 'Device list cache miss');
        return null;
    } catch (error) {
        logger.error({ err: error, cacheKey }, 'Error getting cached device list');
        return null;
    }
};

/**
 * Invalidar cache de listas de devices
 * Invalida todos los caches que comienzan con el prefijo
 */
export const invalidateDeviceCache = async () => {
    try {
        // En Redis, buscamos todas las keys que comienzan con el prefijo y las eliminamos
        // Esto requiere escanear las keys del patrón
        await scanAndDelete(`${DEVICE_LIST_CACHE_PREFIX}*`);
        logger.debug('Device list cache invalidated');
    } catch (error) {
        logger.error({ err: error }, 'Error invalidating device cache');
    }
};
