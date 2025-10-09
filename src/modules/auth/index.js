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
    revokeSessionSchema,
    switchOrgSchema
} from './dtos/index.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import * as authRepository from './repository.js';
import * as sessionContextCache from './sessionContextCache.js';
import * as organizationService from '../organizations/services.js';

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
 *     description: Autentica un usuario y devuelve tokens JWT (access + refresh). Opcionalmente acepta 'remember_me' para extender la duración de la sesión de 14 días (normal) a 90 días (extendida)
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
 *                 description: Email del usuario
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *                 description: Contraseña del usuario
 *               remember_me:
 *                 type: boolean
 *                 default: false
 *                 example: true
 *                 description: Si es true, la sesión dura 90 días (refresh token) con 30 días de idle timeout. Si es false (por defecto), la sesión dura 14 días con 7 días de idle timeout
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
 *                       description: Token JWT de acceso (válido por 15 minutos)
 *                     refresh_token:
 *                       type: string
 *                       description: Token JWT de refresco (válido por 14 o 90 días según remember_me)
 *                     expires_in:
 *                       type: string
 *                       example: 15m
 *                       description: Duración del access token
 *                     token_type:
 *                       type: string
 *                       example: Bearer
 *                       description: Tipo de token para usar en el header Authorization
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
        const { email, password, remember_me } = req.body;

        // Extraer datos de sesión para auditoría
        const sessionData = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress,
            rememberMe: remember_me || false
        };

        const result = await authServices.login(email, password, sessionData);

        // Obtener organización primaria del usuario
        const primaryOrg = await organizationService.getPrimaryOrganization(result.user.id);
        const activeOrgId = primaryOrg ? primaryOrg.organization_id : null;
        const primaryOrgId = activeOrgId;
        const canAccessAllOrgs = result.user.role && result.user.role.name === 'system-admin';

        // Crear session_context y cachearlo en Redis
        const sessionContext = {
            activeOrgId,
            primaryOrgId,
            canAccessAllOrgs,
            role: result.user.role?.name || null,
            email: result.user.email,
            firstName: result.user.first_name,
            lastName: result.user.last_name,
            userId: result.user.id
        };

        await sessionContextCache.setSessionContext(result.user.id, sessionContext);

        // Simplificar role en la respuesta - solo enviar el nombre
        const responseData = {
            ...result,
            user: {
                ...result.user,
                role: result.user.role?.name || null
            },
            session_context: sessionContext,
            message: 'auth.login.success'
        };

        return successResponse(res, responseData);
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

        // Obtener session_context desde Redis
        const sessionContext = await sessionContextCache.getSessionContext(userId);

        // Simplificar role en la respuesta - solo enviar el nombre
        const userResponse = {
            ...user,
            role: user.role?.name || null
        };

        return successResponse(res, { 
            user: userResponse, 
            session_context: sessionContext,
            message: 'auth.profile.retrieved' 
        });
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

