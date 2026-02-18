// src/middleware/rateLimit.js
// Middleware de rate limiting con Redis para protección contra abuso

import { getCache, setCache, incrWithTTL } from '../db/redis/client.js';
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
    // Obtener rol del usuario (es string directo, no objeto)
    const userRole = req.user?.role;
    
    // System admin: límite más alto (aunque ahora tiene bypass completo)
    if (userRole === 'system-admin') {
        return RATE_LIMITS.systemAdmin;
    }
    
    // Org admin o manager: límite alto
    if (userRole === 'org-admin' || userRole === 'org-manager') {
        return RATE_LIMITS.admin;
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
            // BYPASS COMPLETO para system-admin
            // System admins no tienen límite de rate (acceso total a la plataforma)
            const userRole = req.user?.role;
            if (userRole === 'system-admin') {
                // Agregar header indicando bypass
                res.set('X-RateLimit-Bypass', 'system-admin');
                return next();
            }
            
            // Obtener configuración de límite para este request
            const limitConfig = getRateLimitConfig(req);
            const { windowMs, max, message } = limitConfig;
            
            // Obtener identificador y clave de Redis
            const identifier = getIdentifier(req);
            const redisKey = getRedisKey(req, identifier);
            
            // Incrementar contador atómicamente con INCR + EXPIRE
            const ttlSeconds = Math.ceil(windowMs / 1000);
            const newCount = await incrWithTTL(redisKey, ttlSeconds);
            
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
 * Configuración de límites por organización
 * Se aplica después de enforceActiveOrganization
 * Ventana de 1 minuto, compartido entre todos los usuarios de la org
 */
const ORG_RATE_LIMITS = {
    windowMs: 60000,
    max: 600,
    message: 'errors.rate_limit_exceeded_org'
};

/**
 * Middleware de rate limiting por organización
 * Limita el total de requests que una organización puede hacer por ventana de tiempo
 * Se aplica DESPUÉS de enforceActiveOrganization (necesita req.organizationContext)
 * 
 * @param {Object} options - Opciones de configuración
 * @param {number} [options.max] - Máximo de requests por ventana (default: 600/min)
 * @param {number} [options.windowMs] - Ventana en ms (default: 60000)
 * @returns {Function} Middleware de Express
 */
export const orgRateLimitMiddleware = (options = {}) => {
    const max = options.max || ORG_RATE_LIMITS.max;
    const windowMs = options.windowMs || ORG_RATE_LIMITS.windowMs;
    
    return async (req, res, next) => {
        try {
            const orgContext = req.organizationContext;
            
            // Sin contexto de org o admin global sin org activa → no aplicar
            if (!orgContext || !orgContext.id || orgContext.canAccessAll) {
                return next();
            }
            
            const orgId = orgContext.id;
            const redisKey = `ratelimit:org:${orgId}`;
            
            const ttlSeconds = Math.ceil(windowMs / 1000);
            const newCount = await incrWithTTL(redisKey, ttlSeconds);
            
            const resetTime = Date.now() + windowMs;
            
            // Headers específicos de rate limit por organización
            res.set({
                'X-Org-RateLimit-Limit': max,
                'X-Org-RateLimit-Remaining': Math.max(0, max - newCount),
                'X-Org-RateLimit-Reset': new Date(resetTime).toISOString()
            });
            
            if (newCount > max) {
                logger.warn({
                    msg: 'Organization rate limit exceeded',
                    organizationId: orgId,
                    publicCode: orgContext.publicCode,
                    count: newCount,
                    limit: max,
                    path: req.path,
                    userId: req.user?.userId
                });
                
                const retryAfterSeconds = Math.ceil(windowMs / 1000);
                res.set('Retry-After', retryAfterSeconds);
                
                return res.status(429).json({
                    ok: false,
                    error: {
                        code: 'ORG_RATE_LIMIT_EXCEEDED',
                        message: req.t 
                            ? req.t(ORG_RATE_LIMITS.message)
                            : 'Your organization has exceeded the request limit. Please try again shortly.',
                        params: {
                            limit: max,
                            window: `${windowMs / 1000}s`,
                            reset: new Date(resetTime).toISOString(),
                            retry_after: retryAfterSeconds
                        }
                    }
                });
            }
            
            next();
        } catch (error) {
            logger.error({
                msg: 'Organization rate limit middleware error',
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
export const ORG_RATE_LIMIT_CONFIG = ORG_RATE_LIMITS;

export default rateLimitMiddleware;
