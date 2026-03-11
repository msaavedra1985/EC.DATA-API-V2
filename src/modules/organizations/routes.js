// modules/organizations/routes.js
// Rutas REST para el módulo de Organizaciones

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { requireOrgPermission } from './middleware/permissions.js';
import * as orgRepository from './repository.js';
import * as orgServices from './services.js';
import { validateCreateOrganization } from './dtos/create.dto.js';
import { validateUpdateOrganization } from './dtos/update.dto.js';
import { validateBatchDelete, validateGenerateUploadUrl, validateSlug } from './dtos/batchDelete.dto.js';
import { getDeletePreview, cascadeDelete } from './helpers/cascadeDelete.js';
import { getChildren, getDescendants, getHierarchyTree, wouldCreateCycle, getDepth, getTreeLevels } from './helpers/hierarchy.js';
import { normalizeToSlug, generateUniqueSlug, findSuggestion } from './helpers/slug.js';
import { generatePresignedUploadUrl } from '../../helpers/azureBlobStorage.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import { 
    cacheOrganization, 
    getCachedOrganization, 
    invalidateOrganizationCache,
    cacheOrganizationHierarchy,
    getCachedOrganizationHierarchy 
} from './cache.js';
import { invalidateOrgResolveCache } from '../../middleware/enforceActiveOrganization.js';
import logger from '../../utils/logger.js';
import { generateUuidV7, generateHumanId, generatePublicCode } from '../../utils/identifiers.js';
import Organization from './models/Organization.js';
import UserOrganization from '../auth/models/UserOrganization.js';

const router = express.Router();
const orgLogger = logger.child({ component: 'organizations' });


