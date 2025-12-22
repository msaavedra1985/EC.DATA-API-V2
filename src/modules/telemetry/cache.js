/**
 * Cache de Telemetría - Gestión de cache Redis para módulo de telemetría
 * 
 * Prefijos usados:
 * - tm:resolve:{identifier} - Resolución de identificador de canal
 * - tm:meta:{channelId}:{lang} - Metadata completa del canal
 * - tm:vars:global:{lang} - Variables globales (casi nunca cambian)
 * - tm:mtypes:global:{lang} - Measurement types globales
 * - tm:latest:{channelId} - Último dato de telemetría
 * - tm:data:{channelId}:{from}:{to}:{res} - Datos históricos agregados
 */

import { getCache, setCache, deleteCache, scanAndDelete } from '../../db/redis/client.js';
import logger from '../../utils/logger.js';

// Prefijos de cache
const CACHE_PREFIX = 'ec:tm:';

// TTLs en segundos
const TTL = {
    RESOLVE: 600,           // 10 min - resolución de identificador
    METADATA: 600,          // 10 min - metadata de canal
    GLOBAL_VARS: 86400,     // 24 horas - variables globales (casi nunca cambian)
    GLOBAL_MTYPES: 86400,   // 24 horas - measurement types (casi nunca cambian)
    LATEST: 30,             // 30 seg - último dato (polling frecuente)
    DATA_DAILY: 3600,       // 1 hora - datos diarios
    DATA_MONTHLY: 86400,    // 24 horas - datos mensuales
};

/**
 * Construye la clave de cache con prefijo
 * @param {string} type - Tipo de cache (resolve, meta, vars, etc)
 * @param {...string} parts - Partes adicionales de la clave
 * @returns {string} Clave completa
 */
const buildKey = (type, ...parts) => {
    return `${CACHE_PREFIX}${type}:${parts.join(':')}`;
};

// ============================================
// RESOLUCIÓN DE IDENTIFICADOR
// ============================================

/**
 * Cachea el resultado de resolución de identificador
 * @param {string} identifierKey - Clave única del identificador (ej: "publicCode:CHN-5Q775-2")
 * @param {Object} resolved - Datos resueltos (channelId, etc)
 */
export const cacheResolvedIdentifier = async (identifierKey, resolved) => {
    try {
        const key = buildKey('resolve', identifierKey);
        await setCache(key, resolved, TTL.RESOLVE);
        logger.debug({ key }, 'Identifier resolution cached');
    } catch (error) {
        logger.error({ err: error, identifierKey }, 'Error caching identifier resolution');
    }
};

/**
 * Obtiene resolución de identificador cacheada
 * @param {string} identifierKey - Clave única del identificador
 * @returns {Promise<Object|null>}
 */
export const getCachedResolvedIdentifier = async (identifierKey) => {
    try {
        const key = buildKey('resolve', identifierKey);
        const cached = await getCache(key);
        if (cached) {
            logger.debug({ key }, 'Identifier resolution cache hit');
            return cached;
        }
        return null;
    } catch (error) {
        logger.error({ err: error, identifierKey }, 'Error getting cached identifier');
        return null;
    }
};

// ============================================
// METADATA DE CANAL
// ============================================

/**
 * Cachea metadata de canal
 * @param {string} channelId - UUID del canal
 * @param {string} lang - Idioma
 * @param {Object} metadata - Metadata del canal
 */
export const cacheChannelMetadata = async (channelId, lang, metadata) => {
    try {
        const key = buildKey('meta', channelId, lang);
        await setCache(key, metadata, TTL.METADATA);
        logger.debug({ key }, 'Channel metadata cached');
    } catch (error) {
        logger.error({ err: error, channelId }, 'Error caching channel metadata');
    }
};

/**
 * Obtiene metadata de canal cacheada
 * @param {string} channelId - UUID del canal
 * @param {string} lang - Idioma
 * @returns {Promise<Object|null>}
 */
export const getCachedChannelMetadata = async (channelId, lang) => {
    try {
        const key = buildKey('meta', channelId, lang);
        const cached = await getCache(key);
        if (cached) {
            logger.debug({ key }, 'Channel metadata cache hit');
            return cached;
        }
        return null;
    } catch (error) {
        logger.error({ err: error, channelId }, 'Error getting cached metadata');
        return null;
    }
};

// ============================================
// VARIABLES Y MEASUREMENT TYPES GLOBALES
// ============================================

