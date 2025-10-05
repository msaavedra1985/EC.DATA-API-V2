// modules/auth/index.js
// Router de Auth - Endpoints de autenticación

import express from 'express';
import * as authServices from './services.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { 
    registerSchema, 
    loginSchema, 
    refreshTokenSchema,
    changePasswordSchema,
    logoutSchema,
    revokeSessionSchema
} from './dtos/index.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import * as authRepository from './repository.js';

const router = express.Router();

/**
 * POST /auth/register
 * Registrar un nuevo usuario
 * 
 * Body:
 * - email: string (required)
 * - password: string (required, min 8 chars, must contain uppercase, lowercase, number)
 * - first_name: string (required)
 * - last_name: string (required)
 * - organization_id: string (optional, UUID)
 * 
 * Response:
 * - user: Object (con public_code, sin password_hash ni human_id)
 * - access_token: string
 * - refresh_token: string
 * - expires_in: string
 * - token_type: string
 */
router.post('/register', validate(registerSchema), async (req, res, next) => {
    try {
        const { email, password, first_name, last_name, organization_id } = req.body;

        // Extraer datos de sesión para auditoría
        const sessionData = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
        };

        const result = await authServices.register({
            email,
            password,
            first_name,
            last_name,
            organization_id
        }, sessionData);

        return successResponse(res, result, 201);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /auth/login
 * Login de usuario existente
 * 
 * Body:
 * - email: string (required)
 * - password: string (required)
 * 
 * Response:
 * - user: Object (sin password_hash)
 * - access_token: string
 * - refresh_token: string
 * - expires_in: string
 * - token_type: string
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Extraer datos de sesión para auditoría
        const sessionData = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
        };

        const result = await authServices.login(email, password, sessionData);

        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /auth/refresh
 * Refresh de access token usando refresh token
 * 
 * Body:
 * - refresh_token: string (required)
 * 
 * Response:
 * - access_token: string
 * - refresh_token: string
 * - expires_in: string
 * - token_type: string
 */
router.post('/refresh', validate(refreshTokenSchema), async (req, res, next) => {
    try {
        const { refresh_token } = req.body;

        // Extraer datos de sesión para auditoría
        const sessionData = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
        };

        const tokens = await authServices.refreshAccessToken(refresh_token, sessionData);

        return successResponse(res, tokens);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /auth/change-password
 * Cambiar password del usuario autenticado
 * Requiere autenticación (JWT middleware)
 * 
 * Body:
 * - current_password: string (required)
 * - new_password: string (required, min 8 chars, must contain uppercase, lowercase, number)
 * 
 * Response:
 * - message: string
 */
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { current_password, new_password } = req.body;

        await authServices.changePassword(userId, current_password, new_password);

        return successResponse(res, {
            message: 'Password cambiado exitosamente'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /auth/me
 * Obtener información del usuario autenticado
 * Requiere autenticación (JWT middleware)
 * 
 * Response:
 * - user: Object (información completa del usuario desde DB)
 */
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;

        // Obtener datos completos del usuario desde la DB
        const user = await authRepository.findUserById(userId);

        if (!user) {
            return errorResponse(res, {
                message: 'Usuario no encontrado',
                status: 404,
                code: 'USER_NOT_FOUND'
            });
        }

        return successResponse(res, { user });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /auth/logout
 * Cerrar sesión actual (revocar refresh token)
 * 
 * Body (opcional):
 * - refresh_token: string
 * 
 * Header (alternativa):
 * - Authorization: Bearer <refresh_token>
 * 
 * Response:
 * - message: string
 */
router.post('/logout', validate(logoutSchema), async (req, res, next) => {
    try {
        let refresh_token = req.body.refresh_token;

        // Si no viene en el body, intentar extraer del header Authorization
        if (!refresh_token) {
            const authHeader = req.headers.authorization;
            
            if (!authHeader) {
                return errorResponse(res, {
                    message: 'Refresh token requerido (en body o header Authorization)',
                    status: 400,
                    code: 'REFRESH_TOKEN_REQUIRED'
                });
            }

            // Extraer token del header (formato: "Bearer <token>" o solo "<token>")
            const parts = authHeader.split(' ');
            refresh_token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : authHeader;
        }

        // Validar que el token no esté vacío
        if (!refresh_token || refresh_token.trim().length === 0) {
            return errorResponse(res, {
                message: 'Refresh token no puede estar vacío',
                status: 400,
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        await authServices.logout(refresh_token);

        return successResponse(res, {
            message: 'Sesión cerrada exitosamente'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /auth/logout-all
 * Cerrar todas las sesiones del usuario autenticado
 * Requiere autenticación (JWT middleware)
 * 
 * Response:
 * - message: string
 * - sessions_closed: number
 */
router.post('/logout-all', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const sessionsRevoked = await authServices.logoutAll(userId);

        return successResponse(res, {
            message: 'Todas las sesiones han sido cerradas',
            sessions_closed: sessionsRevoked
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /auth/sessions
 * Listar sesiones activas del usuario autenticado
 * Requiere autenticación (JWT middleware)
 * 
 * Response:
 * - sessions: Array (lista de sesiones con metadata)
 */
router.get('/sessions', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const sessions = await authServices.getUserSessions(userId);

        return successResponse(res, { sessions });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /auth/sessions/:sessionId/revoke
 * Revocar una sesión específica por ID
 * Requiere autenticación (JWT middleware)
 * 
 * Params:
 * - sessionId: UUID de la sesión (refresh token ID)
 * 
 * Response:
 * - message: string
 */
router.post('/sessions/:sessionId/revoke', authenticate, validate(revokeSessionSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { sessionId } = req.params;

        await authServices.revokeSession(sessionId, userId);

        return successResponse(res, {
            message: 'Sesión revocada exitosamente'
        });
    } catch (error) {
        next(error);
    }
});

export default router;
