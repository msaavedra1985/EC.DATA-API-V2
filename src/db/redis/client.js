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
 * Obtiene un valor del cache y lo parsea automáticamente si es JSON
 * @param {string} key - Clave del cache
 * @returns {Promise<any|null>}
 */
export const getCache = async key => {
    // Fallback en memoria si Redis no está disponible
    if (!isRedisAvailable) {
        cleanExpiredMemoryCache();
        return inMemoryCache.get(key) || null;
    }
    
    try {
        const value = await redisClient.get(key);
        if (!value) return null;
        
        // Intentar parsear como JSON, si falla retornar string
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    } catch (error) {
        dbLogger.error(error, 'Redis GET error');
        return null;
    }
};

/**
 * Establece un valor en el cache con TTL opcional
 * Serializa automáticamente objetos a JSON
 * @param {string} key - Clave del cache
 * @param {any} value - Valor a almacenar (string, number, object, array)
 * @param {number} ttl - Tiempo de vida en segundos (opcional)
 * @returns {Promise<boolean>}
 */
export const setCache = async (key, value, ttl = null) => {
    // Serializar objetos a JSON
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    // Fallback en memoria si Redis no está disponible
    if (!isRedisAvailable) {
        inMemoryCache.set(key, value); // Guardar objeto original en memoria
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
            await redisClient.setEx(key, ttl, serializedValue);
        } else {
            await redisClient.set(key, serializedValue);
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

/**
 * Agrega el prefijo 'ec:' a una clave si no lo tiene ya
 * @param {string} key - Clave original
 * @returns {string} - Clave con prefijo
 */
const ensurePrefix = (key) => {
    return key.startsWith('ec:') ? key : `ec:${key}`;
};

/**
 * Obtiene un valor del cache con prefijo 'ec:' automático
 * @param {string} key - Clave del cache (se agregará 'ec:' si no lo tiene)
 * @returns {Promise<string|null>}
 */
export const getCacheWithPrefix = async (key) => {
    return getCache(ensurePrefix(key));
};

/**
 * Establece un valor en el cache con prefijo 'ec:' automático
 * @param {string} key - Clave del cache (se agregará 'ec:' si no lo tiene)
 * @param {string} value - Valor a almacenar
 * @param {number} ttl - Tiempo de vida en segundos (opcional)
 * @returns {Promise<boolean>}
 */
export const setCacheWithPrefix = async (key, value, ttl = null) => {
    return setCache(ensurePrefix(key), value, ttl);
};

/**
 * Elimina una clave del cache con prefijo 'ec:' automático
 * @param {string} key - Clave a eliminar (se agregará 'ec:' si no lo tiene)
 * @returns {Promise<boolean>}
 */
export const deleteCacheWithPrefix = async (key) => {
    return deleteCache(ensurePrefix(key));
};

/**
 * Escanea y elimina todas las keys que coincidan con un patrón
 * Útil para invalidación masiva de cache (ej: 'ec:org:list:*', 'ec:role:*')
 * 
 * @param {string} pattern - Patrón de keys a eliminar (usa * como wildcard)
 * @returns {Promise<number>} Número de keys eliminadas
 */
export const scanAndDelete = async (pattern) => {
    // Fallback en memoria si Redis no está disponible
    if (!isRedisAvailable) {
        let count = 0;
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        
        for (const key of inMemoryCache.keys()) {
            if (regex.test(key)) {
                inMemoryCache.delete(key);
                inMemoryTTLs.delete(key);
                count++;
            }
        }
        
        dbLogger.debug({ pattern, count }, 'In-memory cache pattern deletion');
        return count;
    }
    
    try {
        let cursor = '0';
        let deletedCount = 0;
        const keysToDelete = [];
        
        // SCAN iterativo para encontrar todas las keys que coinciden
        do {
            const result = await redisClient.scan(cursor, {
                MATCH: pattern,
                COUNT: 100
            });
            
            cursor = result.cursor;
            const keys = result.keys;
            
            if (keys.length > 0) {
                keysToDelete.push(...keys);
            }
        } while (cursor !== '0');
        
        // Eliminar keys en batch (spread para node-redis)
        if (keysToDelete.length > 0) {
            await redisClient.del(...keysToDelete);
            deletedCount = keysToDelete.length;
        }
        
        dbLogger.debug({ pattern, deletedCount }, 'Redis pattern deletion completed');
        return deletedCount;
    } catch (error) {
        dbLogger.error({ err: error, pattern }, 'Redis SCAN+DEL error');
        return 0;
    }
};

export default redisClient;
