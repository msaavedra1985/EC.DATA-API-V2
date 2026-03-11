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
import { authLogger } from '../../utils/logger.js';

const router = express.Router();


// 📄 Swagger: src/docs/swagger/auth.yaml -> POST /register
router.post('/register', validate(registerSchema), async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, organizationId } = req.body;

        // Extraer datos de sesión para auditoría
        const sessionData = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
        };

        const result = await authServices.register({
            email,
            password,
            firstName,
            lastName,
            organizationId
        }, sessionData);

        return successResponse(res, { ...result, message: 'auth.register.success' }, 201);
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/auth.yaml -> POST /login
router.post('/login', loginRateLimitMiddleware, validate(loginSchema), async (req, res, next) => {
    try {
        const { identifier: rawIdentifier, email, password, rememberMe, captchaToken, organizationId } = req.body;
        // Compatibilidad: usar identifier si existe, sino usar email (campo legacy)
        const identifier = rawIdentifier || email;
        const ip = req.ip || req.connection.remoteAddress;

        // Resolver organizationId (public_code) a UUID si fue enviado
        // Envuelto en try/catch: si falla la resolución, el login continúa normalmente
        let resolvedOrgId = null;
        if (organizationId) {
            try {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId);
                if (isUuid) {
                    resolvedOrgId = organizationId;
                } else {
                    const org = await organizationRepository.findOrganizationByPublicCodeInternal(organizationId);
                    if (org) {
                        resolvedOrgId = org.id;
                    }
                }
            } catch (orgResolveError) {
                authLogger.warn({ organizationId, error: orgResolveError.message }, 'Login: error resolviendo organizationId, se ignorará');
            }
        }

        // Extraer datos de sesión para auditoría y validación
        const sessionData = {
            userAgent: req.headers['user-agent'],
            ipAddress: ip,
            rememberMe: rememberMe || false,
            captchaToken: captchaToken || null,
            requestedOrgId: resolvedOrgId
        };

        try {
            const result = await authServices.login(identifier, password, sessionData);

            // Login exitoso: resetear contadores de rate limiting
            await resetLoginCounters(ip, identifier);

            // Session context ya fue cacheado en services.js login()
            // Leer el contexto para incluirlo en la respuesta
            const sessionContext = await sessionContextCache.getSessionContext(result.user.id);

            // Filtrar user a solo campos relevantes para el frontend
            // NO exponemos: id, roleId, humanId, organizationId, createdAt, updatedAt, etc.
            const userResponse = {
                publicCode: result.user.publicCode,
                email: result.user.email,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                avatarUrl: result.user.avatarUrl || null,
                language: result.user.language || 'es',
                timezone: result.user.timezone || 'America/Lima',
                role: result.user.role?.name || null,
                permissions: result.user.role?.permissions || []
            };
            
            const responseData = {
                ...result,
                user: userResponse,
                sessionContext: sessionContextCache.sanitizeSessionContext(sessionContext),
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


// 📄 Swagger: src/docs/swagger/auth.yaml -> POST /refresh
router.post('/refresh', validate(refreshTokenSchema), async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        // Extraer datos de sesión para auditoría
        const sessionData = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
        };

        const tokens = await authServices.refreshAccessToken(refreshToken, sessionData);

        return successResponse(res, { ...tokens, message: 'auth.refresh.success' });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/auth.yaml -> POST /change-password
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        await authServices.changePassword(userId, currentPassword, newPassword);

        return successResponse(res, {
            message: 'auth.password.changed'
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/auth.yaml -> GET /me
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
        // Para system-admin con JWT stale (activeOrgId: null), NO cachear la reconstrucción
        // ya que el próximo refresh/impersonate corregirá Redis con el valor correcto
        if (!sessionContext) {
            const primaryOrg = await organizationService.getPrimaryOrganization(userId);
            const primaryOrgId = primaryOrg ? primaryOrg.organizationId : null;
            const canAccessAllOrgs = user.role?.name === 'system-admin';
            // Resolver publicCode del JWT → UUID para uso interno (los repos de org necesitan UUID)
            const activeOrgCode = req.user.activeOrgCode;
            let activeOrgId = primaryOrgId;
            if (activeOrgCode) {
                const resolvedActiveOrg = await organizationRepository.findOrganizationByPublicCodeInternal(activeOrgCode);
                if (resolvedActiveOrg) {
                    activeOrgId = resolvedActiveOrg.id;
                }
            }
            
            let primaryOrgInfo = null;
            if (primaryOrgId) {
                const primaryOrgDetails = await organizationRepository.findOrganizationByIdInternal(primaryOrgId);
                if (primaryOrgDetails) {
                    primaryOrgInfo = {
                        publicCode: primaryOrgDetails.publicCode,
                        name: primaryOrgDetails.name,
                        logoUrl: primaryOrgDetails.logoUrl
                    };
                }
            }
            
            let activeOrgInfo = null;
            if (activeOrgId && activeOrgId !== primaryOrgId) {
                const activeOrgDetails = await organizationRepository.findOrganizationByIdInternal(activeOrgId);
                if (activeOrgDetails) {
                    activeOrgInfo = {
                        publicCode: activeOrgDetails.publicCode,
                        name: activeOrgDetails.name,
                        logoUrl: activeOrgDetails.logoUrl
                    };
                }
            } else if (activeOrgId && activeOrgId === primaryOrgId) {
                activeOrgInfo = primaryOrgInfo;
            }
            
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
                firstName: user.firstName,
                lastName: user.lastName,
                userId: user.id,
                userPublicCode: user.publicCode || null
            };
            
            // Solo cachear si NO es system-admin con JWT potencialmente stale
            // System-admin sin activeOrgId en JWT podría estar impersonando (JWT stale por race condition)
            const isSystemAdminWithStaleJwt = canAccessAllOrgs && !req.user.activeOrgCode;
            if (!isSystemAdminWithStaleJwt) {
                await sessionContextCache.setSessionContext(userId, sessionContext);
            }
        }

        // Filtrar user a solo campos relevantes para el frontend
        const userResponse = {
            publicCode: user.publicCode,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl || null,
            language: user.language || 'es',
            timezone: user.timezone || 'America/Lima',
            role: user.role?.name || null,
            permissions: user.role?.permissions || []
        };
        
        // Agregar información de impersonación para system-admin
        const isSystemAdmin = req.user.role === 'system-admin';
        const impersonationInfo = isSystemAdmin ? {
            impersonating: req.user.impersonating || false,
            impersonatedOrg: req.user.impersonating && req.user.activeOrgCode 
                ? { publicCode: sessionContext.activeOrgPublicCode || null }
                : null
        } : {};

        return successResponse(res, { 
            user: userResponse, 
            sessionContext: sessionContextCache.sanitizeSessionContext(sessionContext),
            ...impersonationInfo,
            message: 'auth.profile.retrieved' 
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/auth.yaml -> POST /logout
router.post('/logout', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { refreshToken } = req.body;

        // Si se proporciona refreshToken, hacer logout de esa sesión específica
        if (refreshToken) {
            await authServices.logout(refreshToken);
            
            return successResponse(res, {
                message: 'auth.logout.success'
            });
        }

        // Si NO se proporciona refreshToken, hacer logout de TODAS las sesiones
        const sessionsRevoked = await authServices.logoutAll(userId);

        return successResponse(res, {
            message: 'auth.logout.all_success',
            sessionsClosed: sessionsRevoked
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/auth.yaml -> POST /logout-all
router.post('/logout-all', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const sessionsRevoked = await authServices.logoutAll(userId);

        return successResponse(res, {
            message: 'auth.logout.all_success',
            sessionsClosed: sessionsRevoked
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/auth.yaml -> GET /sessions
router.get('/sessions', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const sessions = await authServices.getUserSessions(userId);

        return successResponse(res, { sessions, message: 'auth.sessions.retrieved' });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/auth.yaml -> POST /sessions/:sessionId/revoke
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


// 📄 Swagger: src/docs/swagger/auth.yaml -> GET /admin-test
router.get('/admin-test', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res, next) => {
    try {
        return successResponse(res, {
            message: 'Acceso autorizado - Eres un administrador',
            userRole: req.user.role,
            userId: req.user.userId
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/auth.yaml -> GET /organizations
router.get('/organizations', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const organizations = await authServices.getUserAvailableOrganizations(userId);
        
        return successResponse(res, organizations);
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/auth.yaml -> POST /switch-org
router.post('/switch-org', authenticate, validate(switchOrgSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { organizationId } = req.body;
        
        // Obtener información completa de la organización
        let org;
        if (!organizationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            // Es publicCode
            org = await organizationRepository.findOrganizationByPublicCodeInternal(organizationId);
        } else {
            // Es UUID
            org = await organizationRepository.findOrganizationByIdInternal(organizationId);
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
            publicCode: org.publicCode,
            name: org.name,
            logoUrl: org.logoUrl
        });
        
        if (!updatedContext) {
            const user = await authRepository.findUserById(userId);
            const primaryOrg = await organizationService.getPrimaryOrganization(userId);
            const primaryOrgId = primaryOrg ? primaryOrg.organizationId : null;
            
            let primaryOrgInfo = null;
            if (primaryOrgId) {
                const primaryOrgDetails = await organizationRepository.findOrganizationByIdInternal(primaryOrgId);
                if (primaryOrgDetails) {
                    primaryOrgInfo = {
                        publicCode: primaryOrgDetails.publicCode,
                        name: primaryOrgDetails.name,
                        logoUrl: primaryOrgDetails.logoUrl
                    };
                }
            }
            
            updatedContext = {
                activeOrgId: organizationUuid,
                activeOrgPublicCode: org.publicCode,
                activeOrgName: org.name,
                activeOrgLogoUrl: org.logoUrl || null,
                primaryOrgId,
                primaryOrgPublicCode: primaryOrgInfo?.publicCode || null,
                primaryOrgName: primaryOrgInfo?.name || null,
                primaryOrgLogoUrl: primaryOrgInfo?.logoUrl || null,
                canAccessAllOrgs: user?.role?.name === 'system-admin',
                role: user?.role?.name || null,
                email: user?.email || null,
                firstName: user?.firstName || null,
                lastName: user?.lastName || null,
                userId,
                userPublicCode: user?.publicCode || null
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
                previous_org_code: req.user.activeOrgCode || null,
                new_org_public_code: org.publicCode,
                new_org_name: org.name
            },
            ...extractAuditInfo(req)
        });
        
        return successResponse(res, {
            ...result,
            sessionContext: sessionContextCache.sanitizeSessionContext(updatedContext)
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/auth.yaml -> POST /impersonate-org
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
        
        const { organizationId } = req.body;
        
        if (!organizationId) {
            return errorResponse(res, {
                message: 'organizationId is required',
                status: 400,
                code: 'MISSING_ORGANIZATION_ID'
            });
        }
        
        // Obtener información completa de la organización a impersonar
        let org;
        const isUuid = organizationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        
        if (isUuid) {
            org = await organizationRepository.findOrganizationByIdInternal(organizationId);
        } else {
            org = await organizationRepository.findOrganizationByPublicCodeInternal(organizationId);
        }
        
        if (!org) {
            return errorResponse(res, {
                message: 'Organización no encontrada',
                status: 404,
                code: 'ORGANIZATION_NOT_FOUND'
            });
        }
        
        const organizationUuid = org.id;
        const orgPublicCode = org.publicCode;
        
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
        const primaryOrgId = primaryOrg ? primaryOrg.organizationId : null;
        
        // Obtener info de la org primaria
        let primaryOrgInfo = null;
        if (primaryOrgId) {
            const primaryOrgDetails = await organizationRepository.findOrganizationByIdInternal(primaryOrgId);
            if (primaryOrgDetails) {
                primaryOrgInfo = {
                    publicCode: primaryOrgDetails.publicCode,
                    name: primaryOrgDetails.name,
                    logoUrl: primaryOrgDetails.logoUrl
                };
            }
        }
        
        const updatedContext = {
            ...(existingContext || {}),
            activeOrgId: organizationUuid,
            activeOrgPublicCode: org.publicCode,
            activeOrgName: org.name,
            activeOrgLogoUrl: org.logoUrl || null,
            primaryOrgId,
            primaryOrgPublicCode: primaryOrgInfo?.publicCode || null,
            primaryOrgName: primaryOrgInfo?.name || null,
            primaryOrgLogoUrl: primaryOrgInfo?.logoUrl || null,
            canAccessAllOrgs: true,
            role: user?.role?.name || 'system-admin',
            email: user?.email || existingContext?.email || null,
            firstName: user?.firstName || existingContext?.firstName || null,
            lastName: user?.lastName || existingContext?.lastName || null,
            userId,
            userPublicCode: user?.publicCode || existingContext?.userPublicCode || null
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
            sessionContext: sessionContextCache.sanitizeSessionContext(updatedContext),
            impersonating: true,
            impersonatedOrg: { publicCode: orgPublicCode },
            message: 'Impersonation started successfully'
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/auth.yaml -> POST /exit-impersonation
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
        const primaryOrgId = primaryOrg ? primaryOrg.organizationId : null;
        
        let primaryOrgInfo = null;
        if (primaryOrgId) {
            const primaryOrgDetails = await organizationRepository.findOrganizationByIdInternal(primaryOrgId);
            if (primaryOrgDetails) {
                primaryOrgInfo = {
                    publicCode: primaryOrgDetails.publicCode,
                    name: primaryOrgDetails.name,
                    logoUrl: primaryOrgDetails.logoUrl
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
            firstName: user.firstName,
            lastName: user.lastName,
            userId,
            userPublicCode: user.publicCode || null
        };
        
        await sessionContextCache.setSessionContext(userId, updatedContext);
        
        // Audit log para fin de impersonación
        logAuditAction({
            entityType: 'auth',
            entityId: userId,
            action: 'impersonate_ended',
            performedBy: userId,
            metadata: { 
                previous_org_code: req.user.activeOrgCode || null
            },
            ...extractAuditInfo(req)
        });
        
        return successResponse(res, {
            ...tokens,
            sessionContext: sessionContextCache.sanitizeSessionContext(updatedContext),
            impersonating: false,
            impersonatedOrg: null,
            message: 'Exited impersonation mode successfully'
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/auth.yaml -> GET /session-context
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
            impersonatedOrg: req.user.impersonating && req.user.activeOrgCode 
                ? { publicCode: sessionContext?.activeOrgPublicCode || null }
                : null
        } : {};
        
        return successResponse(res, { 
            sessionContext: sessionContextCache.sanitizeSessionContext(sessionContext),
            ...impersonationInfo,
            message: 'Session context retrieved successfully'
        });
    } catch (error) {
        next(error);
    }
});

export default router;
