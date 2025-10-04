// Cliente Redis para cache y sesiones
import { createClient } from 'redis';
import { config } from '../../config/env.js';

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
            ? { url: config.redis.url }
            : {
                socket: {
                    host: config.redis.host,
                    port: config.redis.port,
                },
                ...(config.redis.password && { password: config.redis.password }),
            };

        redisClient = createClient(clientConfig);

        // Manejo de errores
        redisClient.on('error', err => {
            console.error('❌ Redis connection error:', err);
            isRedisAvailable = false;
        });

        redisClient.on('connect', () => {
            console.log('✅ Redis connected successfully');
            isRedisAvailable = true;
        });

        redisClient.on('ready', () => {
            console.log('✅ Redis client ready');
        });

        // Conectar
        await redisClient.connect();
    } catch (error) {
        console.error('❌ Redis initialization failed:', error.message);
        if (config.env === 'development') {
            console.warn('⚠️  Running without Redis (in-memory fallback)');
            isRedisAvailable = false;
        } else {
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
            console.log('✅ Redis connection closed');
        } catch (error) {
            console.error('❌ Error closing Redis:', error);
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
        console.error('Redis GET error:', error);
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
        console.error('Redis SET error:', error);
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
        console.error('Redis DEL error:', error);
        return false;
    }
};

/**
 * Verifica si Redis está disponible
 * @returns {boolean}
 */
export const isConnected = () => isRedisAvailable;

export default redisClient;
