// middleware/loginRateLimit.js
// Rate limiter específico para login con doble capa (IP + identifier)
// Previene ataques de fuerza bruta tanto por IP como por usuario/email

import { createClient } from 'redis';
import { config } from '../config/env.js';
import pino from 'pino';

// Logger específico para rate limiting de login
const loginRateLimitLogger = pino({
    name: 'login-rate-limit',
    level: config.env === 'development' ? 'debug' : 'info'
});

// Configuración del rate limiter para login
const LOGIN_RATE_CONFIG = {
    // Capa 1: Por IP - límites más altos
    ip: {
        maxAttempts: 20,        // 20 intentos fallidos por IP
        windowSeconds: 900,     // Ventana de 15 minutos
        blockSeconds: 1800      // Bloqueo de 30 minutos
    },
    // Capa 2: Por identifier (email/username) - límites más bajos
    identifier: {
        maxAttempts: 5,         // 5 intentos fallidos por identifier
        windowSeconds: 300,     // Ventana de 5 minutos
        blockSeconds: 900       // Bloqueo de 15 minutos
    }
};

// Prefijos para Redis
const REDIS_PREFIX = {
    ipFail: 'login_fail_ip:',
    idFail: 'login_fail_id:',
    ipBlock: 'login_block_ip:',
    idBlock: 'login_block_id:'
};

// Cliente Redis (se inicializa lazy)
let redisClient = null;

/**
 * Obtener cliente Redis, inicializando si es necesario
 * IMPORTANTE: Lanza error si Redis no está disponible para proteger contra brute force
 */
const getRedisClient = async () => {
    if (redisClient && redisClient.isReady) {
        return redisClient;
    }

    try {
        redisClient = createClient({
            url: config.redis.url || `redis://${config.redis.host}:${config.redis.port}`,
            password: config.redis.password || undefined
        });

        redisClient.on('error', (err) => {
            loginRateLimitLogger.error(err, 'Redis client error in login rate limiter');
        });

        await redisClient.connect();
        return redisClient;
    } catch (error) {
        loginRateLimitLogger.error(error, 'Failed to connect to Redis for login rate limiting');
        // NO retornar null - lanzar error para rechazar login sin rate limiting
        throw new Error('Rate limiting service unavailable');
    }
};

/**
 * Verificar si una clave está bloqueada
 * @param {string} key - Clave de bloqueo (ip o identifier)
 * @returns {Promise<number|null>} - Segundos restantes de bloqueo, o null si no está bloqueado
 * @throws {Error} - Si Redis no está disponible
 */
const checkBlock = async (key) => {
    const redis = await getRedisClient();
    // getRedisClient ahora lanza error si no está disponible

    try {
        const ttl = await redis.ttl(key);
        return ttl > 0 ? ttl : null;
    } catch (error) {
        loginRateLimitLogger.error(error, 'Error checking block status');
        throw error; // Propagar error para rechazar login
    }
};

/**
 * Incrementar contador de intentos fallidos
 * @param {string} key - Clave del contador
 * @param {number} windowSeconds - Ventana de tiempo en segundos
 * @returns {Promise<number>} - Número actual de intentos
 */
const incrementFailCount = async (key, windowSeconds) => {
    const redis = await getRedisClient();
    // getRedisClient ahora lanza error si no está disponible

    try {
        const count = await redis.incr(key);
        // Solo establecer TTL en el primer intento
        if (count === 1) {
            await redis.expire(key, windowSeconds);
        }
        return count;
    } catch (error) {
        loginRateLimitLogger.error(error, 'Error incrementing fail count');
        // En caso de error de Redis, no bloquear pero loguear
        return 0;
    }
};

/**
 * Establecer bloqueo
 * @param {string} key - Clave de bloqueo
 * @param {number} blockSeconds - Duración del bloqueo en segundos
 */
const setBlock = async (key, blockSeconds) => {
    const redis = await getRedisClient();
    if (!redis) return;

    try {
        await redis.setEx(key, blockSeconds, '1');
    } catch (error) {
        loginRateLimitLogger.error(error, 'Error setting block');
    }
};

/**
 * Resetear contadores para una IP e identifier específicos
 * Llamar después de un login exitoso
 * 
 * @param {string} ip - IP del cliente
 * @param {string} identifier - Email o username
 */
export const resetLoginCounters = async (ip, identifier) => {
    const redis = await getRedisClient();
    if (!redis) return;

    try {
        const keysToDelete = [
            `${REDIS_PREFIX.ipFail}${ip}`,
            `${REDIS_PREFIX.idFail}${identifier.toLowerCase()}`
        ];

        await redis.del(keysToDelete);

        loginRateLimitLogger.debug({
            ip,
            identifier: identifier.toLowerCase()
        }, 'Login counters reset after successful login');
    } catch (error) {
        loginRateLimitLogger.error(error, 'Error resetting login counters');
    }
};

