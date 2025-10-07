// Cliente Redis para cache y sesiones
import { createClient } from 'redis';
import { config } from '../../config/env.js';
import { dbLogger } from '../../utils/logger.js';

/**
 * Cliente Redis para cache de CORS origins, rate limiting, sesiones, etc.
 * Configuración con fallback si Redis no está disponible en desarrollo
 */

let redisClient = null;
let isRedisAvailable = false;

// Fallback en memoria para desarrollo (cuando Redis no está disponible)
const inMemoryCache = new Map();
const inMemoryTTLs = new Map();

/**
 * Inicializa el cliente Redis
 * @returns {Promise<void>}
 */
export const initializeRedis = async () => {
    try {
        // Crear cliente con URL o credenciales individuales
        const clientConfig = config.redis.url
            ? { 
                url: config.redis.url,
                socket: {
                    reconnectStrategy: false, // No reintentar automáticamente
                    connectTimeout: 10000, // Timeout de 10 segundos
                }
            }
            : {
                socket: {
                    host: config.redis.host,
                    port: config.redis.port,
                    reconnectStrategy: false, // No reintentar automáticamente
                    connectTimeout: 10000, // Timeout de 10 segundos
                },
                ...(config.redis.password && { password: config.redis.password }),
            };

        redisClient = createClient(clientConfig);

        // Manejo de errores con logging detallado
        redisClient.on('error', (err) => {
            dbLogger.error({ error: err.message, code: err.code }, '❌ Redis client error');
            isRedisAvailable = false;
        });

        redisClient.on('connect', () => {
            dbLogger.info('✅ Redis connected successfully');
            isRedisAvailable = true;
        });

        redisClient.on('ready', () => {
            dbLogger.info('✅ Redis client ready');
        });

        // Conectar con timeout
        await redisClient.connect();
    } catch (error) {
        // En desarrollo, Redis es opcional
        if (config.env === 'development') {
            dbLogger.warn({ 
                error: error.message, 
                code: error.code 
            }, '⚠️  Redis not available - Running with in-memory fallback');
            isRedisAvailable = false;
            redisClient = null; // Limpiar cliente fallido
        } else {
            dbLogger.error({ 
                error: error.message, 
                code: error.code,
                stack: error.stack 
            }, '❌ Redis initialization failed');
            throw error; // En producción, Redis es obligatorio
        }
    }
};

/**
 * Cierra la conexión Redis (graceful shutdown)
 * @returns {Promise<void>}
 */
export const closeRedis = async () => {
    if (redisClient && isRedisAvailable) {
        try {
            await redisClient.quit();
            dbLogger.info('✅ Redis connection closed');
        } catch (error) {
            dbLogger.error(error, '❌ Error closing Redis');
        }
    }
};

/**
 * Limpia entradas expiradas del cache en memoria
 */
const cleanExpiredMemoryCache = () => {
    const now = Date.now();
    for (const [key, expireAt] of inMemoryTTLs.entries()) {
        if (expireAt && expireAt < now) {
            inMemoryCache.delete(key);
            inMemoryTTLs.delete(key);
        }
    }
};

/**
 * Obtiene un valor del cache
 * @param {string} key - Clave del cache
 * @returns {Promise<string|null>}
 */
export const getCache = async key => {
    // Fallback en memoria si Redis no está disponible
    if (!isRedisAvailable) {
        cleanExpiredMemoryCache();
        return inMemoryCache.get(key) || null;
    }
    
    try {
        return await redisClient.get(key);
    } catch (error) {
        dbLogger.error(error, 'Redis GET error');
        return null;
    }
};

/**
 * Establece un valor en el cache con TTL opcional
 * @param {string} key - Clave del cache
 * @param {string} value - Valor a almacenar
 * @param {number} ttl - Tiempo de vida en segundos (opcional)
 * @returns {Promise<boolean>}
 */
export const setCache = async (key, value, ttl = null) => {
    // Fallback en memoria si Redis no está disponible
    if (!isRedisAvailable) {
        inMemoryCache.set(key, value);
        if (ttl) {
            const expireAt = Date.now() + (ttl * 1000);
            inMemoryTTLs.set(key, expireAt);
        } else {
            inMemoryTTLs.delete(key);
        }
        return true;
    }
    
    try {
        if (ttl) {
            await redisClient.setEx(key, ttl, value);
        } else {
            await redisClient.set(key, value);
        }
        return true;
    } catch (error) {
        dbLogger.error(error, 'Redis SET error');
        return false;
    }
};

/**
 * Elimina una clave del cache
 * @param {string} key - Clave a eliminar
 * @returns {Promise<boolean>}
 */
export const deleteCache = async key => {
    // Fallback en memoria si Redis no está disponible
    if (!isRedisAvailable) {
        inMemoryCache.delete(key);
        inMemoryTTLs.delete(key);
        return true;
    }
    
    try {
        await redisClient.del(key);
        return true;
    } catch (error) {
        dbLogger.error(error, 'Redis DEL error');
        return false;
    }
};

/**
 * Verifica si Redis está disponible
 * @returns {boolean}
 */
export const isConnected = () => isRedisAvailable;

export default redisClient;