// 📄 Swagger: src/docs/swagger/organizations.yaml -> GET /
router.get('/', authenticate, async (req, res) => {
    try {
        const { page, limit = 20, offset = 0, search, parent_id, active_only = 'true' } = req.query;
        
        const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
        let parsedOffset = Math.max(parseInt(offset) || 0, 0);
        if (page && parseInt(page) >= 1) {
            parsedOffset = (parseInt(page) - 1) * parsedLimit;
        }
        
        // Obtener scope del usuario
        const scope = await orgServices.getOrganizationScope(req.user.userId, req.user.role);
        
        // Construir filtros incluyendo scope
        const filters = {
            search,
            parentId: parent_id,
            isActive: active_only === 'true'
        };

        // Agregar filtro de scope si no es system-admin
        if (!scope.canAccessAll) {
            filters.organizationIds = scope.organizationIds;
        }

        // Buscar organizaciones con scope aplicado
        const result = await orgRepository.listOrganizations(
            parsedLimit,
            parsedOffset,
            filters
        );

        // Respuesta con estructura estándar: data[] + meta{}
        res.json({
            ok: true,
            data: result.items,
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        orgLogger.error({ err: error }, 'Error listing organizations');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error listing organizations'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> GET /hierarchy
router.get('/hierarchy', authenticate, async (req, res) => {
    try {
        const { root_id, active_only = 'true' } = req.query;

        let rootOrgInternal;
        if (root_id) {
            rootOrgInternal = await orgRepository.findOrganizationByPublicCodeInternal(root_id);
        } else {
            const rootOrg = await orgRepository.getRootOrganization();
            if (rootOrg) {
                // getRootOrganization retorna DTO público, necesitamos el interno
                rootOrgInternal = await orgRepository.findOrganizationByPublicCodeInternal(rootOrg.id);
            }
        }

        if (!rootOrgInternal) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'ROOT_NOT_FOUND',
                    message: 'Root organization not found'
                }
            });
        }

        // Intentar obtener del caché usando publicCode
        let tree = await getCachedOrganizationHierarchy(rootOrgInternal.publicCode);

        if (!tree) {
            // Construir árbol usando el UUID interno real
            tree = await getHierarchyTree(rootOrgInternal.id, active_only === 'true');
            
            // Guardar en caché
            await cacheOrganizationHierarchy(rootOrgInternal.publicCode, tree);
        }

        res.json({
            ok: true,
            data: tree
        });
    } catch (error) {
        orgLogger.error({ err: error }, 'Error getting hierarchy');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error getting hierarchy'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> GET /validate-slug
router.get('/validate-slug', authenticate, async (req, res) => {
    try {
        const { slug } = req.query;
        
        if (!slug) {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'MISSING_SLUG',
                    message: 'Slug parameter is required'
                }
            });
        }

        validateSlug({ slug });

        const existing = await orgRepository.findOrganizationBySlug(slug);
        const available = !existing;
        const suggestion = available ? null : await findSuggestion(slug);

        res.json({
            ok: true,
            data: {
                slug,
                available,
                ...(suggestion && { suggestion })
            }
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid slug format',
                    details: error.errors
                }
            });
        }

        orgLogger.error({ err: error }, 'Error validating slug');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error validating slug'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> GET /:id
router.get('/:id', authenticate, requireOrgPermission('view'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Intentar obtener del caché
        let organization = await getCachedOrganization(id);
        
        if (!organization) {
            // Si no está en caché, buscar en BD
            organization = await orgRepository.findOrganizationByPublicCode(id);
            
            if (!organization) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Organization not found'
                    }
                });
            }

            // Guardar en caché
            await cacheOrganization(organization);
        }

        res.json({
            ok: true,
            data: organization
        });
    } catch (error) {
        orgLogger.error({ err: error }, 'Error getting organization');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error getting organization'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> POST /validate
router.post('/validate', async (req, res) => {
    try {
        // Importar el validator
        const { validateOrganizationValidation } = await import('./dtos/validate.dto.js');
        
        // Validar datos del request
        const validatedData = validateOrganizationValidation(req.body);
        
        // Llamar al servicio de validación (mapear excludeId a excludePublicCode)
        const result = await orgServices.validateOrganization({
            name: validatedData.name,
            slug: validatedData.slug,
            excludePublicCode: validatedData.excludeId || null
        });

        res.json({
            ok: true,
            data: result
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid data',
                    details: error.errors
                }
            });
        }

        orgLogger.error({ err: error }, 'Error validating organization');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error validating organization'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> POST /
router.post('/', authenticate, requireOrgPermission('create'), async (req, res) => {
    try {
        // Validar datos
        const validatedData = validateCreateOrganization(req.body);
        
        // Generar slug único (auto-genera desde nombre si no viene)
        const slugBase = validatedData.slug || validatedData.name;
        validatedData.slug = await generateUniqueSlug(slugBase);

        // Validar parentId si viene
        let parentOrg = null;
        if (validatedData.parentId) {
            parentOrg = await orgRepository.findOrganizationByPublicCode(validatedData.parentId);
            if (!parentOrg) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: 'PARENT_NOT_FOUND',
                        message: 'Parent organization not found'
                    }
                });
            }

            // Verificar profundidad (máximo 5 niveles)
            const parentDepth = await getDepth(parentOrg.id);
            if (parentDepth >= 5) {
                return res.status(422).json({
                    ok: false,
                    error: {
                        code: 'MAX_DEPTH_EXCEEDED',
                        message: 'Maximum organization depth (5 levels) exceeded'
                    }
                });
            }

            // Usar parentId interno (UUID)
            validatedData.parentId = parentOrg.id;
        }

        // Crear organización
        const organization = await orgRepository.createOrganization(validatedData);

        // Auditoría
        await logAuditAction({
            entityType: 'organization',
            entityId: organization.id,
            action: 'create',
            performedBy: req.user.userId,
            changes: { created: validatedData },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Invalidar caché de jerarquía del padre
        if (parentOrg) {
            await invalidateOrganizationCache(parentOrg.publicCode);
        }

        orgLogger.info({ orgId: organization.id, userId: req.user.userId }, 'Organization created');

        res.status(201).json({
            ok: true,
            data: organization
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid data',
                    details: error.errors
                }
            });
        }

        orgLogger.error({ err: error }, 'Error creating organization');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error creating organization'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> PUT /:id
router.put('/:id', authenticate, requireOrgPermission('edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const validatedData = validateUpdateOrganization(req.body);

        const organization = await orgRepository.findOrganizationByPublicCode(id);
        if (!organization) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Organization not found'
                }
            });
        }

        // Si se actualiza el slug, generar uno único excluyendo la org actual
        if (validatedData.slug && validatedData.slug !== organization.slug) {
            validatedData.slug = await generateUniqueSlug(validatedData.slug, organization.id);
        }

        // Si se actualiza parentId, validar
        if (validatedData.parentId && validatedData.parentId !== organization.parentId) {
            const newParent = await orgRepository.findOrganizationByPublicCode(validatedData.parentId);
            if (!newParent) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: 'PARENT_NOT_FOUND',
                        message: 'Parent organization not found'
                    }
                });
            }

            // Detectar ciclos (usa UUID interno)
            const hasCycle = await wouldCreateCycle(req.organizationInternal.id, newParent.id);
            if (hasCycle) {
                return res.status(422).json({
                    ok: false,
                    error: {
                        code: 'CYCLE_DETECTED',
                        message: 'Cannot create circular hierarchy'
                    }
                });
            }

            validatedData.parentId = newParent.id;
        }

        // Actualizar (usa UUID interno)
        const updated = await orgRepository.updateOrganization(req.organizationInternal.id, validatedData);

        // Auditoría
        await logAuditAction({
            entityType: 'organization',
            entityId: organization.id,
            action: 'update',
            performedBy: req.user.userId,
            changes: { updated: validatedData },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Invalidar cachés
        await invalidateOrganizationCache(id, organization.parentId);
        await invalidateOrgResolveCache(req.organizationInternal.id, organization.publicCode);

        res.json({
            ok: true,
            data: updated
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid data',
                    details: error.errors
                }
            });
        }

        orgLogger.error({ err: error }, 'Error updating organization');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error updating organization'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> PATCH /:id/move
