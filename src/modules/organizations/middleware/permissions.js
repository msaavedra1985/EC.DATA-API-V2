// modules/organizations/middleware/permissions.js
// Middleware para verificar permisos sobre organizaciones

import * as orgRepository from '../repository.js';
import { canAccessOrganization } from '../services.js';
import logger from '../../../utils/logger.js';

const orgLogger = logger.child({ component: 'organizations' });

/**
 * Middleware para verificar si el usuario puede acceder a una organización
 * 
 * Permisos por rol:
 * - system-admin: Acceso total a todas las organizaciones
 * - org-admin: Su org + todos los descendientes
 * - org-manager: Su org + hijos directos
 * - user/viewer/guest/demo: Solo sus organizaciones directas
 * 
 * @param {string} permission - Tipo de permiso: 'view', 'edit', 'delete', 'create'
 */
export const requireOrgPermission = (permission = 'view') => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            const orgPublicCode = req.params.id;

            if (!user) {
                return res.status(401).json({
                    ok: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required'
                    }
                });
            }

            // system-admin tiene acceso total
            if (user.role === 'system-admin') {
                return next();
            }

            // Si el endpoint requiere crear, solo system-admin y org-admin pueden
            if (permission === 'create') {
                if (!['system-admin', 'org-admin'].includes(user.role)) {
                    return res.status(403).json({
                        ok: false,
                        error: {
                            code: 'PERMISSION_DENIED',
                            message: 'Only system-admin and org-admin can create organizations'
                        }
                    });
                }
                return next();
            }

            // Para view/edit/delete, verificar acceso a la organización específica
            if (orgPublicCode) {
                // Buscar organización por public_code
                const org = await orgRepository.findOrganizationByPublicCode(orgPublicCode);
                
                if (!org) {
                    return res.status(404).json({
                        ok: false,
                        error: {
                            code: 'ORGANIZATION_NOT_FOUND',
                            message: 'Organization not found'
                        }
                    });
                }

                // Verificar si el usuario puede acceder
                // NOTA: org.id ya es public_code (gracias al DTO), pero canAccessOrganization necesita el UUID interno
                // Por eso necesitamos obtener el UUID de la BD antes de verificar acceso
                const orgWithInternalId = await orgRepository.findOrganizationByPublicCodeInternal(orgPublicCode);
                
                const hasAccess = await canAccessOrganization(
                    user.userId,
                    orgWithInternalId.id, // UUID interno necesario para scope calculation
                    user.role
                );

                if (!hasAccess) {
                    orgLogger.warn({
                        userId: user.userId,
                        orgPublicCode: org.id, // org.id es public_code ahora
                        role: user.role,
                        permission
                    }, 'Permission denied for organization access');

                    return res.status(403).json({
                        ok: false,
                        error: {
                            code: 'PERMISSION_DENIED',
                            message: 'You do not have access to this organization'
                        }
                    });
                }

                // Verificar permisos específicos
                if (permission === 'edit') {
                    // Solo system-admin y org-admin pueden editar
                    if (!['system-admin', 'org-admin'].includes(user.role)) {
                        return res.status(403).json({
                            ok: false,
                            error: {
                                code: 'PERMISSION_DENIED',
                                message: 'Only system-admin and org-admin can edit organizations'
                            }
                        });
                    }
                }

                if (permission === 'delete') {
                    // Solo system-admin y org-admin pueden eliminar
                    if (!['system-admin', 'org-admin'].includes(user.role)) {
                        return res.status(403).json({
                            ok: false,
                            error: {
                                code: 'PERMISSION_DENIED',
                                message: 'Only system-admin and org-admin can delete organizations'
                            }
                        });
                    }
                }

                // Adjuntar organización al request para uso posterior
                // org = DTO público (con public_code como id)
                // orgWithInternalId = modelo interno (con UUID)
                req.organization = org; // DTO público para responses
                req.organizationInternal = orgWithInternalId; // Modelo interno para operaciones
            }

            next();
        } catch (error) {
            orgLogger.error({ err: error }, 'Error checking organization permissions');
            res.status(500).json({
                ok: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Error checking permissions'
                }
            });
        }
    };
};

export default requireOrgPermission;