/**
 * Cachea variables globales (todas las variables con traducciones)
 * @param {string} lang - Idioma
 * @param {Object} variables - Mapa de variables
 */
export const cacheGlobalVariables = async (lang, variables) => {
    try {
        const key = buildKey('vars', 'global', lang);
        await setCache(key, variables, TTL.GLOBAL_VARS);
        logger.debug({ key, count: Object.keys(variables).length }, 'Global variables cached');
    } catch (error) {
        logger.error({ err: error }, 'Error caching global variables');
    }
};

/**
 * Obtiene variables globales cacheadas
 * @param {string} lang - Idioma
 * @returns {Promise<Object|null>}
 */
export const getCachedGlobalVariables = async (lang) => {
    try {
        const key = buildKey('vars', 'global', lang);
        return await getCache(key);
    } catch (error) {
        logger.error({ err: error }, 'Error getting cached global variables');
        return null;
    }
};

/**
 * Cachea measurement types globales
 * @param {string} lang - Idioma
 * @param {Object} types - Mapa de measurement types
 */
export const cacheGlobalMeasurementTypes = async (lang, types) => {
    try {
        const key = buildKey('mtypes', 'global', lang);
        await setCache(key, types, TTL.GLOBAL_MTYPES);
        logger.debug({ key, count: Object.keys(types).length }, 'Global measurement types cached');
    } catch (error) {
        logger.error({ err: error }, 'Error caching global measurement types');
    }
};

/**
 * Obtiene measurement types globales cacheados
 * @param {string} lang - Idioma
 * @returns {Promise<Object|null>}
 */
export const getCachedGlobalMeasurementTypes = async (lang) => {
    try {
        const key = buildKey('mtypes', 'global', lang);
        return await getCache(key);
    } catch (error) {
        logger.error({ err: error }, 'Error getting cached measurement types');
        return null;
    }
};

// ============================================
// ÚLTIMO DATO (REALTIME/POLLING)
// ============================================

/**
 * Cachea último dato de telemetría
 * @param {string} channelId - UUID del canal
 * @param {Object} data - Datos del último registro
 */
export const cacheLatestData = async (channelId, data) => {
    try {
        const key = buildKey('latest', channelId);
        await setCache(key, data, TTL.LATEST);
        logger.debug({ key }, 'Latest data cached');
    } catch (error) {
        logger.error({ err: error, channelId }, 'Error caching latest data');
    }
};

/**
 * Obtiene último dato cacheado
 * @param {string} channelId - UUID del canal
 * @returns {Promise<Object|null>}
 */
export const getCachedLatestData = async (channelId) => {
    try {
        const key = buildKey('latest', channelId);
        return await getCache(key);
    } catch (error) {
        logger.error({ err: error, channelId }, 'Error getting cached latest data');
        return null;
    }
};

// ============================================
// DATOS HISTÓRICOS AGREGADOS
// ============================================

/**
 * Cachea datos históricos agregados
 * @param {string} channelId - UUID del canal
 * @param {string} from - Fecha inicio
 * @param {string} to - Fecha fin
 * @param {string} resolution - Resolución (daily, monthly)
 * @param {Object} data - Datos históricos
 */
export const cacheHistoricalData = async (channelId, from, to, resolution, data) => {
    try {
        const key = buildKey('data', channelId, from, to, resolution);
        const ttl = resolution === 'monthly' ? TTL.DATA_MONTHLY : TTL.DATA_DAILY;
        await setCache(key, data, ttl);
        logger.debug({ key, resolution }, 'Historical data cached');
    } catch (error) {
        logger.error({ err: error, channelId }, 'Error caching historical data');
    }
};

/**
 * Obtiene datos históricos cacheados
 * @param {string} channelId - UUID del canal
 * @param {string} from - Fecha inicio
 * @param {string} to - Fecha fin
 * @param {string} resolution - Resolución
 * @returns {Promise<Object|null>}
 */
export const getCachedHistoricalData = async (channelId, from, to, resolution) => {
    try {
        const key = buildKey('data', channelId, from, to, resolution);
        return await getCache(key);
    } catch (error) {
        logger.error({ err: error, channelId }, 'Error getting cached historical data');
        return null;
    }
};

// ============================================
// INVALIDACIÓN DE CACHE
// ============================================

/**
 * Invalida cache de un canal específico
 * @param {string} channelId - UUID del canal
 */