router.patch('/:id/move', authenticate, requireOrgPermission('edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { validateMoveOrganization } = await import('./dtos/move.dto.js');
        const validatedData = validateMoveOrganization(req.body);

        // Obtener organización actual (usa req.organizationInternal del middleware)
        const organization = await orgRepository.findOrganizationByPublicCode(id);
        if (!organization) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Organization not found'
                }
            });
        }

        const oldParentId = organization.parentId;
        let newParentUuid = null;

        // Validar nuevo padre si se proporciona
        if (validatedData.parentId) {
            const newParent = await orgRepository.findOrganizationByPublicCodeInternal(validatedData.parentId);
            if (!newParent) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: 'PARENT_NOT_FOUND',
                        message: 'Parent organization not found'
                    }
                });
            }

            // Detectar ciclos
            const hasCycle = await wouldCreateCycle(req.organizationInternal.id, newParent.id);
            if (hasCycle) {
                return res.status(422).json({
                    ok: false,
                    error: {
                        code: 'CYCLE_DETECTED',
                        message: 'Cannot create circular hierarchy'
                    }
                });
            }

            // Verificar profundidad
            const newParentDepth = await getDepth(newParent.id);
            if (newParentDepth >= 5) {
                return res.status(422).json({
                    ok: false,
                    error: {
                        code: 'MAX_DEPTH_EXCEEDED',
                        message: 'Maximum organization depth (5 levels) exceeded'
                    }
                });
            }

            newParentUuid = newParent.id;
        }

        // Actualizar parentId (usa UUID interno)
        const updated = await orgRepository.updateOrganization(req.organizationInternal.id, {
            parentId: newParentUuid
        });

        // Auditoría
        await logAuditAction({
            entityType: 'organization',
            entityId: req.organizationInternal.id,
            action: 'move',
            performedBy: req.user.userId,
            changes: {
                old: { parentId: oldParentId },
                new: { parentId: validatedData.parentId }
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Invalidar caché del padre anterior y nuevo
        if (oldParentId) {
            await invalidateOrganizationCache(oldParentId);
        }
        if (validatedData.parentId) {
            await invalidateOrganizationCache(validatedData.parentId);
        }

        orgLogger.info({ orgId: id, oldParent: oldParentId, newParent: validatedData.parentId }, 'Organization moved');

        res.json({
            ok: true,
            data: {
                ...updated,
                oldParentId
            }
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid data',
                    details: error.errors
                }
            });
        }

        orgLogger.error({ err: error }, 'Error moving organization');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error moving organization'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> DELETE /:id
router.delete('/:id', authenticate, requireOrgPermission('delete'), async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener organización (usa req.organizationInternal del middleware)
        const organization = await orgRepository.findOrganizationByPublicCode(id);
        if (!organization) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Organization not found'
                }
            });
        }

        // Verificar que no tenga hijos activos
        const children = await getChildren(req.organizationInternal.id);
        if (children.length > 0) {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'HAS_ACTIVE_CHILDREN',
                    message: 'Cannot delete organization with active children',
                    details: {
                        children_count: children.length
                    }
                }
            });
        }

        // Eliminar membresías de usuarios
        const memberships = await UserOrganization.findAll({
            where: { organizationId: req.organizationInternal.id }
        });

        const membershipsCount = memberships.length;

        // Soft delete de las membresías
        for (const membership of memberships) {
            await membership.destroy();
        }

        // Soft delete de la organización
        const deleted = await orgRepository.deleteOrganization(req.organizationInternal.id);

        if (!deleted) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: 'DELETE_FAILED',
                    message: 'Failed to delete organization'
                }
            });
        }

        // Auditoría
        await logAuditAction({
            entityType: 'organization',
            entityId: req.organizationInternal.id,
            action: 'delete',
            performedBy: req.user.userId,
            changes: {
                deleted: true,
                membershipsRemoved: membershipsCount
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Invalidar cachés
        await invalidateOrganizationCache(id, organization.parentId);
        await invalidateOrgResolveCache(req.organizationInternal.id, organization.publicCode);

        orgLogger.info({ orgId: id, membershipsRemoved: membershipsCount }, 'Organization deleted');

        res.json({
            ok: true,
            data: {
                deleted: true,
                organizationId: id,
                membershipsRemoved: membershipsCount
            }
        });
    } catch (error) {
        orgLogger.error({ err: error }, 'Error deleting organization');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error deleting organization'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> POST /batch-delete
router.post('/batch-delete', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res) => {
    try {
        const validatedData = validateBatchDelete(req.body);
        const { organizationIds, hardDelete, deleteUsers, reassignOrgId } = validatedData;

        // Convertir public_codes a UUIDs
        const orgUuids = [];
        for (const publicCode of organizationIds) {
            const org = await orgRepository.findOrganizationByPublicCode(publicCode);
            if (org) {
                orgUuids.push(org.id);
            }
        }

        if (orgUuids.length === 0) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'NO_ORGANIZATIONS_FOUND',
                    message: 'No organizations found to delete'
                }
            });
        }

        // Ejecutar cascade delete
        const result = await cascadeDelete(
            orgUuids,
            {
                hardDelete,
                deleteOrphanUsers: deleteUsers,
                reassignOrgId
            }
        );

        // Auditoría para cada organización
        for (const orgId of orgUuids) {
            await logAuditAction({
                entityType: 'organization',
                entityId: orgId,
                action: 'delete',
                performedBy: req.user.userId,
                changes: { deleted: true, cascade: result },
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            });
        }

        res.json({
            ok: true,
            data: result
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid data',
                    details: error.errors
                }
            });
        }

        orgLogger.error({ err: error }, 'Error in batch delete');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error deleting organizations'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> POST /upload-url
