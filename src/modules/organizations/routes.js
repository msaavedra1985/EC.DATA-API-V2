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
import { getChildren, getDescendants, getHierarchyTree, wouldCreateCycle, getDepth } from './helpers/hierarchy.js';
import { generatePresignedUploadUrl } from '../../helpers/azureBlobStorage.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import { 
    cacheOrganization, 
    getCachedOrganization, 
    invalidateOrganizationCache,
    cacheOrganizationHierarchy,
    getCachedOrganizationHierarchy 
} from './cache.js';
import logger from '../../utils/logger.js';
import { generateUuidV7, generateHumanId, generatePublicCode } from '../../utils/identifiers.js';
import Organization from './models/Organization.js';
import UserOrganization from '../auth/models/UserOrganization.js';

const router = express.Router();
const orgLogger = logger.child({ component: 'organizations' });

/**
 * @swagger
 * /api/v1/organizations:
 *   get:
 *     summary: Listar organizaciones con paginación y filtros
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: parent_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: active_only
 *         schema:
 *           type: boolean
 *           default: true
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { limit = 20, offset = 0, search, parent_id, active_only = 'true' } = req.query;
        
        // Obtener scope del usuario
        const scope = await orgServices.getOrganizationScope(req.user.id, req.user.role?.slug);
        
        // Buscar organizaciones
        const result = await orgRepository.listOrganizations(
            parseInt(limit),
            parseInt(offset),
            {
                search,
                parent_id,
                is_active: active_only === 'true'
            }
        );

        // Filtrar por scope del usuario (si no es system-admin)
        let organizations = result.organizations;
        if (!scope.canAccessAll) {
            organizations = organizations.filter(org => 
                scope.organizationIds.includes(org.id)
            );
        }

        res.json({
            ok: true,
            data: organizations,
            meta: {
                total: organizations.length,
                limit: parseInt(limit),
                offset: parseInt(offset),
                has_more: organizations.length === parseInt(limit)
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

/**
 * @swagger
 * /api/v1/organizations/{id}:
 *   get:
 *     summary: Obtener detalles de una organización
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /api/v1/organizations:
 *   post:
 *     summary: Crear nueva organización
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, requireOrgPermission('create'), async (req, res) => {
    try {
        // Validar datos
        const validatedData = validateCreateOrganization(req.body);
        
        // Auto-generar slug si no viene
        if (!validatedData.slug) {
            validatedData.slug = validatedData.name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }

        // Verificar que el slug no exista
        const existingSlug = await orgRepository.findOrganizationBySlug(validatedData.slug);
        if (existingSlug) {
            return res.status(409).json({
                ok: false,
                error: {
                    code: 'SLUG_EXISTS',
                    message: 'Slug already exists',
                    details: { slug: validatedData.slug }
                }
            });
        }

        // Validar parent_id si viene
        let parentOrg = null;
        if (validatedData.parent_id) {
            parentOrg = await orgRepository.findOrganizationByPublicCode(validatedData.parent_id);
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

            // Usar parent_id interno (UUID)
            validatedData.parent_id = parentOrg.id;
        }

        // Crear organización
        const organization = await orgRepository.createOrganization(validatedData);

        // Auditoría
        await logAuditAction({
            entityType: 'organization',
            entityId: organization.id,
            action: 'create',
            performedBy: req.user.id,
            changes: { created: validatedData },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Invalidar caché de jerarquía del padre
        if (parentOrg) {
            await invalidateOrganizationCache(parentOrg.public_code);
        }

        orgLogger.info({ orgId: organization.id, userId: req.user.id }, 'Organization created');

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

/**
 * @swagger
 * /api/v1/organizations/{id}:
 *   put:
 *     summary: Actualizar organización
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
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

        // Si se actualiza el slug, verificar que no exista
        if (validatedData.slug && validatedData.slug !== organization.slug) {
            const existingSlug = await orgRepository.findOrganizationBySlug(validatedData.slug);
            if (existingSlug) {
                return res.status(409).json({
                    ok: false,
                    error: {
                        code: 'SLUG_EXISTS',
                        message: 'Slug already exists'
                    }
                });
            }
        }

        // Si se actualiza parent_id, validar
        if (validatedData.parent_id && validatedData.parent_id !== organization.parent_id) {
            const newParent = await orgRepository.findOrganizationByPublicCode(validatedData.parent_id);
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
            const hasCycle = await wouldCreateCycle(organization.id, newParent.id);
            if (hasCycle) {
                return res.status(422).json({
                    ok: false,
                    error: {
                        code: 'CYCLE_DETECTED',
                        message: 'Cannot create circular hierarchy'
                    }
                });
            }

            validatedData.parent_id = newParent.id;
        }

        // Actualizar
        const updated = await orgRepository.updateOrganization(organization.id, validatedData);

        // Auditoría
        await logAuditAction({
            entityType: 'organization',
            entityId: organization.id,
            action: 'update',
            performedBy: req.user.id,
            changes: { updated: validatedData },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Invalidar caché
        await invalidateOrganizationCache(id, organization.parent_id);

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

/**
 * @swagger
 * /api/v1/organizations/batch-delete:
 *   post:
 *     summary: Eliminar múltiples organizaciones con cascade
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.post('/batch-delete', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res) => {
    try {
        const validatedData = validateBatchDelete(req.body);
        const { organization_ids, hard_delete, delete_users, reassign_org_id } = validatedData;

        // Convertir public_codes a UUIDs
        const orgUuids = [];
        for (const publicCode of organization_ids) {
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
                hardDelete: hard_delete,
                deleteOrphanUsers: delete_users,
                reassignOrgId: reassign_org_id
            }
        );

        // Auditoría para cada organización
        for (const orgId of orgUuids) {
            await logAuditAction({
                entityType: 'organization',
                entityId: orgId,
                action: 'delete',
                performedBy: req.user.id,
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

/**
 * @swagger
 * /api/v1/organizations/upload-url:
 *   post:
 *     summary: Generar presigned URL para upload de logo
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.post('/upload-url', authenticate, async (req, res) => {
    try {
        const validatedData = validateGenerateUploadUrl(req.body);
        const { filename, content_type, prefix, expiry_minutes } = validatedData;

        // Generar presigned URL de Azure
        const result = await generatePresignedUploadUrl(
            filename,
            content_type,
            prefix,
            expiry_minutes
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

/**
 * @swagger
 * /api/v1/organizations/hierarchy:
 *   get:
 *     summary: Obtener árbol jerárquico completo
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/hierarchy', authenticate, async (req, res) => {
    try {
        const { root_id, active_only = 'true' } = req.query;

        let rootOrg;
        if (root_id) {
            rootOrg = await orgRepository.findOrganizationByPublicCode(root_id);
        } else {
            rootOrg = await orgRepository.getRootOrganization();
        }

        if (!rootOrg) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'ROOT_NOT_FOUND',
                    message: 'Root organization not found'
                }
            });
        }

        // Intentar obtener del caché
        let tree = await getCachedOrganizationHierarchy(rootOrg.public_code);

        if (!tree) {
            // Construir árbol
            tree = await getHierarchyTree(rootOrg.id, active_only === 'true');
            
            // Guardar en caché
            await cacheOrganizationHierarchy(rootOrg.public_code, tree);
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

/**
 * @swagger
 * /api/v1/organizations/{id}/children:
 *   get:
 *     summary: Obtener hijos directos de una organización
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/children', authenticate, requireOrgPermission('view'), async (req, res) => {
    try {
        const organization = req.organization;
        const children = await getChildren(organization.id);

        res.json({
            ok: true,
            data: children
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

/**
 * @swagger
 * /api/v1/organizations/{id}/descendants:
 *   get:
 *     summary: Obtener todos los descendientes (recursivo)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/descendants', authenticate, requireOrgPermission('view'), async (req, res) => {
    try {
        const organization = req.organization;
        const descendants = await getDescendants(organization.id);

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

/**
 * @swagger
 * /api/v1/organizations/validate-slug:
 *   get:
 *     summary: Validar si un slug está disponible
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
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

        res.json({
            ok: true,
            data: {
                slug,
                available: !existing
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

/**
 * @swagger
 * /api/v1/organizations/delete-preview:
 *   post:
 *     summary: Preview del impacto de eliminación (sin ejecutar)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.post('/delete-preview', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res) => {
    try {
        const { organization_ids } = req.body;

        if (!organization_ids || !Array.isArray(organization_ids)) {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'organization_ids must be an array'
                }
            });
        }

        // Convertir public_codes a UUIDs
        const orgUuids = [];
        for (const publicCode of organization_ids) {
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

/**
 * @swagger
 * /api/v1/organizations/{id}/stats:
 *   get:
 *     summary: Obtener estadísticas de una organización
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/stats', authenticate, requireOrgPermission('view'), async (req, res) => {
    try {
        const organization = req.organization;

        // Contar usuarios
        const usersCount = await UserOrganization.count({
            where: { organization_id: organization.id }
        });

        // Contar hijos directos
        const children = await getChildren(organization.id, false);
        
        // Contar todos los descendientes
        const descendants = await getDescendants(organization.id, false);

        res.json({
            ok: true,
            data: {
                total_users: usersCount,
                total_children: children.length,
                total_descendants: descendants.length,
                created_at: organization.created_at,
                updated_at: organization.updated_at
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

/**
 * @swagger
 * /api/v1/organizations/{id}/activate:
 *   put:
 *     summary: Activar una organización
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id/activate', authenticate, requireOrgPermission('edit'), async (req, res) => {
    try {
        const organization = req.organization;

        const updated = await orgRepository.updateOrganization(organization.id, {
            is_active: true
        });

        await logAuditAction({
            entityType: 'organization',
            entityId: organization.id,
            action: 'activate',
            performedBy: req.user.id,
            changes: { is_active: true },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await invalidateOrganizationCache(organization.public_code);

        res.json({
            ok: true,
            data: {
                id: updated.public_code,
                is_active: updated.is_active
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

/**
 * @swagger
 * /api/v1/organizations/{id}/deactivate:
 *   put:
 *     summary: Desactivar una organización
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id/deactivate', authenticate, requireOrgPermission('edit'), async (req, res) => {
    try {
        const organization = req.organization;

        const updated = await orgRepository.updateOrganization(organization.id, {
            is_active: false
        });

        await logAuditAction({
            entityType: 'organization',
            entityId: organization.id,
            action: 'deactivate',
            performedBy: req.user.id,
            changes: { is_active: false },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await invalidateOrganizationCache(organization.public_code);

        res.json({
            ok: true,
            data: {
                id: updated.public_code,
                is_active: updated.is_active
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
