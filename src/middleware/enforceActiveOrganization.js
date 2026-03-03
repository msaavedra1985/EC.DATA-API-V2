// middleware/enforceActiveOrganization.js
// Middleware para establecer contexto de organización desde JWT
// Implementa aislamiento de datos por tenant sin mutar req.query
// Soporta JWT de sesión web y JWT de API key para clientes externos

import { canAccessOrganization, getOrganizationScope } from '../modules/organizations/services.js';
import * as orgRepository from '../modules/organizations/repository.js';
import { getCache, setCache, deleteCache } from '../db/redis/client.js';
import { errorResponse } from '../utils/response.js';
import { getSessionContext } from '../modules/auth/sessionContextCache.js';
import logger from '../utils/logger.js';

const orgLogger = logger.child({ component: 'enforceActiveOrganization' });

// Roles que pueden usar all=true para ver todas las organizaciones
const ADMIN_ROLES = ['system-admin', 'org-admin'];

// Regex para validar formato UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cache de resolución de org: TTL 5 minutos
const ORG_RESOLVE_CACHE_PREFIX = 'ec:org_resolve:';
const ORG_RESOLVE_TTL = 300;

/**
 * Resuelve un ID de organización (public_code o UUID) a su UUID interno
 * Usa cache Redis (TTL 5 min) para evitar query a DB en cada request
 * 
 * @param {string} orgId - Public code o UUID de la organización
 * @returns {Promise<{uuid: string, publicCode: string, isActive: boolean, isDeleted: boolean}|null>}
 */
const resolveOrganizationId = async (orgId) => {
    if (!orgId) return null;
    
    // Intentar leer desde cache Redis
    const cacheKey = `${ORG_RESOLVE_CACHE_PREFIX}${orgId}`;
    try {
        const cached = await getCache(cacheKey);
        if (cached) {
            const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
            if (parsed && parsed.uuid && parsed.publicCode && typeof parsed.isActive === 'boolean') {
                return parsed;
            }
        }
    } catch {
        // Si cache falla, continuar con DB
    }
    
    const isUuid = UUID_REGEX.test(orgId);
    let org;
    
    if (isUuid) {
        org = await orgRepository.findOrganizationByIdInternal(orgId);
    } else {
        org = await orgRepository.findOrganizationByPublicCodeInternal(orgId);
    }
    
    if (!org) return null;
    
    const result = { 
        uuid: org.id, 
        publicCode: org.publicCode,
        isActive: org.isActive !== false,
        isDeleted: !!org.deletedAt
    };
    
    // Guardar en cache (por UUID y por publicCode para ambas vías de lookup)
    try {
        const serialized = JSON.stringify(result);
        await setCache(cacheKey, serialized, ORG_RESOLVE_TTL);
        // Cache bidireccional: si buscaron por publicCode, cachear también por UUID y viceversa
        const altKey = isUuid 
            ? `${ORG_RESOLVE_CACHE_PREFIX}${org.publicCode}`
            : `${ORG_RESOLVE_CACHE_PREFIX}${org.id}`;
        await setCache(altKey, serialized, ORG_RESOLVE_TTL);
    } catch {
        // Cache es best-effort, no bloquear si falla
    }
    
    return result;
};

/**
 * Invalida el cache de resolución de una organización
 * Llamar cuando se modifique is_active, deleted_at, o public_code de una org
 * 
 * @param {string} orgUuid - UUID de la organización
 * @param {string} orgPublicCode - Public code de la organización
 */
export const invalidateOrgResolveCache = async (orgUuid, orgPublicCode) => {
    try {
        if (orgUuid) await deleteCache(`${ORG_RESOLVE_CACHE_PREFIX}${orgUuid}`);
        if (orgPublicCode) await deleteCache(`${ORG_RESOLVE_CACHE_PREFIX}${orgPublicCode}`);
    } catch {
        // Best-effort
    }
};

/**
 * Valida que una organización resuelta esté activa y no eliminada
 * 
 * @param {Object} resolved - Resultado de resolveOrganizationId
 * @param {Object} res - Express response
 * @param {Object} logContext - Contexto para logging
 * @returns {boolean} true si la org es inválida (ya se envió respuesta), false si está OK
 */
