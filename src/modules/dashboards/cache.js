// modules/dashboards/cache.js
// Gestión de cache Redis para Dashboards

import { getCache, setCache, deleteCache } from '../../db/redis/client.js';
import logger from '../../utils/logger.js';

const DASHBOARD_LIST_CACHE_PREFIX = 'ec:v1:dashboards:list:';
const DASHBOARD_LIST_CACHE_TTL = 600; // 10 minutos

const GROUP_LIST_CACHE_PREFIX = 'ec:v1:dashboard-groups:list:';
const GROUP_LIST_CACHE_TTL = 600;

/**
 * Cachear lista de dashboards
 * @param {string} cacheKey - Clave única del cache basada en filtros
 * @param {Object} data - Datos a cachear
 */
export const cacheDashboardList = async (cacheKey, data) => {
    try {
        const fullKey = `${DASHBOARD_LIST_CACHE_PREFIX}${cacheKey}`;
        await setCache(fullKey, JSON.stringify(data), DASHBOARD_LIST_CACHE_TTL);
        logger.debug({ cacheKey: fullKey }, 'Dashboard list cached');
    } catch (error) {
        logger.error({ err: error, cacheKey }, 'Error caching dashboard list');
    }
};

/**
 * Obtener lista de dashboards cacheada
 * @param {string} cacheKey - Clave única del cache
 * @returns {Promise<Object|null>} - Datos cacheados o null
 */
export const getCachedDashboardList = async (cacheKey) => {
    try {
        const fullKey = `${DASHBOARD_LIST_CACHE_PREFIX}${cacheKey}`;
        const cached = await getCache(fullKey);

        if (cached) {
            const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
            logger.debug({ cacheKey: fullKey }, 'Dashboard list cache hit');
            return parsed;
        }

        logger.debug({ cacheKey: fullKey }, 'Dashboard list cache miss');
        return null;
    } catch (error) {
        logger.error({ err: error, cacheKey }, 'Error getting cached dashboard list');
        return null;
    }
};

/**
 * Invalidar cache de listas de dashboards
 * Invalida todos los caches que comienzan con el prefijo
 */
export const invalidateDashboardCache = async () => {
    try {
        await deleteCache(`${DASHBOARD_LIST_CACHE_PREFIX}*`);
        logger.debug('Dashboard list cache invalidated');
    } catch (error) {
        logger.error({ err: error }, 'Error invalidating dashboard cache');
    }
};

/**
 * Cachear lista de grupos de dashboards
 * @param {string} cacheKey - Clave única del cache basada en filtros
 * @param {Object} data - Datos a cachear
 */
export const cacheGroupList = async (cacheKey, data) => {
    try {
        const fullKey = `${GROUP_LIST_CACHE_PREFIX}${cacheKey}`;
        await setCache(fullKey, JSON.stringify(data), GROUP_LIST_CACHE_TTL);
        logger.debug({ cacheKey: fullKey }, 'Dashboard group list cached');
    } catch (error) {
        logger.error({ err: error, cacheKey }, 'Error caching dashboard group list');
    }
};

/**
 * Obtener lista de grupos de dashboards cacheada
 * @param {string} cacheKey - Clave única del cache
 * @returns {Promise<Object|null>} - Datos cacheados o null
 */
export const getCachedGroupList = async (cacheKey) => {
    try {
        const fullKey = `${GROUP_LIST_CACHE_PREFIX}${cacheKey}`;
        const cached = await getCache(fullKey);

        if (cached) {
            const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
            logger.debug({ cacheKey: fullKey }, 'Dashboard group list cache hit');
            return parsed;
        }

        logger.debug({ cacheKey: fullKey }, 'Dashboard group list cache miss');
        return null;
    } catch (error) {
        logger.error({ err: error, cacheKey }, 'Error getting cached dashboard group list');
        return null;
    }
};

/**
 * Invalidar cache de listas de grupos de dashboards
 * Invalida todos los caches que comienzan con el prefijo
 */
export const invalidateGroupCache = async () => {
    try {
        await deleteCache(`${GROUP_LIST_CACHE_PREFIX}*`);
        logger.debug('Dashboard group list cache invalidated');
    } catch (error) {
        logger.error({ err: error }, 'Error invalidating dashboard group cache');
    }
};
