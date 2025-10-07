// modules/auth/index.js
// Router de Auth - Endpoints de autenticación

import express from 'express';
import * as authServices from './services.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
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
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     description: Crea un nuevo usuario en el sistema y devuelve tokens de autenticación
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Debe contener al menos una mayúscula, una minúscula y un número
 *                 example: SecurePass123!
 *               first_name:
 *                 type: string
 *                 minLength: 2
 *                 example: Juan
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 example: Pérez
 *               organization_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: UUID de la organización (opcional)
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     access_token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *                     expires_in:
 *                       type: string
 *                       example: 15m
 *                     token_type:
 *                       type: string
 *                       example: Bearer
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: El email ya está registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

        return successResponse(res, { ...result, message: 'auth.register.success' }, 201);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica un usuario y devuelve tokens JWT (access + refresh)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     access_token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *                     expires_in:
 *                       type: string
 *                       example: 15m
 *                     token_type:
 *                       type: string
 *                       example: Bearer
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Credenciales incorrectas o usuario inactivo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

        return successResponse(res, { ...result, message: 'auth.login.success' });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar access token
 *     description: Renueva el access token usando un refresh token válido. Implementa rotación automática (el refresh token viejo se invalida y se genera uno nuevo)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Refresh token JWT obtenido en login o refresh anterior
 *     responses:
 *       200:
 *         description: Tokens renovados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                       description: Nuevo access token (15 min validez)
 *                     refresh_token:
 *                       type: string
 *                       description: Nuevo refresh token (14 días validez)
 *                     expires_in:
 *                       type: string
 *                       example: 15m
 *                     token_type:
 *                       type: string
 *                       example: Bearer
 *       400:
 *         description: Refresh token inválido o mal formado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Refresh token expirado, revocado, o detección de robo (todas las sesiones cerradas)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               expired:
 *                 value:
 *                   ok: false
 *                   error:
 *                     message: Refresh token expirado
 *                     code: REFRESH_TOKEN_EXPIRED
 *                     status: 401
 *               theft_detected:
 *                 value:
 *                   ok: false
 *                   error:
 *                     message: Token revocado - todas las sesiones han sido cerradas por seguridad
 *                     code: TOKEN_REUSE_DETECTED
 *                     status: 401
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

        return successResponse(res, { ...tokens, message: 'auth.refresh.success' });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Cambiar contraseña
 *     description: Cambia la contraseña del usuario autenticado. Auto-revoca TODOS los refresh tokens (cierra sesiones en todos los dispositivos por seguridad)
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *                 description: Contraseña actual del usuario
 *               new_password:
 *                 type: string
 *                 minLength: 8
 *                 description: Nueva contraseña (debe contener mayúscula, minúscula y número)
 *                 example: NewSecure123!
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Password cambiado exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autenticado o contraseña actual incorrecta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { current_password, new_password } = req.body;

        await authServices.changePassword(userId, current_password, new_password);

        return successResponse(res, {
            message: 'auth.password.changed'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     description: Devuelve la información completa del usuario actual
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Información del usuario obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: No autenticado o token inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

        return successResponse(res, { user, message: 'auth.profile.retrieved' });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesión actual
 *     description: |
 *       Cierra la sesión del usuario autenticado. Requiere el access token en el header Authorization.
 *       
 *       **Comportamiento:**
 *       - Si se envía `refresh_token` en el body: Solo cierra esa sesión específica
 *       - Si NO se envía `refresh_token`: Cierra TODAS las sesiones del usuario
 *       
 *       **Efectos:**
 *       - Revoca refresh token(s) de la base de datos
 *       - Incrementa `sessionVersion` (invalida todos los access tokens)
 *       - Limpia caché Redis del usuario
 *       
 *       **Ventana de invalidación:** El access token actual seguirá válido hasta 15 min (tiempo de expiración natural), pero no podrá renovarse.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Refresh token específico a revocar (opcional). Si no se envía, se revocan todos.
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Sesión cerrada exitosamente
 *                     sessions_closed:
 *                       type: integer
 *                       description: Número de sesiones cerradas (solo si no se envió refresh_token)
 *       401:
 *         description: No autenticado, token inválido o refresh token no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Refresh token no encontrado (si se especificó uno)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { refresh_token } = req.body;

        // Si se proporciona refresh_token, hacer logout de esa sesión específica
        if (refresh_token) {
            await authServices.logout(refresh_token);
            
            return successResponse(res, {
                message: 'auth.logout.success'
            });
        }

        // Si NO se proporciona refresh_token, hacer logout de TODAS las sesiones
        const sessionsRevoked = await authServices.logoutAll(userId);

        return successResponse(res, {
            message: 'auth.logout.all_success',
            sessions_closed: sessionsRevoked
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Cerrar todas las sesiones
 *     description: Revoca TODOS los refresh tokens del usuario autenticado (cierra sesión en todos los dispositivos)
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Todas las sesiones cerradas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Todas las sesiones han sido cerradas
 *                     sessions_closed:
 *                       type: integer
 *                       description: Número de sesiones que fueron revocadas
 *                       example: 3
 *       401:
 *         description: No autenticado o token inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout-all', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const sessionsRevoked = await authServices.logoutAll(userId);

        return successResponse(res, {
            message: 'auth.logout.all_success',
            sessions_closed: sessionsRevoked
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: Listar sesiones activas
 *     description: Devuelve todas las sesiones activas del usuario autenticado con metadata (created_at, last_used_at, user_agent, IP)
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de sesiones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Session'
 *       401:
 *         description: No autenticado o token inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/sessions', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const sessions = await authServices.getUserSessions(userId);

        return successResponse(res, { sessions, message: 'auth.sessions.retrieved' });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/sessions/{sessionId}/revoke:
 *   post:
 *     summary: Revocar una sesión específica
 *     description: Revoca una sesión específica por su ID (útil para cerrar sesión en un dispositivo específico)
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la sesión a revocar (refresh token ID)
 *     responses:
 *       200:
 *         description: Sesión revocada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Sesión revocada exitosamente
 *       400:
 *         description: Session ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autenticado o token inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Sesión no encontrada o no pertenece al usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/sessions/:sessionId/revoke', authenticate, validate(revokeSessionSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { sessionId } = req.params;

        await authServices.revokeSession(sessionId, userId);

        return successResponse(res, {
            message: 'auth.logout.session_revoked'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/admin-test:
 *   get:
 *     summary: Endpoint de prueba solo para administradores
 *     description: Endpoint protegido con requireRole() - solo accesible para system-admin y org-admin
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Acceso autorizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Acceso autorizado - Eres un administrador
 *                     user_role:
 *                       type: string
 *                       example: system-admin
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado - rol insuficiente
 */
router.get('/admin-test', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res, next) => {
    try {
        return successResponse(res, {
            message: 'Acceso autorizado - Eres un administrador',
            user_role: req.user.role.name,
            user_id: req.user.userId
        });
    } catch (error) {
        next(error);
    }
});

export default router;
