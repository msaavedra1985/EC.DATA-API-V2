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
                    connectTimeout: 5000, // Timeout de 5 segundos
                }
            }
            : {
                socket: {
                    host: config.redis.host,
                    port: config.redis.port,
                    reconnectStrategy: false, // No reintentar automáticamente
                    connectTimeout: 5000, // Timeout de 5 segundos
                },
                ...(config.redis.password && { password: config.redis.password }),
            };

        redisClient = createClient(clientConfig);

        // Manejo de errores silencioso (ya manejado en catch)
        redisClient.on('error', () => {
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
            dbLogger.warn('⚠️  Redis not available - Running with in-memory fallback');
            isRedisAvailable = false;
            redisClient = null; // Limpiar cliente fallido
        } else {
            dbLogger.error({ error: error.message }, '❌ Redis initialization failed');
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
 * Obtiene un valor del cache
 * @param {string} key - Clave del cache
 * @returns {Promise<string|null>}
 */
export const getCache = async key => {
    if (!isRedisAvailable) return null;
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
    if (!isRedisAvailable) return false;
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
    if (!isRedisAvailable) return false;
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
