// src/middleware/rateLimit.js
// Middleware de rate limiting con Redis para protección contra abuso

import { getCache, setCache } from '../db/redis/client.js';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Configuración de límites por tipo de endpoint
 * Los valores son requests por minuto (window de 60 segundos)
 */
const RATE_LIMITS = {
    // Endpoints públicos (sin autenticación)
    public: {
        windowMs: 60000, // 1 minuto
        max: 30, // 30 requests/min
        message: 'errors.rate_limit_exceeded_public'
    },
    
    // Endpoints de autenticación (login, register, refresh)
    auth: {
        windowMs: 60000, // 1 minuto
        max: 10, // 10 requests/min (prevenir brute force)
        message: 'errors.rate_limit_exceeded_auth'
    },
    
    // Endpoints autenticados - usuario regular
    authenticated: {
        windowMs: 60000, // 1 minuto
        max: 100, // 100 requests/min
        message: 'errors.rate_limit_exceeded'
    },
    
    // Endpoints autenticados - org-admin o superior
    admin: {
        windowMs: 60000, // 1 minuto
        max: 200, // 200 requests/min
        message: 'errors.rate_limit_exceeded'
    },
    
    // Endpoints autenticados - system-admin
    systemAdmin: {
        windowMs: 60000, // 1 minuto
        max: 500, // 500 requests/min
        message: 'errors.rate_limit_exceeded'
    }
};

/**
 * Determina qué límite aplicar según el usuario y endpoint
 * @param {Object} req - Request de Express
 * @returns {Object} Configuración de límite
 */
const getRateLimitConfig = (req) => {
    // System admin: límite más alto
    if (req.user && req.user.role && req.user.role.name === 'system-admin') {
        return RATE_LIMITS.systemAdmin;
    }
    
    // Org admin o manager: límite alto
    if (req.user && req.user.role) {
        const roleName = req.user.role.name;
        if (roleName === 'org-admin' || roleName === 'org-manager') {
            return RATE_LIMITS.admin;
        }
    }
    
    // Endpoints de autenticación: límite bajo (prevenir brute force)
    if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
        return RATE_LIMITS.auth;
    }
    
    // Usuario autenticado regular
    if (req.user) {
        return RATE_LIMITS.authenticated;
    }
    
    // Público: límite muy bajo
    return RATE_LIMITS.public;
};

/**
 * Genera la clave de Redis para tracking de rate limit
 * @param {Object} req - Request de Express
 * @param {string} identifier - Identificador (IP o user ID)
 * @returns {string} Clave de Redis
 */
const getRedisKey = (req, identifier) => {
    // Normalizar IDs numéricos y UUIDs en path para prevenir bypass
    const path = req.path
        .replace(/\/\d+/g, '/:id') // Normalizar IDs numéricos
        .replace(/\/[\w-]{36}/g, '/:uuid') // Normalizar UUIDs v4
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '/:uuid7'); // Normalizar UUIDs v7
    return `ratelimit:${identifier}:${path}`;
};

/**
 * Obtiene identificador único para rate limiting
 * @param {Object} req - Request de Express
 * @returns {string} Identificador (user ID o IP)
 */
const getIdentifier = (req) => {
    // Si está autenticado, usar user ID
    if (req.user && req.user.id) {
        return `user:${req.user.id}`;
    }
    
    // Si no, usar IP address
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    return `ip:${ip}`;
};

/**
 * Middleware de rate limiting con Redis
 * Soporta modo observación (solo logging) y modo activo (bloqueo)
 * 
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.observeOnly - Si es true, solo logea sin bloquear (default: true)
 * @returns {Function} Middleware de Express
 */
export const rateLimitMiddleware = (options = {}) => {
    const observeOnly = options.observeOnly !== undefined 
        ? options.observeOnly 
        : true; // Default: modo observación
    
    return async (req, res, next) => {
        try {
            // Obtener configuración de límite para este request
            const limitConfig = getRateLimitConfig(req);
            const { windowMs, max, message } = limitConfig;
            
            // Obtener identificador y clave de Redis
            const identifier = getIdentifier(req);
            const redisKey = getRedisKey(req, identifier);
            
            // Obtener contador actual de Redis usando helper
            const current = await getCache(redisKey);
            const count = current ? parseInt(current, 10) : 0;
            
            // Incrementar contador
            const newCount = count + 1;
            
            // Establecer nuevo valor con TTL (en segundos)
            const ttlSeconds = Math.ceil(windowMs / 1000);
            await setCache(redisKey, newCount, ttlSeconds);
            
            // Calcular tiempo de reset (aproximado basado en windowMs)
            const resetTime = Date.now() + windowMs;
            
            // Agregar headers informativos (siempre, independiente del modo)
            res.set({
                'X-RateLimit-Limit': max,
                'X-RateLimit-Remaining': Math.max(0, max - newCount),
                'X-RateLimit-Reset': new Date(resetTime).toISOString()
            });
            
            // Verificar si excedió el límite
            if (newCount > max) {
                // Logging del exceso
                logger.warn({
                    msg: 'Rate limit exceeded',
                    identifier,
                    path: req.path,
                    count: newCount,
                    limit: max,
                    mode: observeOnly ? 'observe' : 'active',
                    user: req.user ? { id: req.user.id, email: req.user.email } : null
                });
                
                // Si está en modo activo, bloquear el request
                if (!observeOnly) {
                    return res.status(429).json({
                        ok: false,
                        error: {
                            code: 'RATE_LIMIT_EXCEEDED',
                            message: req.t ? req.t(message) : 'Rate limit exceeded. Please try again later.',
                            params: {
                                limit: max,
                                window: `${windowMs / 1000}s`,
                                reset: new Date(resetTime).toISOString()
                            }
                        }
                    });
                }
            }
            
            next();
        } catch (error) {
            // Si Redis falla, loggear pero NO bloquear el request
            // Esto previene que problemas de Redis tumben toda la API
            logger.error({
                msg: 'Rate limit middleware error',
                error: error.message,
                path: req.path
            });
            
            next();
        }
    };
};

/**
 * Exportar configuraciones para testing
 */
export const RATE_LIMIT_CONFIG = RATE_LIMITS;

export default rateLimitMiddleware;