/**
 * Registrar intento de login fallido
 * Incrementa contadores y establece bloqueos si es necesario
 * 
 * @param {string} ip - IP del cliente
 * @param {string} identifier - Email o username
 */
export const recordFailedLogin = async (ip, identifier) => {
    const normalizedId = identifier.toLowerCase();

    // Incrementar contador de IP
    const ipFailKey = `${REDIS_PREFIX.ipFail}${ip}`;
    const ipFailCount = await incrementFailCount(ipFailKey, LOGIN_RATE_CONFIG.ip.windowSeconds);

    // Verificar si debemos bloquear la IP
    if (ipFailCount >= LOGIN_RATE_CONFIG.ip.maxAttempts) {
        await setBlock(
            `${REDIS_PREFIX.ipBlock}${ip}`,
            LOGIN_RATE_CONFIG.ip.blockSeconds
        );
        loginRateLimitLogger.warn({
            ip,
            failCount: ipFailCount,
            blockDuration: LOGIN_RATE_CONFIG.ip.blockSeconds
        }, 'IP blocked due to too many failed login attempts');
    }

    // Incrementar contador de identifier
    const idFailKey = `${REDIS_PREFIX.idFail}${normalizedId}`;
    const idFailCount = await incrementFailCount(idFailKey, LOGIN_RATE_CONFIG.identifier.windowSeconds);

    // Verificar si debemos bloquear el identifier
    if (idFailCount >= LOGIN_RATE_CONFIG.identifier.maxAttempts) {
        await setBlock(
            `${REDIS_PREFIX.idBlock}${normalizedId}`,
            LOGIN_RATE_CONFIG.identifier.blockSeconds
        );
        loginRateLimitLogger.warn({
            identifier: normalizedId,
            failCount: idFailCount,
            blockDuration: LOGIN_RATE_CONFIG.identifier.blockSeconds
        }, 'Identifier blocked due to too many failed login attempts');
    }
};

/**
 * Middleware de rate limiting para login
 * Verifica ambas capas (IP e identifier) antes de permitir el intento
 * 
 * SEGURIDAD FAIL-CLOSED:
 * - Si Redis no está disponible → 503 (login rechazado)
 * - Payloads malformados → incrementan contador de IP
 * 
 * Uso:
 * router.post('/login', loginRateLimitMiddleware, validate(loginSchema), handler);
 */
export const loginRateLimitMiddleware = async (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const rawIdentifier = req.body?.identifier;
    
    // Normalizar identifier: si no existe o no es string, usar placeholder
    const normalizedId = (typeof rawIdentifier === 'string' && rawIdentifier.trim()) 
        ? rawIdentifier.toLowerCase().trim() 
        : '_malformed_';

    try {
        // Verificar bloqueo por IP
        const ipBlockKey = `${REDIS_PREFIX.ipBlock}${ip}`;
        const ipBlockTtl = await checkBlock(ipBlockKey);

        if (ipBlockTtl) {
            loginRateLimitLogger.info({
                ip,
                remainingSeconds: ipBlockTtl
            }, 'Login attempt blocked by IP rate limit');

            return res.status(429).json({
                ok: false,
                error: {
                    code: 'TOO_MANY_ATTEMPTS',
                    message: 'auth.login.too_many_attempts',
                    params: {
                        retryAfter: ipBlockTtl,
                        blockedBy: 'ip'
                    }
                }
            });
        }

        // Verificar bloqueo por identifier (incluyendo _malformed_)
        const idBlockKey = `${REDIS_PREFIX.idBlock}${normalizedId}`;
        const idBlockTtl = await checkBlock(idBlockKey);

        if (idBlockTtl) {
            loginRateLimitLogger.info({
                identifier: normalizedId,
                remainingSeconds: idBlockTtl
            }, 'Login attempt blocked by identifier rate limit');

            return res.status(429).json({
                ok: false,
                error: {
                    code: 'TOO_MANY_ATTEMPTS',
                    message: 'auth.login.too_many_attempts',
                    params: {
                        retryAfter: idBlockTtl,
                        blockedBy: 'identifier'
                    }
                }
            });
        }

        // Agregar funciones helper al request para uso posterior
        req.loginRateLimit = {
            ip,
            identifier: normalizedId,
            recordFailed: () => recordFailedLogin(ip, normalizedId),
            resetCounters: () => resetLoginCounters(ip, normalizedId)
        };

        next();
    } catch (error) {
        // SEGURIDAD FAIL-CLOSED: Si Redis falla, RECHAZAR login
        // Log sin exponer stack trace al cliente
        loginRateLimitLogger.error({ err: error }, 'Redis unavailable - rejecting login to prevent rate limit bypass');
        
        return res.status(503).json({
            ok: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'auth.login.service_unavailable'
            }
        });
    }
};

export default loginRateLimitMiddleware;
