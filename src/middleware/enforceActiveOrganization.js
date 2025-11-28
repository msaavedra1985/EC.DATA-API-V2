// middleware/enforceActiveOrganization.js
// Middleware para forzar filtrado por organización activa
// Implementa aislamiento de datos por tenant según el JWT del usuario

import { canAccessOrganization, getOrganizationScope } from '../modules/organizations/services.js';
import * as orgRepository from '../modules/organizations/repository.js';
import { errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

const orgLogger = logger.child({ component: 'enforceActiveOrganization' });

// Roles que pueden usar all=true para ver todas las organizaciones
const ADMIN_ROLES = ['system-admin', 'org-admin'];

/**
 * Middleware para forzar filtrado por organización activa
 * 
 * Comportamiento:
 * - Usuario sin filtro: Usa su activeOrgId del JWT
 * - Usuario con organization_id en query: Valida acceso y usa ese ID
 * - Usuario con all=true: Solo admins, devuelve todos los registros
 * 
 * El middleware modifica req.query.organization_id con el UUID interno
 * para que los servicios puedan filtrar correctamente.
 * 
 * También agrega a req:
 * - req.organizationFilter: { enforced: boolean, organizationId: string|null, showAll: boolean }
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

        // SEGURIDAD CRÍTICA: Eliminar organization_ids del query si viene del cliente
        // Este parámetro solo debe ser inyectado por el middleware, nunca aceptado del cliente
        // Previene bypass de seguridad multi-tenant
        if (req.query.organization_ids) {
            orgLogger.warn({
                userId: user.userId,
                role: user.role,
                path: req.path,
                attemptedIds: Array.isArray(req.query.organization_ids) 
                    ? req.query.organization_ids.length 
                    : 'non-array'
            }, 'Client attempted to inject organization_ids - rejected');
            delete req.query.organization_ids;
        }

        const requestedOrgId = req.query.organization_id;
        const requestAll = req.query.all === 'true';

        // Caso 1: Usuario solicita ver TODOS los registros (all=true)
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
                req.organizationFilter = {
                    enforced: false,
                    organizationId: null,
                    showAll: true,
                    limitToScope: false
                };

                // Eliminar filtros del query
                delete req.query.organization_id;
                delete req.query.organization_ids;
                delete req.query.all;

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

            // Materializar los IDs permitidos en el query para que los servicios filtren
            req.query.organization_ids = allowedOrgIds;
            req.organizationFilter = {
                enforced: true,
                organizationId: null,
                organizationIds: allowedOrgIds,
                showAll: true,
                limitToScope: true
            };

            // Limpiar parámetros originales
            delete req.query.organization_id;
            delete req.query.all;

            orgLogger.debug({
                userId: user.userId,
                role: user.role,
                showAll: true,
                limitToScope: true,
                allowedOrgsCount: allowedOrgIds.length
            }, 'Scoped admin requested all records within permitted organizations');

            return next();
        }

        // Caso 2: Usuario especifica organization_id explícitamente
        if (requestedOrgId) {
            // Convertir public_code a UUID si es necesario
            let organizationUuid = requestedOrgId;
            
            // Detectar si es UUID o public_code
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedOrgId);
            
            if (!isUuid) {
                // Es public_code, convertir a UUID
                const org = await orgRepository.findOrganizationByPublicCodeInternal(requestedOrgId);
                
                if (!org) {
                    return errorResponse(res, {
                        message: 'errors.organization.not_found',
                        status: 404,
                        code: 'ORGANIZATION_NOT_FOUND'
                    });
                }
                
                organizationUuid = org.id;
            }

            // Verificar que el usuario tiene acceso a esta organización
            const hasAccess = await canAccessOrganization(
                user.userId,
                organizationUuid,
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

            // Usuario tiene acceso, usar el UUID en el query
            req.query.organization_id = organizationUuid;
            req.organizationFilter = {
                enforced: true,
                organizationId: organizationUuid,
                showAll: false,
                originalPublicCode: requestedOrgId
            };

            orgLogger.debug({
                userId: user.userId,
                organizationId: organizationUuid
            }, 'User accessing specific organization');

            return next();
        }

        // Caso 3: Usuario no especifica filtro - usar organización activa
        const activeOrgId = user.activeOrgId;

        if (!activeOrgId) {
            // Usuario sin organización activa
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

        // Convertir activeOrgId a UUID si es public_code
        let activeOrgUuid = activeOrgId;
        const isActiveUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeOrgId);
        
        if (!isActiveUuid) {
            const org = await orgRepository.findOrganizationByPublicCodeInternal(activeOrgId);
            if (org) {
                activeOrgUuid = org.id;
            } else {
                return errorResponse(res, {
                    message: 'auth.organization.not_found',
                    status: 404,
                    code: 'ACTIVE_ORGANIZATION_NOT_FOUND'
                });
            }
        }

        // Forzar el filtro por organización activa
        req.query.organization_id = activeOrgUuid;
        req.organizationFilter = {
            enforced: true,
            organizationId: activeOrgUuid,
            showAll: false,
            fromActiveOrg: true
        };

        orgLogger.debug({
            userId: user.userId,
            activeOrgId: activeOrgUuid
        }, 'Enforcing active organization filter');

        next();
    } catch (error) {
        orgLogger.error({ err: error }, 'Error enforcing active organization');
        next(error);
    }
};

export default enforceActiveOrganization;
