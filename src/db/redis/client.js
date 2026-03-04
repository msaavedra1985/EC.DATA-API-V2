// Cliente Redis para cache y sesiones
// Resiliencia: reconexión automática, fallback en memoria, health check periódico
import { createClient } from 'redis';
import { config } from '../../config/env.js';
import { dbLogger } from '../../utils/logger.js';

// Prefijo global basado en entorno: DEV:EC: | PROD:EC: | TEST:EC:
const ENV_TAG = config.env === 'production' ? 'PROD' : config.env === 'test' ? 'TEST' : 'DEV';
export const REDIS_KEY_PREFIX = `${ENV_TAG}:EC:`;

const addPrefix = (key) => key.startsWith(REDIS_KEY_PREFIX) ? key : `${REDIS_KEY_PREFIX}${key}`;

let redisClient = null;
let isRedisAvailable = false;
let reconnectTimer = null;
let healthCheckTimer = null;
let isReconnecting = false;
let isShuttingDown = false;

const RECONNECT_INTERVAL_MS = 30_000;
const HEALTH_CHECK_INTERVAL_MS = 60_000;
const PING_TIMEOUT_MS = 5_000;

const inMemoryCache = new Map();
const inMemoryTTLs = new Map();

const buildClientConfig = () => {
    const socketOpts = {
        reconnectStrategy: false,
        connectTimeout: 10_000,
    };

    if (config.redis.url) {
        return { url: config.redis.url, socket: socketOpts };
    }

    return {
        socket: {
            host: config.redis.host,
            port: config.redis.port,
            ...socketOpts,
        },
        ...(config.redis.password && { password: config.redis.password }),
    };
};

const activateFallback = (reason) => {
    const wasAvailable = isRedisAvailable;
    isRedisAvailable = false;
    if (wasAvailable) {
        dbLogger.warn({ reason }, 'Redis no disponible - activando fallback en memoria');
        stopHealthCheck();
    }
    scheduleReconnect();
};

const deactivateFallback = () => {
    isRedisAvailable = true;
    clearReconnectTimer();
    startHealthCheck();
    dbLogger.info('Redis disponible - desactivando fallback en memoria');
};

const scheduleReconnect = () => {
    if (isShuttingDown || reconnectTimer) return;
    reconnectTimer = setTimeout(attemptReconnect, RECONNECT_INTERVAL_MS);
    dbLogger.debug(
        { nextAttemptIn: `${RECONNECT_INTERVAL_MS / 1000}s` },
        'Reconexión Redis programada'
    );
};

const clearReconnectTimer = () => {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
};

const attemptReconnect = async () => {
    reconnectTimer = null;
    if (isShuttingDown || isReconnecting || isRedisAvailable) return;

    isReconnecting = true;
    dbLogger.info('Intentando reconexión Redis...');

    try {
        if (redisClient) {
            try { await redisClient.disconnect(); } catch { /* ignorar */ }
            redisClient = null;
        }

        redisClient = createClient(buildClientConfig());
        attachListeners(redisClient);
        await redisClient.connect();

        dbLogger.info('Reconexión Redis exitosa');
    } catch (error) {
        dbLogger.warn(
            { error: error.message },
            'Reconexión Redis fallida - reintentando más tarde'
        );
        redisClient = null;
        isRedisAvailable = false;
        scheduleReconnect();
    } finally {
        isReconnecting = false;
    }
};

const attachListeners = (client) => {
    client.on('error', (err) => {
        dbLogger.error({ error: err.message, code: err.code }, 'Redis client error');
        activateFallback(`client error: ${err.message}`);
    });

    client.on('connect', () => {
        dbLogger.info('Redis connected');
    });

    client.on('ready', () => {
        dbLogger.info('Redis client ready');
        deactivateFallback();
    });

    client.on('end', () => {
        dbLogger.warn('Redis connection ended');
        activateFallback('connection ended');
    });
};