const isOrgInactive = (resolved, res, logContext = {}) => {
    if (resolved.isDeleted) {
        orgLogger.warn({
            ...logContext,
            organizationId: resolved.uuid
        }, 'Attempt to access deleted organization');

        errorResponse(res, {
            message: 'auth.organization.inactive',
            status: 403,
            code: 'ORGANIZATION_INACTIVE'
        });
        return true;
    }

    if (!resolved.isActive) {
        orgLogger.warn({
            ...logContext,
            organizationId: resolved.uuid
        }, 'Attempt to access inactive organization');

        errorResponse(res, {
            message: 'auth.organization.inactive',
            status: 403,
            code: 'ORGANIZATION_INACTIVE'
        });
        return true;
    }

    return false;
};

/**
 * Middleware para establecer contexto de organización en req.organizationContext
 * 
 * ARQUITECTURA:
 * - NO modifica req.query (los datos del cliente permanecen intactos)
 * - Setea req.organizationContext con toda la información necesaria
 * - Soporta tanto JWT de sesión web como JWT de API key para clientes externos
 * 
 * ESTRUCTURA DE req.organizationContext:
 * {
 *   id: string,              // UUID interno de la organización (siempre resuelto)
 *   publicCode: string,      // Public code de la organización
 *   source: string,          // 'jwt' | 'query' | 'api_key' - De dónde vino el contexto
 *   tokenType: string,       // 'session' | 'api_key' - Tipo de token
 *   scopes: string[],        // Scopes permitidos (solo para API keys)
 *   clientId: string|null,   // ID del cliente API (solo para API keys)
 *   showAll: boolean,        // true si admin pidió all=true
 *   allowedIds: string[],    // UUIDs permitidos (para admins con scope limitado)
 *   enforced: boolean,       // true si se forzó filtrado por organización
 *   canAccessAll: boolean    // true si tiene acceso sin restricciones
 * }
 * 
 * CASOS DE USO:
 * 1. JWT de sesión sin filtro → Usa activeOrgId del JWT
 * 2. JWT de sesión con organization_id en query → Valida acceso y usa ese ID
 * 3. JWT de sesión con all=true → Solo admins, acceso a todas o scope limitado
 * 4. JWT de API key → Fijo a la organización del token, sin switch
 * 
 * @returns {Function} - Middleware de Express
 */