router.post('/upload-url', authenticate, async (req, res) => {
    try {
        const validatedData = validateGenerateUploadUrl(req.body);
        const { filename, contentType, prefix, expiryMinutes } = validatedData;

        // Generar presigned URL de Azure
        const result = await generatePresignedUploadUrl(
            filename,
            contentType,
            prefix,
            expiryMinutes
        );

        res.json({
            ok: true,
            data: result
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid data',
                    details: error.errors
                }
            });
        }

        orgLogger.error({ err: error }, 'Error generating upload URL');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error generating upload URL'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> GET /:id/children
router.get('/:id/children', authenticate, requireOrgPermission('view'), async (req, res) => {
    try {
        const { levels = '2', active_only = 'true' } = req.query;
        
        // Obtener hijos con N niveles de profundidad y hasChildren flag
        const tree = await getTreeLevels(
            req.organizationInternal.id,
            parseInt(levels),
            active_only === 'true'
        );

        // Retornar solo los hijos (children del nodo raíz)
        res.json({
            ok: true,
            data: tree?.children || []
        });
    } catch (error) {
        orgLogger.error({ err: error }, 'Error getting children');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error getting children'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> GET /:id/descendants
router.get('/:id/descendants', authenticate, requireOrgPermission('view'), async (req, res) => {
    try {
        const organization = req.organization;
        const descendants = await getDescendants(req.organizationInternal.id); // UUID interno

        res.json({
            ok: true,
            data: descendants
        });
    } catch (error) {
        orgLogger.error({ err: error }, 'Error getting descendants');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error getting descendants'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> GET /:id/subtree
router.get('/:id/subtree', authenticate, requireOrgPermission('view'), async (req, res) => {
    try {
        const { levels = '2', active_only = 'true' } = req.query;
        
        // Obtener árbol con N niveles
        const tree = await getTreeLevels(
            req.organizationInternal.id, 
            parseInt(levels), 
            active_only === 'true'
        );

        res.json({
            ok: true,
            data: tree
        });
    } catch (error) {
        orgLogger.error({ err: error }, 'Error getting subtree');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error getting subtree'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> POST /delete-preview
router.post('/delete-preview', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res) => {
    try {
        const { organizationIds } = req.body;

        if (!organizationIds || !Array.isArray(organizationIds)) {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'organizationIds must be an array'
                }
            });
        }

        // Convertir public_codes a UUIDs
        const orgUuids = [];
        for (const publicCode of organizationIds) {
            const org = await orgRepository.findOrganizationByPublicCode(publicCode);
            if (org) {
                orgUuids.push(org.id);
            }
        }

        const preview = await getDeletePreview(orgUuids);

        res.json({
            ok: true,
            data: preview
        });
    } catch (error) {
        orgLogger.error({ err: error }, 'Error generating delete preview');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error generating preview'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> GET /:id/stats
router.get('/:id/stats', authenticate, requireOrgPermission('view'), async (req, res) => {
    try {
        const organization = req.organization;

        // Contar usuarios (usa UUID interno)
        const usersCount = await UserOrganization.count({
            where: { organizationId: req.organizationInternal.id }
        });

        // Contar hijos directos
        const children = await getChildren(req.organizationInternal.id, false);
        
        // Contar todos los descendientes
        const descendants = await getDescendants(req.organizationInternal.id, false);

        res.json({
            ok: true,
            data: {
                totalUsers: usersCount,
                totalChildren: children.length,
                totalDescendants: descendants.length,
                createdAt: organization.createdAt,
                updatedAt: organization.updatedAt
            }
        });
    } catch (error) {
        orgLogger.error({ err: error }, 'Error getting organization stats');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error getting stats'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> PUT /:id/activate
router.put('/:id/activate', authenticate, requireOrgPermission('edit'), async (req, res) => {
    try {
        const organization = req.organization;

        const updated = await orgRepository.updateOrganization(req.organizationInternal.id, {
            isActive: true
        });

        await logAuditAction({
            entityType: 'organization',
            entityId: organization.id,
            action: 'activate',
            performedBy: req.user.userId,
            changes: { isActive: true },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await invalidateOrganizationCache(organization.publicCode);

        res.json({
            ok: true,
            data: {
                id: updated.publicCode,
                isActive: updated.isActive
            }
        });
    } catch (error) {
        orgLogger.error({ err: error }, 'Error activating organization');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error activating organization'
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/organizations.yaml -> PUT /:id/deactivate
router.put('/:id/deactivate', authenticate, requireOrgPermission('edit'), async (req, res) => {
    try {
        const organization = req.organization;

        const updated = await orgRepository.updateOrganization(req.organizationInternal.id, {
            isActive: false
        });

        await logAuditAction({
            entityType: 'organization',
            entityId: organization.id,
            action: 'deactivate',
            performedBy: req.user.userId,
            changes: { isActive: false },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await invalidateOrganizationCache(organization.publicCode);

        res.json({
            ok: true,
            data: {
                id: updated.publicCode,
                isActive: updated.isActive
            }
        });
    } catch (error) {
        orgLogger.error({ err: error }, 'Error deactivating organization');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error deactivating organization'
            }
        });
    }
});

export default router;
