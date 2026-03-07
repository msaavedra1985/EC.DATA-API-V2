// middleware/validateResourceOwnership.js
// Middleware para validar que un recurso pertenece a la organización del usuario
// Implementa validación de acceso cross-org para endpoints GET/:id, PUT/:id, DELETE/:id

import { canAccessOrganization } from '../modules/organizations/services.js';
import { errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

const ownershipLogger = logger.child({ component: 'validateResourceOwnership' });

/**
 * Crea un middleware para validar que el usuario puede acceder a un recurso específico
 * 
 * Comportamiento:
 * - Busca el recurso por ID (UUID o public_code)
 * - Verifica que el recurso existe (404 si no)
 * - Verifica que el recurso pertenece a una organización accesible por el usuario (403 si no)
 * - Adjunta el recurso a req.resource para uso posterior en el handler
 * 
 * @param {Object} options - Opciones de configuración
 * @param {Function} options.findById - Función para buscar el recurso por ID (debe retornar modelo con organization_id)
 * @param {Function} [options.findByPublicCode] - Función para buscar por public_code (opcional)
 * @param {string} options.resourceName - Nombre del recurso para mensajes de error (ej: 'site', 'device')
 * @param {string} [options.paramName='id'] - Nombre del parámetro de ruta (ej: 'id', 'siteId')
 * @param {boolean} [options.checkSoftDelete=true] - Si true, verifica deleted_at para soft-delete
 * @returns {Function} - Middleware de Express
 */
export const validateResourceOwnership = (options) => {
    const {
        findById,
        findByPublicCode,
        resourceName,
        paramName = 'id',
        checkSoftDelete = true
    } = options;

    return async (req, res, next) => {
        try {
            const user = req.user;

            // Verificar autenticación
            if (!user) {
                return errorResponse(res, {
                    message: 'auth.token.missing',
                    status: 401,
                    code: 'UNAUTHORIZED'
                });
            }

            const resourceId = req.params[paramName];

            if (!resourceId) {
                return errorResponse(res, {
                    message: `errors.${resourceName}.id_required`,
                    status: 400,
                    code: 'ID_REQUIRED'
                });
            }

            // Detectar si es UUID o public_code
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);

            let resource = null;

            if (isUuid) {
                // Buscar por UUID
                resource = await findById(resourceId);
            } else if (findByPublicCode) {
                // Buscar por public_code
                resource = await findByPublicCode(resourceId);
            } else {
                // Solo soporta UUID
                return errorResponse(res, {
                    message: `errors.${resourceName}.invalid_id`,
                    status: 400,
                    code: 'INVALID_ID_FORMAT'
                });
            }

            // Error 404: Recurso no existe
            if (!resource) {
                ownershipLogger.debug({
                    userId: user.userId,
                    resourceId,
                    resourceName
                }, 'Resource not found');

                return errorResponse(res, {
                    message: `errors.${resourceName}.not_found`,
                    status: 404,
                    code: `${resourceName.toUpperCase()}_NOT_FOUND`
                });
            }

            // Error 404: Recurso soft-deleted
            if (checkSoftDelete && resource.deletedAt) {
                ownershipLogger.debug({
                    userId: user.userId,
                    resourceId,
                    resourceName,
                    deletedAt: resource.deletedAt
                }, 'Resource is soft-deleted');

                return errorResponse(res, {
                    message: `errors.${resourceName}.not_found`,
                    status: 404,
                    code: `${resourceName.toUpperCase()}_NOT_FOUND`
                });
            }

            // Verificar que el recurso tiene organizationId
            const resourceOrgId = resource.organizationId;

            if (!resourceOrgId) {
                // Recurso sin organización (error de datos)
                ownershipLogger.error({
                    userId: user.userId,
                    resourceId,
                    resourceName
                }, 'Resource has no organization_id - data integrity issue');

                return errorResponse(res, {
                    message: 'errors.internal',
                    status: 500,
                    code: 'DATA_INTEGRITY_ERROR'
                });
            }

            // Verificar que el usuario puede acceder a la organización del recurso
            const hasAccess = await canAccessOrganization(
                user.userId,
                resourceOrgId,
                user.role
            );

            // Error 403: Usuario no tiene acceso a la organización del recurso
            if (!hasAccess) {
                ownershipLogger.warn({
                    userId: user.userId,
                    role: user.role,
                    resourceId,
                    resourceName,
                    resourceOrgId,
                    userActiveOrgCode: user.activeOrgCode
                }, 'User attempted to access resource from unauthorized organization');

                return errorResponse(res, {
                    message: `auth.${resourceName}.access_denied`,
                    status: 403,
                    code: `${resourceName.toUpperCase()}_ACCESS_DENIED`
                });
            }

            // Usuario tiene acceso, adjuntar recurso a request
            req.resource = resource;
            req.resourceOrgId = resourceOrgId;

            ownershipLogger.debug({
                userId: user.userId,
                resourceId,
                resourceName,
                resourceOrgId
            }, 'Resource ownership validated successfully');

            next();
        } catch (error) {
            ownershipLogger.error({ err: error, resourceName }, 'Error validating resource ownership');
            next(error);
        }
    };
};

export default validateResourceOwnership;