const startHealthCheck = () => {
    if (healthCheckTimer) return;
    healthCheckTimer = setInterval(async () => {
        if (isShuttingDown || !isRedisAvailable || !redisClient) return;

        try {
            const result = await Promise.race([
                redisClient.ping(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('PING timeout')), PING_TIMEOUT_MS)
                ),
            ]);

            if (result !== 'PONG') {
                activateFallback('PING returned unexpected response');
            }
        } catch (error) {
            dbLogger.error({ error: error.message }, 'Redis health check failed');
            activateFallback(`health check failed: ${error.message}`);
        }
    }, HEALTH_CHECK_INTERVAL_MS);
};

const stopHealthCheck = () => {
    if (healthCheckTimer) {
        clearInterval(healthCheckTimer);
        healthCheckTimer = null;
    }
};

export const initializeRedis = async () => {
    try {
        redisClient = createClient(buildClientConfig());
        attachListeners(redisClient);
        await redisClient.connect();
        startHealthCheck();
    } catch (error) {
        if (config.env === 'development') {
            dbLogger.warn(
                { error: error.message, code: error.code },
                'Redis no disponible - arrancando con fallback en memoria'
            );
            isRedisAvailable = false;
            redisClient = null;
            scheduleReconnect();
        } else {
            dbLogger.error(
                { error: error.message, code: error.code, stack: error.stack },
                'Redis initialization failed'
            );
            throw error;
        }
    }
};

export const closeRedis = async () => {
    isShuttingDown = true;
    clearReconnectTimer();
    stopHealthCheck();

    if (redisClient) {
        try {
            await redisClient.quit();
            dbLogger.info('Redis connection closed');
        } catch (error) {
            dbLogger.error(error, 'Error closing Redis');
        }
    }
};

export const getRedisStatus = () => ({
    connected: isRedisAvailable,
    mode: isRedisAvailable ? 'redis' : 'in-memory',
    reconnecting: isReconnecting,
    healthCheckActive: !!healthCheckTimer,
    inMemoryKeys: isRedisAvailable ? null : inMemoryCache.size,
});

const cleanExpiredMemoryCache = () => {
    const now = Date.now();
    for (const [key, expireAt] of inMemoryTTLs.entries()) {
        if (expireAt && expireAt < now) {
            inMemoryCache.delete(key);
            inMemoryTTLs.delete(key);
        }
    }
};

export const getCache = async key => {
    const prefixedKey = addPrefix(key);
    if (!isRedisAvailable) {
        cleanExpiredMemoryCache();
        return inMemoryCache.get(prefixedKey) || null;
    }

    try {
        const value = await redisClient.get(prefixedKey);
        if (!value) return null;

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    } catch (error) {
        dbLogger.error(error, 'Redis GET error');
        activateFallback(`GET error: ${error.message}`);
        return null;
    }
};

export const setCache = async (key, value, ttl = null) => {
    const prefixedKey = addPrefix(key);
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    if (!isRedisAvailable) {
        inMemoryCache.set(prefixedKey, value);
        if (ttl) {
            inMemoryTTLs.set(prefixedKey, Date.now() + (ttl * 1000));
        } else {
            inMemoryTTLs.delete(prefixedKey);
        }
        return true;
    }

    try {
        if (ttl) {
            await redisClient.setEx(prefixedKey, ttl, serializedValue);
        } else {
            await redisClient.set(prefixedKey, serializedValue);
        }
        return true;
    } catch (error) {
        dbLogger.error(error, 'Redis SET error');
        activateFallback(`SET error: ${error.message}`);
        inMemoryCache.set(prefixedKey, value);
        if (ttl) {
            inMemoryTTLs.set(prefixedKey, Date.now() + (ttl * 1000));
        }
        return true;
    }
};

export const deleteCache = async key => {
    const prefixedKey = addPrefix(key);
    if (!isRedisAvailable) {
        inMemoryCache.delete(prefixedKey);
        inMemoryTTLs.delete(prefixedKey);
        return true;
    }

    try {
        await redisClient.del(prefixedKey);
        return true;
    } catch (error) {
        dbLogger.error(error, 'Redis DEL error');
        activateFallback(`DEL error: ${error.message}`);
        return false;
    }
};