/**
 * @swagger
 * /auth/organizations:
 *   get:
 *     summary: Obtener organizaciones disponibles del usuario
 *     description: Retorna todas las organizaciones a las que el usuario tiene acceso, incluyendo su organización primaria y scope organizacional
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de organizaciones disponibles
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
 *                     canAccessAll:
 *                       type: boolean
 *                       description: true si el usuario es system-admin y puede acceder a todas las organizaciones
 *                       example: false
 *                     userOrganizations:
 *                       type: array
 *                       description: Organizaciones donde el usuario es miembro
 *                       items:
 *                         type: object
 *                         properties:
 *                           organization_id:
 *                             type: string
 *                             format: uuid
 *                           slug:
 *                             type: string
 *                           name:
 *                             type: string
 *                           logo_url:
 *                             type: string
 *                             nullable: true
 *                           is_primary:
 *                             type: boolean
 *                           is_active:
 *                             type: boolean
 *                           parent_id:
 *                             type: string
 *                             format: uuid
 *                             nullable: true
 *                           joined_at:
 *                             type: string
 *                             format: date-time
 *                     totalAccessible:
 *                       type: integer
 *                       description: Total de organizaciones accesibles (incluye descendientes según rol)
 *                       example: 5
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: No autenticado o token inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/organizations', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const organizations = await authServices.getUserAvailableOrganizations(userId);
        
        return successResponse(res, organizations);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/switch-org:
 *   post:
 *     summary: Cambiar organización activa del usuario
 *     description: Cambia la organización activa en el contexto de la sesión y genera nuevos tokens JWT con la nueva activeOrgId
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
 *               - organization_id
 *             properties:
 *               organization_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID de la organización a la que se desea cambiar
 *                 example: 01234567-89ab-cdef-0123-456789abcdef
 *     responses:
 *       200:
 *         description: Organización cambiada exitosamente
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
 *                       description: Nuevo access token JWT con activeOrgId actualizado
 *                     refresh_token:
 *                       type: string
 *                       description: Nuevo refresh token JWT
 *                     expires_in:
 *                       type: string
 *                       example: 15m
 *                     token_type:
 *                       type: string
 *                       example: Bearer
 *                     active_organization_id:
 *                       type: string
 *                       format: uuid
 *                       description: UUID de la nueva organización activa
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
 *       401:
 *         description: No autenticado o token inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acceso denegado - El usuario no puede acceder a la organización especificada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/switch-org', authenticate, validate(switchOrgSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { organization_id } = req.body;
        
        // Extraer datos de sesión para auditoría
        const sessionData = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
        };
        
        const result = await authServices.switchOrganization(userId, organization_id, sessionData);
        
        // Actualizar session_context en Redis con la nueva activeOrgId
        const updatedContext = await sessionContextCache.updateActiveOrg(userId, organization_id);
        
        return successResponse(res, {
            ...result,
            session_context: updatedContext
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/session-context:
 *   get:
 *     summary: Obtener contexto de sesión actual
 *     description: |
 *       Retorna el contexto de sesión cacheado en Redis sin necesidad de decodificar el JWT.
 *       Este endpoint es ultra-rápido ya que solo lee de Redis sin tocar la base de datos.
 *       
 *       El frontend debe usar este contexto en lugar de decodificar el JWT para obtener:
 *       - activeOrgId (organización actualmente activa)
 *       - primaryOrgId (organización primaria del usuario)
 *       - canAccessAllOrgs (si el usuario puede acceder a todas las orgs)
 *       - role (nombre del rol del usuario)
 *       - email, firstName, lastName, userId
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Contexto de sesión obtenido exitosamente
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
 *                     session_context:
 *                       type: object
 *                       properties:
 *                         activeOrgId:
 *                           type: string
 *                           format: uuid
 *                           description: ID de la organización actualmente activa
 *                         primaryOrgId:
 *                           type: string
 *                           format: uuid
 *                           description: ID de la organización primaria del usuario
 *                         canAccessAllOrgs:
 *                           type: boolean
 *                           description: Si el usuario puede acceder a todas las organizaciones (system-admin)
 *                         role:
 *                           type: string
 *                           example: org-admin
 *                           description: Nombre del rol del usuario
 *                         email:
 *                           type: string
 *                           example: admin@ecdata.com
 *                         firstName:
 *                           type: string
 *                           example: System
 *                         lastName:
 *                           type: string
 *                           example: Admin
 *                         userId:
 *                           type: string
 *                           format: uuid
 *       401:
 *         description: No autenticado o token inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Contexto de sesión no encontrado (no hay sesión activa en caché)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/session-context', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        
        // Obtener session_context desde Redis (sin hit a DB)
        const sessionContext = await sessionContextCache.getSessionContext(userId);
        
        if (!sessionContext) {
            return errorResponse(res, {
                message: 'Session context not found - please login again',
                status: 404,
                code: 'SESSION_CONTEXT_NOT_FOUND'
            });
        }
        
        return successResponse(res, { 
            session_context: sessionContext,
            message: 'Session context retrieved successfully'
        });
    } catch (error) {
        next(error);
    }
});

export default router;
