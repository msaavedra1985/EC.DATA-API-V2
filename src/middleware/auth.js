// middleware/auth.js
// Middleware de autenticación JWT

import * as authServices from '../modules/auth/services.js';
import { errorResponse } from '../utils/response.js';

/**
 * Middleware para verificar token JWT en headers
 * Extrae el token del header Authorization: Bearer <token>
 * Verifica el token y adjunta los datos del usuario a req.user
 * 
 * @returns {Function} - Middleware de Express
 */
export const authenticate = async (req, res, next) => {
    try {
        // Extraer token del header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return errorResponse(res, {
                message: 'Token de autenticación no proporcionado',
                status: 401,
                code: 'NO_TOKEN'
            });
        }

        // Verificar formato: Bearer <token>
        const parts = authHeader.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return errorResponse(res, {
                message: 'Formato de token inválido. Use: Bearer <token>',
                status: 401,
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        const token = parts[1];

        // Verificar token con el servicio de auth
        const userData = await authServices.verifyToken(token);

        // Adjuntar datos del usuario al request
        req.user = userData;

        next();
    } catch (error) {
        // Los errores de token ya vienen con status y code del servicio
        if (error.status === 401 || error.status === 403) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }

        // Cualquier otro error, pasar al error handler
        next(error);
    }
};

/**
 * Middleware para verificar roles específicos
 * Debe usarse DESPUÉS de authenticate
 * 
 * @param {string[]} allowedRoles - Array de roles permitidos ['admin', 'manager']
 * @returns {Function} - Middleware de Express
 */
export const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        // Verificar que el usuario esté autenticado
        if (!req.user) {
            return errorResponse(res, {
                message: 'Usuario no autenticado',
                status: 401,
                code: 'UNAUTHORIZED'
            });
        }

        // Verificar que el usuario tenga un rol permitido
        if (!allowedRoles.includes(req.user.role)) {
            console.warn(`User ${req.user.email} attempted to access protected route without permission`);
            
            return errorResponse(res, {
                message: 'No tienes permisos para acceder a este recurso',
                status: 403,
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

/**
 * Middleware opcional de autenticación
 * Intenta autenticar pero NO bloquea si falla
 * Útil para endpoints públicos que pueden tener comportamiento diferente si el usuario está autenticado
 * 
 * @returns {Function} - Middleware de Express
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            // No hay token, continuar sin autenticar
            req.user = null;
            return next();
        }

        const parts = authHeader.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            // Token mal formado, continuar sin autenticar
            req.user = null;
            return next();
        }

        const token = parts[1];

        // Intentar verificar token
        const userData = await authServices.verifyToken(token);
        req.user = userData;

        next();
    } catch (error) {
        // Si falla la verificación, continuar sin autenticar
        req.user = null;
        next();
    }
};
