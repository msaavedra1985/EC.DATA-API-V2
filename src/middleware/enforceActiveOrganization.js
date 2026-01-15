// middleware/enforceActiveOrganization.js
// Middleware para establecer contexto de organización desde JWT
// Implementa aislamiento de datos por tenant sin mutar req.query
// Soporta JWT de sesión web y JWT de API key para clientes externos

import { canAccessOrganization, getOrganizationScope } from '../modules/organizations/services.js';
import * as orgRepository from '../modules/organizations/repository.js';
import { errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

const orgLogger = logger.child({ component: 'enforceActiveOrganization' });

// Roles que pueden usar all=true para ver todas las organizaciones
const ADMIN_ROLES = ['system-admin', 'org-admin'];

// Regex para validar formato UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resuelve un ID de organización (public_code o UUID) a su UUID interno
 * 
 * @param {string} orgId - Public code o UUID de la organización
 * @returns {Promise<{uuid: string, publicCode: string}|null>} - UUID y public_code resueltos o null si no existe
 */
const resolveOrganizationId = async (orgId) => {
    if (!orgId) return null;
    
    const isUuid = UUID_REGEX.test(orgId);
    
    if (isUuid) {
        // Ya es UUID, obtener public_code si es posible
        const org = await orgRepository.findOrganizationByIdInternal(orgId);
        return org ? { uuid: orgId, publicCode: org.public_code } : null;
    }
    
    // Es public_code, buscar organización
    const org = await orgRepository.findOrganizationByPublicCodeInternal(orgId);
    return org ? { uuid: org.id, publicCode: org.public_code } : null;
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
            // Solo admins pueden usar all=true
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

            // Obtener el scope organizacional del usuario
            const scope = await getOrganizationScope(user.userId, user.role);

            // Para system-admin con canAccessAll=true: acceso total sin filtro
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
                }, 'System admin requested all records without restrictions');

                return next();
            }

            // Para org-admin u otros con scope limitado: materializar IDs permitidos
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

        // --- Caso 3: Usuario no especifica filtro - usar organización activa del JWT ---
        const activeOrgId = user.activeOrgId;

        if (!activeOrgId) {
            // CASO ESPECIAL: system-admin sin org activa (panel admin global)
            // En este caso, tiene acceso a todo sin filtro
            if (user.role === 'system-admin') {
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
                    canAccessAll: true,
                    // Indica que system-admin está en modo admin global (sin impersonar)
                    impersonating: false
                };

                orgLogger.debug({
                    userId: user.userId,
                    role: user.role,
                    showAll: true,
                    canAccessAll: true
                }, 'System admin in global admin mode (no active organization)');

                return next();
            }
            
            // Otros roles DEBEN tener una org activa
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
        
        // Determinar si system-admin está impersonando (activeOrgId != primaryOrgId)
        const isImpersonating = user.role === 'system-admin' && 
                                user.impersonating === true;

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
            canAccessAll: false,
            // Para system-admin, indicar si está impersonando otra org
            ...(user.role === 'system-admin' && { impersonating: isImpersonating })
        };

        orgLogger.debug({
            userId: user.userId,
            activeOrgId: resolved.uuid,
            source: 'jwt',
            ...(isImpersonating && { impersonating: true })
        }, 'Organization context established from JWT activeOrgId');

        next();
    } catch (error) {
        orgLogger.error({ err: error }, 'Error establishing organization context');
        next(error);
    }
};

export default enforceActiveOrganization;
