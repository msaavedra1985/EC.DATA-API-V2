// modules/auth/index.js
// Router de Auth - Endpoints de autenticación

import express from 'express';
import * as authServices from './services.js';
import { validate } from '../../middleware/validate.js';
import { 
    registerSchema, 
    loginSchema, 
    refreshTokenSchema,
    changePasswordSchema 
} from './dtos/index.js';
import { successResponse, errorResponse } from '../../utils/response.js';

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
 * - tenant_id: string (optional, UUID)
 * 
 * Response:
 * - user: Object (sin password_hash)
 * - access_token: string
 * - refresh_token: string
 * - expires_in: string
 * - token_type: string
 */
router.post('/register', validate(registerSchema), async (req, res, next) => {
    try {
        const { email, password, first_name, last_name, tenant_id } = req.body;

        const result = await authServices.register({
            email,
            password,
            first_name,
            last_name,
            tenant_id
        });

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

        const result = await authServices.login(email, password);

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

        const tokens = await authServices.refreshAccessToken(refresh_token);

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
router.post('/change-password', validate(changePasswordSchema), async (req, res, next) => {
    try {
        // TODO: Agregar middleware de autenticación antes de este endpoint
        // Por ahora, asumimos que req.user viene del middleware JWT
        const userId = req.user?.userId;

        if (!userId) {
            return errorResponse(res, {
                message: 'Usuario no autenticado',
                status: 401,
                code: 'UNAUTHORIZED'
            });
        }

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
 * - user: Object (información del usuario)
 */
router.get('/me', async (req, res, next) => {
    try {
        // TODO: Agregar middleware de autenticación antes de este endpoint
        const userId = req.user?.userId;

        if (!userId) {
            return errorResponse(res, {
                message: 'Usuario no autenticado',
                status: 401,
                code: 'UNAUTHORIZED'
            });
        }

        // El usuario ya viene del middleware JWT, solo lo devolvemos
        return successResponse(res, {
            user: req.user
        });
    } catch (error) {
        next(error);
    }
});

export default router;