export const getAndDeleteCache = async key => {
    const prefixedKey = addPrefix(key);
    if (!isRedisAvailable) {
        cleanExpiredMemoryCache();
        const value = inMemoryCache.get(prefixedKey) || null;
        inMemoryCache.delete(prefixedKey);
        inMemoryTTLs.delete(prefixedKey);
        return value;
    }

    try {
        const value = await redisClient.get(prefixedKey);
        if (!value) return null;
        await redisClient.del(prefixedKey);
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    } catch (error) {
        dbLogger.error(error, 'Redis GET+DEL error');
        activateFallback(`GET+DEL error: ${error.message}`);
        return null;
    }
};

/**
 * Incrementa atómicamente un contador en Redis y establece TTL solo en la primera creación
 * Usa INCR + EXPIRE para operaciones atómicas y race-free
 * @param {string} key - Clave de Redis
 * @param {number} ttl - TTL en segundos (solo se aplica cuando el key es nuevo)
 * @returns {Promise<number>} Nuevo valor del contador
 */
export const incrWithTTL = async (key, ttl) => {
    const prefixedKey = addPrefix(key);
    if (!isRedisAvailable) {
        cleanExpiredMemoryCache();
        const current = inMemoryCache.get(prefixedKey) || 0;
        const newVal = current + 1;
        inMemoryCache.set(prefixedKey, newVal);
        if (!inMemoryTTLs.has(prefixedKey)) {
            inMemoryTTLs.set(prefixedKey, Date.now() + (ttl * 1000));
        }
        return newVal;
    }

    try {
        const newCount = await redisClient.incr(prefixedKey);
        if (newCount === 1) {
            await redisClient.expire(prefixedKey, ttl);
        }
        return newCount;
    } catch (error) {
        dbLogger.error(error, 'Redis INCR error');
        activateFallback(`INCR error: ${error.message}`);
        const current = inMemoryCache.get(prefixedKey) || 0;
        const newVal = current + 1;
        inMemoryCache.set(prefixedKey, newVal);
        if (!inMemoryTTLs.has(prefixedKey)) {
            inMemoryTTLs.set(prefixedKey, Date.now() + (ttl * 1000));
        }
        return newVal;
    }
};

export const isConnected = () => isRedisAvailable;

// Las funciones withPrefix ya no son necesarias (addPrefix se aplica globalmente)
// Se mantienen como aliases para compatibilidad
export const getCacheWithPrefix = getCache;
export const setCacheWithPrefix = setCache;
export const deleteCacheWithPrefix = deleteCache;

export const scanAndDelete = async (pattern) => {
    const prefixedPattern = addPrefix(pattern);
    if (!isRedisAvailable) {
        cleanExpiredMemoryCache();
        let count = 0;
        const regex = new RegExp('^' + prefixedPattern.replace(/\*/g, '.*') + '$');

        for (const key of inMemoryCache.keys()) {
            if (regex.test(key)) {
                inMemoryCache.delete(key);
                inMemoryTTLs.delete(key);
                count++;
            }
        }

        dbLogger.debug({ pattern: prefixedPattern, count }, 'In-memory cache pattern deletion');
        return count;
    }

    try {
        let cursor = 0;
        let deletedCount = 0;
        const keysToDelete = [];

        do {
            const result = await redisClient.scan(cursor, {
                MATCH: prefixedPattern,
                COUNT: 100
            });

            cursor = Number(result.cursor);
            const keys = result.keys;

            if (keys.length > 0) {
                keysToDelete.push(...keys);
            }
        } while (cursor !== 0);

        if (keysToDelete.length > 0) {
            await redisClient.del(keysToDelete);
            deletedCount = keysToDelete.length;
        }

        dbLogger.debug({ pattern, deletedCount }, 'Redis pattern deletion completed');
        return deletedCount;
    } catch (error) {
        dbLogger.error({ err: error, pattern: prefixedPattern }, 'Redis SCAN+DEL error');
        activateFallback(`SCAN+DEL error: ${error.message}`);
        return 0;
    }
};

export default redisClient;
