// modules/auth/index.js
// Router de Auth - Endpoints de autenticación

import express from 'express';
import * as authServices from './services.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { loginRateLimitMiddleware, resetLoginCounters, recordFailedLogin } from '../../middleware/loginRateLimit.js';
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
import * as organizationRepository from '../organizations/repository.js';
import { logAuditAction, extractAuditInfo } from '../../helpers/auditLog.js';

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
router.post('/login', loginRateLimitMiddleware, validate(loginSchema), async (req, res, next) => {
    try {
        const { identifier: rawIdentifier, email, password, remember_me, captchaToken, captcha_token } = req.body;
        // Compatibilidad: usar identifier si existe, sino usar email (campo legacy)
        const identifier = rawIdentifier || email;
        const ip = req.ip || req.connection.remoteAddress;

        // Extraer datos de sesión para auditoría y validación
        // Compatibilidad: aceptar captchaToken (camelCase) o captcha_token (snake_case)
        const sessionData = {
            userAgent: req.headers['user-agent'],
            ipAddress: ip,
            rememberMe: remember_me || false,
            captchaToken: captchaToken || captcha_token || null
        };

        try {
            const result = await authServices.login(identifier, password, sessionData);

            // Login exitoso: resetear contadores de rate limiting
            await resetLoginCounters(ip, identifier);

            // Obtener organización primaria del usuario con su información completa
            const primaryOrg = await organizationService.getPrimaryOrganization(result.user.id);
            const activeOrgId = primaryOrg ? primaryOrg.organization_id : null;
            const primaryOrgId = activeOrgId;
            const canAccessAllOrgs = result.user.role && result.user.role.name === 'system-admin';
            
            // Obtener información de la organización primaria (public_code, nombre, logo)
            let primaryOrgInfo = null;
            if (primaryOrgId) {
                const orgDetails = await organizationRepository.findOrganizationByIdInternal(primaryOrgId);
                if (orgDetails) {
                    primaryOrgInfo = {
                        publicCode: orgDetails.public_code,
                        name: orgDetails.name,
                        logoUrl: orgDetails.logo_url
                    };
                }
            }

            // Crear session_context y cachearlo en Redis
            // Incluye public_codes para que el frontend no necesite resolverlos
            const sessionContext = {
                activeOrgId,
                activeOrgPublicCode: primaryOrgInfo?.publicCode || null,
                activeOrgName: primaryOrgInfo?.name || null,
                activeOrgLogoUrl: primaryOrgInfo?.logoUrl || null,
                primaryOrgId,
                primaryOrgPublicCode: primaryOrgInfo?.publicCode || null,
                primaryOrgName: primaryOrgInfo?.name || null,
                primaryOrgLogoUrl: primaryOrgInfo?.logoUrl || null,
                canAccessAllOrgs,
                role: result.user.role?.name || null,
                email: result.user.email,
                firstName: result.user.first_name,
                lastName: result.user.last_name,
                userId: result.user.id,
                userPublicCode: result.user.public_code || null
            };

            await sessionContextCache.setSessionContext(result.user.id, sessionContext);

            // Filtrar user a solo campos relevantes para el frontend
            // NO exponemos: id, role_id, human_id, organization_id, created_at, updated_at, etc.
            const userResponse = {
                public_code: result.user.public_code,
                email: result.user.email,
                first_name: result.user.first_name,
                last_name: result.user.last_name,
                avatar_url: result.user.avatar_url || null,
                language: result.user.language || 'es',
                timezone: result.user.timezone || 'America/Lima',
                role: result.user.role?.name || null,
                permissions: result.user.role?.permissions || []
            };
            
            const responseData = {
                ...result,
                user: userResponse,
                session_context: sessionContextCache.sanitizeSessionContext(sessionContext),
                message: 'auth.login.success'
            };

            return successResponse(res, responseData);
        } catch (loginError) {
            // Login fallido: registrar intento fallido para rate limiting
            // Registrar para errores de credenciales, captcha, y cuenta inactiva
            // No registrar para errores de sistema (5xx)
            const failureCodes = [
                'INVALID_CREDENTIALS', 
                'CAPTCHA_REQUIRED', 
                'CAPTCHA_INVALID',
                'USER_INACTIVE'
            ];
            if (failureCodes.includes(loginError.code)) {
                await recordFailedLogin(ip, identifier || '_validation_failed_');
            }
            throw loginError;
        }
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
        let sessionContext = await sessionContextCache.getSessionContext(userId);
        
        // Si session_context es null (cache expirado), reconstruirlo desde DB + JWT
        // Esto garantiza que el frontend siempre reciba session_context
        if (!sessionContext) {
            const primaryOrg = await organizationService.getPrimaryOrganization(userId);
            const primaryOrgId = primaryOrg ? primaryOrg.organization_id : null;
            const canAccessAllOrgs = user.role?.name === 'system-admin';
            
            // CRÍTICO: Usar activeOrgId del JWT, NO asumir que siempre es la org primaria
            // Cuando el system-admin está impersonando, activeOrgId del JWT es la org impersonada
            const activeOrgId = req.user.activeOrgId !== undefined ? req.user.activeOrgId : primaryOrgId;
            
            // Obtener info de la org primaria
            let primaryOrgInfo = null;
            if (primaryOrgId) {
                const primaryOrgDetails = await organizationRepository.findOrganizationByIdInternal(primaryOrgId);
                if (primaryOrgDetails) {
                    primaryOrgInfo = {
                        publicCode: primaryOrgDetails.public_code,
                        name: primaryOrgDetails.name,
                        logoUrl: primaryOrgDetails.logo_url
                    };
                }
            }
            
            // Obtener info de la org activa (puede ser diferente a la primaria si está impersonando)
            let activeOrgInfo = null;
            if (activeOrgId && activeOrgId !== primaryOrgId) {
                const activeOrgDetails = await organizationRepository.findOrganizationByIdInternal(activeOrgId);
                if (activeOrgDetails) {
                    activeOrgInfo = {
                        publicCode: activeOrgDetails.public_code,
                        name: activeOrgDetails.name,
                        logoUrl: activeOrgDetails.logo_url
                    };
                }
            } else if (activeOrgId && activeOrgId === primaryOrgId) {
                activeOrgInfo = primaryOrgInfo;
            }
            
            // Reconstruir y cachear session_context
            sessionContext = {
                activeOrgId,
                activeOrgPublicCode: activeOrgInfo?.publicCode || null,
                activeOrgName: activeOrgInfo?.name || null,
                activeOrgLogoUrl: activeOrgInfo?.logoUrl || null,
                primaryOrgId,
                primaryOrgPublicCode: primaryOrgInfo?.publicCode || null,
                primaryOrgName: primaryOrgInfo?.name || null,
                primaryOrgLogoUrl: primaryOrgInfo?.logoUrl || null,
                canAccessAllOrgs,
                role: user.role?.name || null,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                userId: user.id,
                userPublicCode: user.public_code || null
            };
            
            await sessionContextCache.setSessionContext(userId, sessionContext);
        }

        // Filtrar user a solo campos relevantes para el frontend
        const userResponse = {
            public_code: user.public_code,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url || null,
            language: user.language || 'es',
            timezone: user.timezone || 'America/Lima',
            role: user.role?.name || null,
            permissions: user.role?.permissions || []
        };
        
        // Agregar información de impersonación para system-admin
        const isSystemAdmin = req.user.role === 'system-admin';
        const impersonationInfo = isSystemAdmin ? {
            impersonating: req.user.impersonating || false,
            impersonatedOrg: req.user.impersonating && req.user.activeOrgId 
                ? { publicCode: sessionContext.activeOrgPublicCode || null }
                : null
        } : {};

        return successResponse(res, { 
            user: userResponse, 
            session_context: sessionContextCache.sanitizeSessionContext(sessionContext),
            ...impersonationInfo,
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
            user_role: req.user.role,
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
        
        // Obtener información completa de la organización
        let org;
        if (!organization_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            // Es public_code
            org = await organizationRepository.findOrganizationByPublicCodeInternal(organization_id);
        } else {
            // Es UUID
            org = await organizationRepository.findOrganizationByIdInternal(organization_id);
        }
        
        if (!org) {
            const error = new Error('Organización no encontrada');
            error.status = 404;
            error.code = 'ORGANIZATION_NOT_FOUND';
            throw error;
        }
        
        const organizationUuid = org.id;
        
        // Extraer datos de sesión para auditoría
        const sessionData = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
        };
        
        const result = await authServices.switchOrganization(userId, organizationUuid, sessionData);
        
        // Actualizar session_context en Redis con la nueva activeOrgId e info de la org
        // Si updateActiveOrg falla (cache expirado), reconstruir contexto completo
        let updatedContext = await sessionContextCache.updateActiveOrg(userId, organizationUuid, {
            publicCode: org.public_code,
            name: org.name,
            logoUrl: org.logo_url
        });
        
        if (!updatedContext) {
            const user = await authRepository.findUserById(userId);
            const primaryOrg = await organizationService.getPrimaryOrganization(userId);
            const primaryOrgId = primaryOrg ? primaryOrg.organization_id : null;
            
            let primaryOrgInfo = null;
            if (primaryOrgId) {
                const primaryOrgDetails = await organizationRepository.findOrganizationByIdInternal(primaryOrgId);
                if (primaryOrgDetails) {
                    primaryOrgInfo = {
                        publicCode: primaryOrgDetails.public_code,
                        name: primaryOrgDetails.name,
                        logoUrl: primaryOrgDetails.logo_url
                    };
                }
            }
            
            updatedContext = {
                activeOrgId: organizationUuid,
                activeOrgPublicCode: org.public_code,
                activeOrgName: org.name,
                activeOrgLogoUrl: org.logo_url || null,
                primaryOrgId,
                primaryOrgPublicCode: primaryOrgInfo?.publicCode || null,
                primaryOrgName: primaryOrgInfo?.name || null,
                primaryOrgLogoUrl: primaryOrgInfo?.logoUrl || null,
                canAccessAllOrgs: user?.role?.name === 'system-admin',
                role: user?.role?.name || null,
                email: user?.email || null,
                firstName: user?.first_name || null,
                lastName: user?.last_name || null,
                userId,
                userPublicCode: user?.public_code || null
            };
            
            await sessionContextCache.setSessionContext(userId, updatedContext);
        }
        
        // Audit log para switch de organización
        logAuditAction({
            entityType: 'auth',
            entityId: req.user.userId,
            action: 'organization_switched',
            performedBy: req.user.userId,
            metadata: {
                previous_org_id: req.user.activeOrgId || null,
                new_org_public_code: org.public_code,
                new_org_name: org.name
            },
            ...extractAuditInfo(req)
        });
        
        return successResponse(res, {
            ...result,
            session_context: sessionContextCache.sanitizeSessionContext(updatedContext)
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/impersonate-org:
 *   post:
 *     summary: Impersonar una organización (solo system-admin)
 *     description: |
 *       Permite a un system-admin "entrar" a una organización específica para ver/gestionar
 *       sus recursos como si fuera parte de ella. El JWT resultante tendrá `impersonating: true`.
 *       
 *       **Diferencia con switch-org:**
 *       - switch-org: Cambia entre orgs a las que el usuario pertenece
 *       - impersonate-org: Permite a system-admin acceder a CUALQUIER org
 *       
 *       El frontend debe mostrar un indicador visual cuando `impersonating: true`.
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
 *                 description: Public code de la organización a impersonar (ej. ORG-XXXXX)
 *                 example: ORG-ABC123-4
 *     responses:
 *       200:
 *         description: Impersonación exitosa, nuevos tokens emitidos
 *       403:
 *         description: Solo system-admin puede usar este endpoint
 *       404:
 *         description: Organización no encontrada
 */
router.post('/impersonate-org', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        
        // Solo system-admin puede impersonar
        if (userRole !== 'system-admin') {
            return errorResponse(res, {
                message: 'auth.permission.denied',
                status: 403,
                code: 'SYSTEM_ADMIN_REQUIRED'
            });
        }
        
        const { organization_id } = req.body;
        
        if (!organization_id) {
            return errorResponse(res, {
                message: 'organization_id is required',
                status: 400,
                code: 'MISSING_ORGANIZATION_ID'
            });
        }
        
        // Obtener información completa de la organización a impersonar
        let org;
        const isUuid = organization_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        
        if (isUuid) {
            org = await organizationRepository.findOrganizationByIdInternal(organization_id);
        } else {
            org = await organizationRepository.findOrganizationByPublicCodeInternal(organization_id);
        }
        
        if (!org) {
            return errorResponse(res, {
                message: 'Organización no encontrada',
                status: 404,
                code: 'ORGANIZATION_NOT_FOUND'
            });
        }
        
        const organizationUuid = org.id;
        const orgPublicCode = org.public_code;
        
        // Extraer datos de sesión
        const sessionData = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress,
            activeOrgId: organizationUuid // Setear la org a impersonar
        };
        
        // Generar nuevos tokens con la org activa (impersonating se calculará automáticamente)
        const result = await authServices.switchOrganization(userId, organizationUuid, sessionData);
        
        // Reconstruir session_context completo en Redis (no depender de updateActiveOrg que falla si cache expirado)
        const existingContext = await sessionContextCache.getSessionContext(userId);
        const user = await authRepository.findUserById(userId);
        const primaryOrg = await organizationService.getPrimaryOrganization(userId);
        const primaryOrgId = primaryOrg ? primaryOrg.organization_id : null;
        
        // Obtener info de la org primaria
        let primaryOrgInfo = null;
        if (primaryOrgId) {
            const primaryOrgDetails = await organizationRepository.findOrganizationByIdInternal(primaryOrgId);
            if (primaryOrgDetails) {
                primaryOrgInfo = {
                    publicCode: primaryOrgDetails.public_code,
                    name: primaryOrgDetails.name,
                    logoUrl: primaryOrgDetails.logo_url
                };
            }
        }
        
        const updatedContext = {
            ...(existingContext || {}),
            activeOrgId: organizationUuid,
            activeOrgPublicCode: org.public_code,
            activeOrgName: org.name,
            activeOrgLogoUrl: org.logo_url || null,
            primaryOrgId,
            primaryOrgPublicCode: primaryOrgInfo?.publicCode || null,
            primaryOrgName: primaryOrgInfo?.name || null,
            primaryOrgLogoUrl: primaryOrgInfo?.logoUrl || null,
            canAccessAllOrgs: true,
            role: user?.role?.name || 'system-admin',
            email: user?.email || existingContext?.email || null,
            firstName: user?.first_name || existingContext?.firstName || null,
            lastName: user?.last_name || existingContext?.lastName || null,
            userId,
            userPublicCode: user?.public_code || existingContext?.userPublicCode || null
        };
        
        await sessionContextCache.setSessionContext(userId, updatedContext);
        
        // Audit log para inicio de impersonación
        logAuditAction({
            entityType: 'auth',
            entityId: userId,
            action: 'impersonate_started',
            performedBy: userId,
            metadata: { 
                impersonated_org_public_code: orgPublicCode,
                impersonated_org_name: org.name
            },
            ...extractAuditInfo(req),
            impersonatedOrgId: organizationUuid
        });
        
        return successResponse(res, {
            ...result,
            session_context: sessionContextCache.sanitizeSessionContext(updatedContext),
            impersonating: true,
            impersonatedOrg: { publicCode: orgPublicCode },
            message: 'Impersonation started successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /auth/exit-impersonation:
 *   post:
 *     summary: Salir del modo impersonación (solo system-admin)
 *     description: |
 *       Permite a un system-admin salir del modo impersonación y volver al panel admin global.
 *       El JWT resultante tendrá `activeOrgId: null` e `impersonating: false`.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Salida de impersonación exitosa, nuevos tokens emitidos
 *       403:
 *         description: Solo system-admin puede usar este endpoint
 */
router.post('/exit-impersonation', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        
        // Solo system-admin puede usar este endpoint
        if (userRole !== 'system-admin') {
            return errorResponse(res, {
                message: 'auth.permission.denied',
                status: 403,
                code: 'SYSTEM_ADMIN_REQUIRED'
            });
        }
        
        // Extraer datos de sesión con activeOrgId explícitamente null
        const sessionData = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress,
            activeOrgId: null // Volver a modo admin global
        };
        
        // Obtener usuario para generar tokens
        const user = await authRepository.findUserById(userId);
        if (!user) {
            return errorResponse(res, {
                message: 'Usuario no encontrado',
                status: 404,
                code: 'USER_NOT_FOUND'
            });
        }
        
        // Generar nuevos tokens sin org activa
        const tokens = await authServices.generateTokensForUser(user, sessionData);
        
        // Reconstruir session_context completo para modo admin global (sin org activa)
        const primaryOrg = await organizationService.getPrimaryOrganization(userId);
        const primaryOrgId = primaryOrg ? primaryOrg.organization_id : null;
        
        let primaryOrgInfo = null;
        if (primaryOrgId) {
            const primaryOrgDetails = await organizationRepository.findOrganizationByIdInternal(primaryOrgId);
            if (primaryOrgDetails) {
                primaryOrgInfo = {
                    publicCode: primaryOrgDetails.public_code,
                    name: primaryOrgDetails.name,
                    logoUrl: primaryOrgDetails.logo_url
                };
            }
        }
        
        const updatedContext = {
            activeOrgId: null,
            activeOrgPublicCode: null,
            activeOrgName: null,
            activeOrgLogoUrl: null,
            primaryOrgId,
            primaryOrgPublicCode: primaryOrgInfo?.publicCode || null,
            primaryOrgName: primaryOrgInfo?.name || null,
            primaryOrgLogoUrl: primaryOrgInfo?.logoUrl || null,
            canAccessAllOrgs: true,
            role: user.role?.name || 'system-admin',
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            userId,
            userPublicCode: user.public_code || null
        };
        
        await sessionContextCache.setSessionContext(userId, updatedContext);
        
        // Audit log para fin de impersonación
        logAuditAction({
            entityType: 'auth',
            entityId: userId,
            action: 'impersonate_ended',
            performedBy: userId,
            metadata: { 
                previous_org_id: req.user.activeOrgId || null
            },
            ...extractAuditInfo(req)
        });
        
        return successResponse(res, {
            ...tokens,
            session_context: sessionContextCache.sanitizeSessionContext(updatedContext),
            impersonating: false,
            impersonatedOrg: null,
            message: 'Exited impersonation mode successfully'
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
        
        // Agregar información de impersonación para system-admin
        const isSystemAdmin = req.user.role === 'system-admin';
        const impersonationInfo = isSystemAdmin ? {
            impersonating: req.user.impersonating || false,
            impersonatedOrg: req.user.impersonating && req.user.activeOrgId 
                ? { publicCode: sessionContext?.activeOrgPublicCode || null }
                : null
        } : {};
        
        return successResponse(res, { 
            session_context: sessionContextCache.sanitizeSessionContext(sessionContext),
            ...impersonationInfo,
            message: 'Session context retrieved successfully'
        });
    } catch (error) {
        next(error);
    }
});

export default router;