export const enforceActiveOrganization = async (req, res, next) => {
    try {
        const user = req.user;

        // Verificar que el usuario esté autenticado
        if (!user) {
            return errorResponse(res, {
                message: 'auth.token.missing',
                status: 401,
                code: 'UNAUTHORIZED'
            });
        }

        // SEGURIDAD CRÍTICA: Detectar intentos de inyección de organization_ids
        // Este parámetro solo es válido cuando es seteado internamente
        if (req.query.organization_ids) {
            orgLogger.warn({
                userId: user.userId,
                role: user.role,
                path: req.path,
                attemptedIds: Array.isArray(req.query.organization_ids) 
                    ? req.query.organization_ids.length 
                    : 'non-array'
            }, 'Client attempted to inject organization_ids - ignored');
        }

        // Detectar tipo de token
        const tokenType = user.tokenType === 'api_key' ? 'api_key' : 'session';
        const isApiKey = tokenType === 'api_key';

        // ============ CASO: JWT de API Key (clientes externos) ============
        if (isApiKey) {
            // Los API keys están fijos a una organización, no pueden cambiar
            const apiOrgId = user.organizationId || user.activeOrgId;
            
            if (!apiOrgId) {
                orgLogger.warn({
                    clientId: user.clientId,
                    path: req.path
                }, 'API key JWT has no organization bound');

                return errorResponse(res, {
                    message: 'auth.api_key.no_organization',
                    status: 400,
                    code: 'API_KEY_NO_ORGANIZATION'
                });
            }

            const resolved = await resolveOrganizationId(apiOrgId);
            
            if (!resolved) {
                return errorResponse(res, {
                    message: 'errors.organization.not_found',
                    status: 404,
                    code: 'ORGANIZATION_NOT_FOUND'
                });
            }

            if (isOrgInactive(resolved, res, { clientId: user.clientId, path: req.path })) return;

            // Establecer contexto para API key
            req.organizationContext = {
                id: resolved.uuid,
                publicCode: resolved.publicCode,
                source: 'api_key',
                tokenType: 'api_key',
                scopes: user.scopes || [],
                clientId: user.clientId || null,
                showAll: false,
                allowedIds: [resolved.uuid],
                enforced: true,
                canAccessAll: false
            };

            orgLogger.debug({
                clientId: user.clientId,
                organizationId: resolved.uuid
            }, 'API key context established');

            return next();
        }

        // ============ CASO: JWT de Sesión Web ============
        const requestedOrgId = req.query.organization_id;
        const requestAll = req.query.all === 'true';

        // --- Caso 1: Usuario solicita ver TODOS los registros (all=true) ---
        if (requestAll) {
            if (!ADMIN_ROLES.includes(user.role)) {
                orgLogger.warn({
                    userId: user.userId,
                    role: user.role,
                    path: req.path
                }, 'Non-admin user attempted to use all=true');

                return errorResponse(res, {
                    message: 'auth.permission.denied',
                    status: 403,
                    code: 'ALL_RECORDS_NOT_ALLOWED'
                });
            }

            // Para system-admin: verificar si hay impersonación activa antes de dar acceso global
            // Si está impersonando, ?all=true se limita a la org impersonada (no bypasea la impersonación)
            // Precedencia: Redis (fuente de verdad) > JWT (fallback si Redis no disponible)
            if (user.role === 'system-admin') {
                let impersonatedOrgId = null;
                let redisHasContext = false;
                
                try {
                    const sessionCtx = await getSessionContext(user.userId);
                    if (sessionCtx) {
                        redisHasContext = true;
                        if (sessionCtx.activeOrgId) {
                            impersonatedOrgId = sessionCtx.activeOrgId;
                        }
                        // Si Redis tiene contexto con activeOrgId: null → modo global explícito, no impersonando
                    }
                } catch (redisErr) {
                    orgLogger.warn({ userId: user.userId, err: redisErr }, 'Redis no disponible al verificar impersonación en all=true');
                }
                
                // JWT como fallback solo si Redis no tenía contexto (caído o sin data)
                // Si Redis SÍ tiene contexto con activeOrgId: null, eso es modo global explícito → no usar JWT
                if (!redisHasContext && user.activeOrgId) {
                    impersonatedOrgId = user.activeOrgId;
                }
                
                if (impersonatedOrgId) {
                    const resolved = await resolveOrganizationId(impersonatedOrgId);
                    if (!resolved) {
                        orgLogger.warn({
                            userId: user.userId,
                            impersonatedOrgId,
                            path: req.path
                        }, 'Impersonated org not resolvable, denying all=true');

                        return errorResponse(res, {
                            message: 'auth.organization.not_found',
                            status: 404,
                            code: 'ACTIVE_ORGANIZATION_NOT_FOUND'
                        });
                    }

                    if (isOrgInactive(resolved, res, { userId: user.userId, role: user.role, path: req.path })) return;

                    req.organizationContext = {
                        id: resolved.uuid,
                        publicCode: resolved.publicCode,
                        source: redisHasContext ? 'session_context' : 'jwt',
                        tokenType: 'session',
                        scopes: [],
                        clientId: null,
                        showAll: false,
                        allowedIds: [resolved.uuid],
                        enforced: true,
                        canAccessAll: false,
                        impersonating: true
                    };

                    orgLogger.debug({
                        userId: user.userId,
                        role: user.role,
                        impersonatedOrgId: resolved.publicCode,
                        allParamIgnored: true,
                        source: redisHasContext ? 'session_context' : 'jwt'
                    }, 'System admin impersonando: ?all=true ignorado, filtrando por org impersonada');

                    return next();
                }
            }

            const scope = await getOrganizationScope(user.userId, user.role);

            if (scope.canAccessAll) {
                req.organizationContext = {
                    id: null,
                    publicCode: null,
                    source: 'jwt',
                    tokenType: 'session',
                    scopes: [],
                    clientId: null,
                    showAll: true,
                    allowedIds: [],
                    enforced: false,
                    canAccessAll: true
                };

                orgLogger.debug({
                    userId: user.userId,
                    role: user.role,
                    showAll: true,
                    canAccessAll: true
                }, 'System admin requested all records without restrictions (no impersonation active)');

                return next();
            }

            const allowedOrgIds = scope.organizationIds || [];

            if (allowedOrgIds.length === 0) {
                orgLogger.warn({
                    userId: user.userId,
                    role: user.role,
                    path: req.path
                }, 'Admin with all=true has no accessible organizations');

                return errorResponse(res, {
                    message: 'auth.organization.no_accessible',
                    status: 403,
                    code: 'NO_ACCESSIBLE_ORGANIZATIONS'
                });
            }

            req.organizationContext = {
                id: null,
                publicCode: null,
                source: 'jwt',
                tokenType: 'session',
                scopes: [],
                clientId: null,
                showAll: true,
                allowedIds: allowedOrgIds,
                enforced: true,
                canAccessAll: false
            };

            orgLogger.debug({
                userId: user.userId,
                role: user.role,
                showAll: true,
                allowedOrgsCount: allowedOrgIds.length
            }, 'Scoped admin requested all records within permitted organizations');

            return next();
        }

        // --- Caso 2: Usuario especifica organization_id explícitamente en query ---
        if (requestedOrgId) {
            const resolved = await resolveOrganizationId(requestedOrgId);
            
            if (!resolved) {
                return errorResponse(res, {
                    message: 'errors.organization.not_found',
                    status: 404,
                    code: 'ORGANIZATION_NOT_FOUND'
                });
            }

            if (isOrgInactive(resolved, res, { userId: user.userId, role: user.role, path: req.path })) return;

            // Verificar que el usuario tiene acceso a esta organización
            const hasAccess = await canAccessOrganization(
                user.userId,
                resolved.uuid,
                user.role
            );

            if (!hasAccess) {
                orgLogger.warn({
                    userId: user.userId,
                    role: user.role,
                    requestedOrgId,
                    path: req.path
                }, 'User attempted to access unauthorized organization');

                return errorResponse(res, {
                    message: 'auth.organization.access_denied',
                    status: 403,
                    code: 'ORGANIZATION_ACCESS_DENIED'
                });
            }

            req.organizationContext = {
                id: resolved.uuid,
                publicCode: resolved.publicCode,
                source: 'query',
                tokenType: 'session',
                scopes: [],
                clientId: null,
                showAll: false,
                allowedIds: [resolved.uuid],
                enforced: true,
                canAccessAll: false
            };

            orgLogger.debug({
                userId: user.userId,
                organizationId: resolved.uuid,
                source: 'query'
            }, 'User accessing specific organization from query param');

            return next();
        }

        // --- Caso 3: Usuario no especifica filtro - usar organización activa ---
        // Para system-admin: Redis es FUENTE DE VERDAD (JWT puede ser stale por race conditions del frontend)
        // Para otros roles: usar activeOrgId del JWT directamente
        
        if (user.role === 'system-admin') {
            let redisOrgId = null;
            let redisSource = false;
            
            try {
                const sessionCtx = await getSessionContext(user.userId);
                if (sessionCtx?.activeOrgId) {
                    redisOrgId = sessionCtx.activeOrgId;
                    redisSource = true;
                } else if (sessionCtx && !sessionCtx.activeOrgId) {
                    // Redis existe pero activeOrgId es null → modo global explícito
                    redisSource = true;
                    redisOrgId = null;
                }
            } catch (redisErr) {
                orgLogger.warn({ userId: user.userId, err: redisErr }, 'Redis session context no disponible, usando JWT como fallback');
            }
            
            const effectiveOrgId = redisSource ? redisOrgId : (user.activeOrgId ?? null);

            orgLogger.debug({
                userId: user.userId,
                redisSource,
                redisOrgId,
                jwtActiveOrgId: user.activeOrgId ?? null,
                effectiveOrgId,
                queryParams: { all: req.query.all, organization_id: req.query.organization_id }
            }, 'System admin org resolution trace');
            
            if (!effectiveOrgId) {
                req.organizationContext = {
                    id: null,
                    publicCode: null,
                    source: redisSource ? 'session_context' : 'jwt',
                    tokenType: 'session',
                    scopes: [],
                    clientId: null,
                    showAll: true,
                    allowedIds: [],
                    enforced: false,
                    canAccessAll: true,
                    impersonating: false
                };

                orgLogger.debug({
                    userId: user.userId,
                    role: user.role,
                    showAll: true,
                    source: redisSource ? 'session_context' : 'jwt'
                }, 'System admin en modo global (sin org activa)');

                return next();
            }
            
            const resolved = await resolveOrganizationId(effectiveOrgId);
            if (!resolved) {
                return errorResponse(res, {
                    message: 'auth.organization.not_found',
                    status: 404,
                    code: 'ACTIVE_ORGANIZATION_NOT_FOUND'
                });
            }
            
            if (isOrgInactive(resolved, res, { userId: user.userId, role: user.role, path: req.path })) return;

            req.organizationContext = {
                id: resolved.uuid,
                publicCode: resolved.publicCode,
                source: redisSource ? 'session_context' : 'jwt',
                tokenType: 'session',
                scopes: [],
                clientId: null,
                showAll: false,
                allowedIds: [resolved.uuid],
                enforced: true,
                canAccessAll: false,
                impersonating: true
            };

            orgLogger.debug({
                userId: user.userId,
                activeOrgId: resolved.uuid,
                source: redisSource ? 'session_context' : 'jwt',
                impersonating: true
            }, 'System admin org resuelta desde ' + (redisSource ? 'Redis' : 'JWT'));

            return next();
        }
        
        // --- Otros roles: usar activeOrgId del JWT ---
        const activeOrgId = user.activeOrgId;

        if (!activeOrgId) {
            orgLogger.warn({
                userId: user.userId,
                role: user.role,
                path: req.path
            }, 'User has no active organization');

            return errorResponse(res, {
                message: 'auth.organization.no_active',
                status: 400,
                code: 'NO_ACTIVE_ORGANIZATION'
            });
        }

        const resolved = await resolveOrganizationId(activeOrgId);
        
        if (!resolved) {
            return errorResponse(res, {
                message: 'auth.organization.not_found',
                status: 404,
                code: 'ACTIVE_ORGANIZATION_NOT_FOUND'
            });
        }

        if (isOrgInactive(resolved, res, { userId: user.userId, role: user.role, path: req.path })) return;

        req.organizationContext = {
            id: resolved.uuid,
            publicCode: resolved.publicCode,
            source: 'jwt',
            tokenType: 'session',
            scopes: [],
            clientId: null,
            showAll: false,
            allowedIds: [resolved.uuid],
            enforced: true,
            canAccessAll: false
        };

        orgLogger.debug({
            userId: user.userId,
            activeOrgId: resolved.uuid,
            source: 'jwt'
        }, 'Organization context established from JWT activeOrgId');

        next();
    } catch (error) {
        orgLogger.error({ err: error }, 'Error establishing organization context');
        next(error);
    }
};

/**
 * Middleware combinado: enforceActiveOrganization + rate limit por organización
 * Aplica rate limiting basado en organizationContext.id después de establecer el contexto
 * 
 * @param {Object} [rateLimitOptions] - Opciones para orgRateLimitMiddleware
 * @returns {Function[]} Array de middlewares para usar con router
 */
export const enforceOrgWithRateLimit = (rateLimitOptions = {}) => {
    // Importación lazy para evitar dependencia circular
    let orgRateLimit = null;
    
    const rateLimit = async (req, res, next) => {
        if (!orgRateLimit) {
            const mod = await import('./rateLimit.js');
            orgRateLimit = mod.orgRateLimitMiddleware(rateLimitOptions);
        }
        return orgRateLimit(req, res, next);
    };
    
    return [enforceActiveOrganization, rateLimit];
};

export default enforceActiveOrganization;
