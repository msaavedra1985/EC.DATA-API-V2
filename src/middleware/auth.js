// middleware/auth.js
// Middleware de autenticación JWT

import * as authServices from '../modules/auth/services.js';
import { errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

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
                message: 'auth.token.missing',
                status: 401,
                code: 'NO_TOKEN'
            });
        }

        // Verificar formato: Bearer <token>
        const parts = authHeader.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return errorResponse(res, {
                message: 'auth.token.malformed',
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
 * @param {string[]} allowedRoles - Array de roles permitidos por nombre ['system-admin', 'org-admin', 'user']
 * @returns {Function} - Middleware de Express
 */
export const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        // Verificar que el usuario esté autenticado
        if (!req.user) {
            return errorResponse(res, {
                message: 'auth.token.missing',
                status: 401,
                code: 'UNAUTHORIZED'
            });
        }

        // Verificar que el usuario tenga un rol permitido (role es un objeto con {id, name, description, is_active})
        const userRoleName = req.user.role?.name;
        if (!userRoleName || !allowedRoles.includes(userRoleName)) {
            logger.warn(`User ${req.user.email} with role ${userRoleName} attempted to access protected route without permission`);
            
            return errorResponse(res, {
                message: 'auth.permission.denied',
                status: 403,
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

/**
 * Middleware universal para requerir roles específicos
 * Alias más intuitivo de authorize() para protección de endpoints
 * 
 * Ejemplos de uso:
 * - requireRole(['system-admin']) // Solo system-admin
 * - requireRole(['org-admin', 'org-manager']) // Admin o manager
 * - requireRole(['system-admin', 'org-admin', 'org-manager', 'user']) // Cualquier usuario autenticado excepto viewer/guest/demo
 * 
 * @param {string[]} roleNames - Array de nombres de roles permitidos
 * @returns {Function} - Middleware de Express
 */
export const requireRole = (roleNames = []) => {
    return authorize(roleNames);
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