export const invalidateChannelTelemetryCache = async (channelId) => {
    try {
        await Promise.all([
            scanAndDelete(`${CACHE_PREFIX}meta:${channelId}:*`),
            scanAndDelete(`${CACHE_PREFIX}latest:${channelId}`),
            scanAndDelete(`${CACHE_PREFIX}data:${channelId}:*`),
        ]);
        logger.debug({ channelId }, 'Channel telemetry cache invalidated');
    } catch (error) {
        logger.error({ err: error, channelId }, 'Error invalidating channel cache');
    }
};

/**
 * Invalida cache de telemetría de todos los canales de un device
 * Busca en la BD los canales asociados y los invalida
 * @param {string} deviceId - UUID del device
 */
export const invalidateDeviceTelemetryCache = async (deviceId) => {
    try {
        // Importación dinámica para evitar dependencia circular
        const { default: Channel } = await import('../channels/models/Channel.js');
        
        // Obtener todos los canales del device
        const channels = await Channel.findAll({
            where: { device_id: deviceId },
            attributes: ['id'],
            paranoid: false // Incluir soft-deleted para limpiar cache de todos
        });
        
        // Invalidar cache de cada canal
        await Promise.all(
            channels.map(ch => invalidateChannelTelemetryCache(ch.id))
        );
        
        // También invalidar cache de resolución que pueda tener el device
        await invalidateAllResolveCache();
        
        logger.debug({ deviceId, channelsCount: channels.length }, 'Device telemetry cache invalidated');
    } catch (error) {
        logger.error({ err: error, deviceId }, 'Error invalidating device telemetry cache');
    }
};

/**
 * Invalida cache de resolución para un identificador
 * @param {string} identifierKey - Clave del identificador
 */
export const invalidateResolveCache = async (identifierKey) => {
    try {
        await deleteCache(buildKey('resolve', identifierKey));
        logger.debug({ identifierKey }, 'Resolve cache invalidated');
    } catch (error) {
        logger.error({ err: error }, 'Error invalidating resolve cache');
    }
};

/**
 * Invalida toda la cache de resolución (para actualizaciones masivas)
 */
export const invalidateAllResolveCache = async () => {
    try {
        await scanAndDelete(`${CACHE_PREFIX}resolve:*`);
        logger.debug('All resolve cache invalidated');
    } catch (error) {
        logger.error({ err: error }, 'Error invalidating all resolve cache');
    }
};

/**
 * Invalida cache de variables globales
 */
export const invalidateGlobalVariablesCache = async () => {
    try {
        await scanAndDelete(`${CACHE_PREFIX}vars:global:*`);
        logger.debug('Global variables cache invalidated');
    } catch (error) {
        logger.error({ err: error }, 'Error invalidating global variables cache');
    }
};

/**
 * Invalida cache de measurement types globales
 */
export const invalidateGlobalMeasurementTypesCache = async () => {
    try {
        await scanAndDelete(`${CACHE_PREFIX}mtypes:global:*`);
        logger.debug('Global measurement types cache invalidated');
    } catch (error) {
        logger.error({ err: error }, 'Error invalidating global measurement types cache');
    }
};

/**
 * Invalida TODA la cache de telemetría (usar con precaución)
 */
export const invalidateAllTelemetryCache = async () => {
    try {
        await scanAndDelete(`${CACHE_PREFIX}*`);
        logger.info('All telemetry cache invalidated');
    } catch (error) {
        logger.error({ err: error }, 'Error invalidating all telemetry cache');
    }
};

// Exportar TTLs para uso externo si es necesario
export { TTL as TELEMETRY_CACHE_TTL };

export default {
    // Resolve
    cacheResolvedIdentifier,
    getCachedResolvedIdentifier,
    // Metadata
    cacheChannelMetadata,
    getCachedChannelMetadata,
    // Global
    cacheGlobalVariables,
    getCachedGlobalVariables,
    cacheGlobalMeasurementTypes,
    getCachedGlobalMeasurementTypes,
    // Latest
    cacheLatestData,
    getCachedLatestData,
    // Historical
    cacheHistoricalData,
    getCachedHistoricalData,
    // Invalidation
    invalidateChannelTelemetryCache,
    invalidateDeviceTelemetryCache,
    invalidateResolveCache,
    invalidateAllResolveCache,
    invalidateGlobalVariablesCache,
    invalidateGlobalMeasurementTypesCache,
    invalidateAllTelemetryCache,
};
