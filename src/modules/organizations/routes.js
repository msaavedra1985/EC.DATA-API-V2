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
 *     description: Obtiene lista de organizaciones con scope basado en permisos. System-admin ve todas, otros roles ven según jerarquía.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         description: Número máximo de resultados
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         description: Número de registros a saltar (paginación)
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *       - in: query
 *         name: search
 *         description: Buscar por nombre o slug
 *         schema:
 *           type: string
 *           example: "acme"
 *       - in: query
 *         name: parent_id
 *         description: Filtrar por organización padre (public_code)
 *         schema:
 *           type: string
 *           example: "ORG-1A2B3C"
 *       - in: query
 *         name: active_only
 *         description: Solo mostrar organizaciones activas
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Lista de organizaciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Organization'
 *                   example:
 *                     - id: "ORG-1A2B3C"
 *                       human_id: 1
 *                       name: "EC.DATA"
 *                       slug: "ecdata"
 *                       description: "Root organization"
 *                       parent_id: null
 *                       is_active: true
 *                       logo_url: null
 *                       website: "https://ec.data"
 *                       created_at: "2025-10-01T10:00:00Z"
 *                       updated_at: "2025-10-01T10:00:00Z"
 *                     - id: "ORG-4D5E6F"
 *                       human_id: 2
 *                       name: "ACME Corporation"
 *                       slug: "acme-corp"
 *                       description: "Client organization"
 *                       parent_id: "ORG-1A2B3C"
 *                       is_active: true
 *                       logo_url: "https://storage.azure.com/logos/acme.png"
 *                       website: "https://acme.com"
 *                       created_at: "2025-10-05T14:30:00Z"
 *                       updated_at: "2025-10-05T14:30:00Z"
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 42
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     has_more:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       403:
 *         description: Sin permisos - Usuario no tiene acceso a organizaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "FORBIDDEN"
 *                     message:
 *                       type: string
 *                       example: "Insufficient permissions"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error listing organizations"
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { limit = 20, offset = 0, search, parent_id, active_only = 'true' } = req.query;
        
        // Obtener scope del usuario
        const scope = await orgServices.getOrganizationScope(req.user.userId, req.user.role);
        
        // Construir filtros incluyendo scope
        const filters = {
            search,
            parent_id,
            is_active: active_only === 'true'
        };

        // Agregar filtro de scope si no es system-admin
        if (!scope.canAccessAll) {
            filters.organization_ids = scope.organizationIds;
        }

        // Buscar organizaciones con scope aplicado
        const result = await orgRepository.listOrganizations(
            parseInt(limit),
            parseInt(offset),
            filters
        );

        res.json({
            ok: true,
            data: result.organizations,
            meta: {
                total: result.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                has_more: result.total > parseInt(offset) + result.organizations.length
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
 *     description: Obtiene información completa de una organización específica. Requiere permiso de vista sobre la organización.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code de la organización (ej. ORG-1A2B3C)
 *         schema:
 *           type: string
 *           example: "ORG-1A2B3C"
 *     responses:
 *       200:
 *         description: Detalles de la organización obtenidos exitosamente
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
 *                   example:
 *                     id: "ORG-1A2B3C"
 *                     human_id: 1
 *                     name: "EC.DATA"
 *                     slug: "ecdata"
 *                     description: "Root organization for EC.DATA platform"
 *                     parent_id: null
 *                     is_active: true
 *                     logo_url: "https://storage.azure.com/logos/ecdata.png"
 *                     website: "https://ec.data"
 *                     created_at: "2025-10-01T10:00:00Z"
 *                     updated_at: "2025-10-01T10:00:00Z"
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       403:
 *         description: Sin permisos para ver esta organización
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "FORBIDDEN"
 *                     message:
 *                       type: string
 *                       example: "Insufficient permissions to view organization"
 *       404:
 *         description: Organización no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "NOT_FOUND"
 *                     message:
 *                       type: string
 *                       example: "Organization not found"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error getting organization"
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
 *     description: Crea una nueva organización. Requiere permisos de creación. Máximo 5 niveles de profundidad en jerarquía.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - country_id
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre de la organización
 *                 example: "ACME Corporation"
 *               slug:
 *                 type: string
 *                 description: Slug único (se genera automáticamente si no se proporciona)
 *                 example: "acme-corporation"
 *               parent_id:
 *                 type: string
 *                 description: Public code de la organización padre (opcional)
 *                 example: "ORG-1A2B3C"
 *               country_id:
 *                 type: string
 *                 description: ID del país
 *                 example: "MX"
 *               tax_id:
 *                 type: string
 *                 description: RFC o Tax ID
 *                 example: "ABC123456XYZ"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "contact@acme.com"
 *               phone:
 *                 type: string
 *                 example: "+52 55 1234 5678"
 *               address:
 *                 type: string
 *                 example: "Av. Reforma 123, CDMX"
 *               logo_url:
 *                 type: string
 *                 format: uri
 *                 example: "https://storage.azure.com/logos/acme.png"
 *               settings:
 *                 type: object
 *                 description: Configuraciones personalizadas JSON
 *     responses:
 *       201:
 *         description: Organización creada exitosamente
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
 *                   example:
 *                     id: "ORG-7G8H9J"
 *                     human_id: 15
 *                     name: "ACME Corporation"
 *                     slug: "acme-corporation"
 *                     description: null
 *                     parent_id: "ORG-1A2B3C"
 *                     is_active: true
 *                     logo_url: "https://storage.azure.com/logos/acme.png"
 *                     website: null
 *                     created_at: "2025-10-13T17:15:00Z"
 *                     updated_at: "2025-10-13T17:15:00Z"
 *       400:
 *         description: Error de validación - Datos inválidos en el request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "VALIDATION_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Invalid data"
 *                     details:
 *                       type: array
 *                       description: Array de errores de validación de Zod
 *                       example:
 *                         - path: ["name"]
 *                           message: "Required"
 *                         - path: ["country_id"]
 *                           message: "Invalid country code"
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       403:
 *         description: Sin permisos para crear organizaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "FORBIDDEN"
 *                     message:
 *                       type: string
 *                       example: "Insufficient permissions to create organization"
 *       404:
 *         description: Organización padre no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "PARENT_NOT_FOUND"
 *                     message:
 *                       type: string
 *                       example: "Parent organization not found"
 *       409:
 *         description: El slug ya existe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "SLUG_EXISTS"
 *                     message:
 *                       type: string
 *                       example: "Slug already exists"
 *                     details:
 *                       type: object
 *                       properties:
 *                         slug:
 *                           type: string
 *                           example: "acme-corporation"
 *       422:
 *         description: Profundidad máxima excedida (5 niveles)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "MAX_DEPTH_EXCEEDED"
 *                     message:
 *                       type: string
 *                       example: "Maximum organization depth (5 levels) exceeded"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error creating organization"
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
            performedBy: req.user.userId,
            changes: { created: validatedData },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Invalidar caché de jerarquía del padre
        if (parentOrg) {
            await invalidateOrganizationCache(parentOrg.public_code);
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

/**
 * @swagger
 * /api/v1/organizations/{id}:
 *   put:
 *     summary: Actualizar organización
 *     description: Actualiza información de una organización existente. Requiere permisos de edición. No permite cambios cíclicos en jerarquía.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code de la organización
 *         schema:
 *           type: string
 *           example: "ORG-1A2B3C"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               parent_id:
 *                 type: string
 *                 description: Public code del nuevo padre
 *               country_id:
 *                 type: string
 *               tax_id:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               logo_url:
 *                 type: string
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Organización actualizada exitosamente
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
 *                   example:
 *                     id: "ORG-4D5E6F"
 *                     human_id: 2
 *                     name: "ACME Corporation - Updated"
 *                     slug: "acme-corporation"
 *                     description: "Updated description"
 *                     parent_id: "ORG-1A2B3C"
 *                     is_active: true
 *                     logo_url: "https://storage.azure.com/logos/acme-new.png"
 *                     website: "https://acme.com"
 *                     created_at: "2025-10-05T14:30:00Z"
 *                     updated_at: "2025-10-13T17:20:00Z"
 *       400:
 *         description: Error de validación o referencia cíclica detectada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "VALIDATION_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Invalid data"
 *                     details:
 *                       type: array
 *                       description: Array de errores de validación de Zod
 *                       example:
 *                         - path: ["slug"]
 *                           message: "Invalid slug format"
 *                         - path: ["parent_id"]
 *                           message: "Invalid organization ID"
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       403:
 *         description: Sin permisos para editar esta organización
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "FORBIDDEN"
 *                     message:
 *                       type: string
 *                       example: "Insufficient permissions to edit organization"
 *       404:
 *         description: Organización no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "NOT_FOUND"
 *                     message:
 *                       type: string
 *                       example: "Organization not found"
 *       409:
 *         description: El slug ya existe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "SLUG_EXISTS"
 *                     message:
 *                       type: string
 *                       example: "Slug already exists"
 *                     details:
 *                       type: object
 *                       properties:
 *                         slug:
 *                           type: string
 *                           example: "acme-corporation"
 *       422:
 *         description: Profundidad máxima excedida o ciclo detectado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "CYCLE_DETECTED"
 *                     message:
 *                       type: string
 *                       example: "Cannot create circular hierarchy"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error updating organization"
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
                        message: 'Slug already exists',
                        details: { slug: validatedData.slug }
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
            performedBy: req.user.userId,
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
 *     description: Elimina varias organizaciones en lote con opción de cascade (elimina organizaciones hijas y usuarios). Solo para system-admin y org-admin.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization_ids
 *             properties:
 *               organization_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista de public codes de organizaciones a eliminar
 *                 example: ["ORG-1A2B3C", "ORG-4D5E6F"]
 *               hard_delete:
 *                 type: boolean
 *                 description: Si true, elimina permanentemente. Si false, marca como deleted
 *                 default: false
 *               delete_users:
 *                 type: boolean
 *                 description: Si true, elimina usuarios huérfanos
 *                 default: false
 *               reassign_org_id:
 *                 type: string
 *                 description: Public code de organización para reasignar usuarios huérfanos
 *     responses:
 *       200:
 *         description: Organizaciones eliminadas exitosamente
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
 *                     organizations_deleted:
 *                       type: integer
 *                     children_deleted:
 *                       type: integer
 *                     users_reassigned:
 *                       type: integer
 *                     users_deleted:
 *                       type: integer
 *                   example:
 *                     organizations_deleted: 2
 *                     children_deleted: 5
 *                     users_reassigned: 12
 *                     users_deleted: 0
 *       400:
 *         description: Error de validación - Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "VALIDATION_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Invalid data"
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       403:
 *         description: Sin permisos (requiere system-admin o org-admin)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "FORBIDDEN"
 *                     message:
 *                       type: string
 *                       example: "Insufficient permissions for batch delete"
 *       404:
 *         description: No se encontraron organizaciones para eliminar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "NO_ORGANIZATIONS_FOUND"
 *                     message:
 *                       type: string
 *                       example: "No organizations found to delete"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error deleting organizations"
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

/**
 * @swagger
 * /api/v1/organizations/upload-url:
 *   post:
 *     summary: Generar presigned URL para upload de logo
 *     description: Genera URL de Azure Blob Storage con firma temporal para subir archivos (logos, documentos). Expira en tiempo configurable.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Nombre del archivo
 *                 example: "logo.png"
 *               content_type:
 *                 type: string
 *                 description: MIME type del archivo
 *                 default: "image/png"
 *                 example: "image/png"
 *               prefix:
 *                 type: string
 *                 description: Prefijo de ruta en storage
 *                 default: "organizations"
 *                 example: "organizations/logos"
 *               expiry_minutes:
 *                 type: integer
 *                 description: Minutos antes de que expire la URL
 *                 default: 60
 *                 minimum: 1
 *                 maximum: 1440
 *     responses:
 *       200:
 *         description: URL presignada generada exitosamente
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
 *                     upload_url:
 *                       type: string
 *                       format: uri
 *                       description: URL para hacer PUT del archivo
 *                     public_url:
 *                       type: string
 *                       format: uri
 *                       description: URL pública del archivo después de subirlo
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                   example:
 *                     upload_url: "https://ecstorage.blob.core.windows.net/organizations/logos/logo-1697456789.png?sv=2021-06-08&se=2025-10-13T18%3A30%3A00Z&sr=b&sp=cw&sig=AbCdEf123456789..."
 *                     public_url: "https://ecstorage.blob.core.windows.net/organizations/logos/logo-1697456789.png"
 *                     expires_at: "2025-10-13T18:30:00Z"
 *       400:
 *         description: Error de validación - Datos inválidos en el request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "VALIDATION_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Invalid data"
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error generating upload URL"
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
 *     description: Obtiene estructura de árbol de organizaciones desde la raíz. Incluye todas las organizaciones hijas recursivamente. Usa caché de Redis.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: root_id
 *         description: Public code de la organización raíz (opcional, por defecto EC.DATA)
 *         schema:
 *           type: string
 *           example: "ORG-1A2B3C"
 *       - in: query
 *         name: active_only
 *         description: Solo incluir organizaciones activas
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Árbol jerárquico obtenido exitosamente
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
 *                   description: Nodo raíz con children recursivos
 *                   properties:
 *                     id:
 *                       type: string
 *                     public_code:
 *                       type: string
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     children:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Mismo esquema recursivamente
 *                   example:
 *                     id: "ORG-1A2B3C"
 *                     human_id: 1
 *                     name: "EC.DATA"
 *                     slug: "ecdata"
 *                     parent_id: null
 *                     is_active: true
 *                     children:
 *                       - id: "ORG-4D5E6F"
 *                         human_id: 2
 *                         name: "ACME Corporation"
 *                         slug: "acme-corp"
 *                         parent_id: "ORG-1A2B3C"
 *                         is_active: true
 *                         children:
 *                           - id: "ORG-7G8H9J"
 *                             human_id: 5
 *                             name: "ACME North Division"
 *                             slug: "acme-north"
 *                             parent_id: "ORG-4D5E6F"
 *                             is_active: true
 *                             children: []
 *                           - id: "ORG-2K3L4M"
 *                             human_id: 6
 *                             name: "ACME South Division"
 *                             slug: "acme-south"
 *                             parent_id: "ORG-4D5E6F"
 *                             is_active: true
 *                             children: []
 *                       - id: "ORG-5N6P7Q"
 *                         human_id: 3
 *                         name: "TechStart Inc"
 *                         slug: "techstart"
 *                         parent_id: "ORG-1A2B3C"
 *                         is_active: true
 *                         children: []
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       404:
 *         description: Organización raíz no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "ROOT_NOT_FOUND"
 *                     message:
 *                       type: string
 *                       example: "Root organization not found"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error getting hierarchy"
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
 *     description: Obtiene solo los hijos de primer nivel (no recursivo) de una organización específica.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code de la organización
 *         schema:
 *           type: string
 *           example: "ORG-1A2B3C"
 *     responses:
 *       200:
 *         description: Lista de hijos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Organization'
 *                   example:
 *                     - id: "ORG-4D5E6F"
 *                       human_id: 2
 *                       name: "ACME Corporation"
 *                       slug: "acme-corp"
 *                       description: "Technology division"
 *                       parent_id: "ORG-1A2B3C"
 *                       is_active: true
 *                       logo_url: "https://storage.azure.com/logos/acme.png"
 *                       website: "https://acme.com"
 *                       created_at: "2025-10-05T14:30:00Z"
 *                       updated_at: "2025-10-05T14:30:00Z"
 *                     - id: "ORG-5N6P7Q"
 *                       human_id: 3
 *                       name: "TechStart Inc"
 *                       slug: "techstart"
 *                       description: "Innovation startup"
 *                       parent_id: "ORG-1A2B3C"
 *                       is_active: true
 *                       logo_url: "https://storage.azure.com/logos/techstart.png"
 *                       website: "https://techstart.io"
 *                       created_at: "2025-10-07T09:15:00Z"
 *                       updated_at: "2025-10-07T09:15:00Z"
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       403:
 *         description: Sin permisos para ver hijos de esta organización
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "FORBIDDEN"
 *                     message:
 *                       type: string
 *                       example: "Insufficient permissions to view children"
 *       404:
 *         description: Organización no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "NOT_FOUND"
 *                     message:
 *                       type: string
 *                       example: "Organization not found"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error getting children"
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
 *     description: Obtiene todos los descendientes de una organización de forma recursiva (hijos, nietos, etc).
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code de la organización
 *         schema:
 *           type: string
 *           example: "ORG-1A2B3C"
 *     responses:
 *       200:
 *         description: Lista de descendientes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Organization'
 *                   example:
 *                     - id: "ORG-4D5E6F"
 *                       human_id: 2
 *                       name: "ACME Corporation"
 *                       slug: "acme-corp"
 *                       description: "Technology division"
 *                       parent_id: "ORG-1A2B3C"
 *                       is_active: true
 *                       logo_url: "https://storage.azure.com/logos/acme.png"
 *                       website: "https://acme.com"
 *                       created_at: "2025-10-05T14:30:00Z"
 *                       updated_at: "2025-10-05T14:30:00Z"
 *                     - id: "ORG-7G8H9J"
 *                       human_id: 5
 *                       name: "ACME North Division"
 *                       slug: "acme-north"
 *                       description: "Northern operations"
 *                       parent_id: "ORG-4D5E6F"
 *                       is_active: true
 *                       logo_url: null
 *                       website: null
 *                       created_at: "2025-10-08T11:00:00Z"
 *                       updated_at: "2025-10-08T11:00:00Z"
 *                     - id: "ORG-2K3L4M"
 *                       human_id: 6
 *                       name: "ACME South Division"
 *                       slug: "acme-south"
 *                       description: "Southern operations"
 *                       parent_id: "ORG-4D5E6F"
 *                       is_active: true
 *                       logo_url: null
 *                       website: null
 *                       created_at: "2025-10-08T11:30:00Z"
 *                       updated_at: "2025-10-08T11:30:00Z"
 *                     - id: "ORG-5N6P7Q"
 *                       human_id: 3
 *                       name: "TechStart Inc"
 *                       slug: "techstart"
 *                       description: "Innovation startup"
 *                       parent_id: "ORG-1A2B3C"
 *                       is_active: true
 *                       logo_url: "https://storage.azure.com/logos/techstart.png"
 *                       website: "https://techstart.io"
 *                       created_at: "2025-10-07T09:15:00Z"
 *                       updated_at: "2025-10-07T09:15:00Z"
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       403:
 *         description: Sin permisos para ver descendientes de esta organización
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "FORBIDDEN"
 *                     message:
 *                       type: string
 *                       example: "Insufficient permissions to view descendants"
 *       404:
 *         description: Organización no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "NOT_FOUND"
 *                     message:
 *                       type: string
 *                       example: "Organization not found"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error getting descendants"
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
 *     description: Verifica si un slug está disponible para usar en una nueva organización o para renombrar existente.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: slug
 *         required: true
 *         description: Slug a validar
 *         schema:
 *           type: string
 *           pattern: '^[a-z0-9-]+$'
 *           example: "acme-corporation"
 *     responses:
 *       200:
 *         description: Validación completada
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
 *                     slug:
 *                       type: string
 *                     available:
 *                       type: boolean
 *                       description: true si está disponible, false si ya existe
 *                   example:
 *                     slug: "acme-corporation"
 *                     available: true
 *       400:
 *         description: Slug no proporcionado o formato inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "VALIDATION_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Invalid slug format"
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error validating slug"
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
 *     description: Simula la eliminación de organizaciones mostrando cuántas organizaciones hijas y usuarios se verían afectados. NO ejecuta la eliminación.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization_ids
 *             properties:
 *               organization_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista de public codes de organizaciones
 *                 example: ["ORG-1A2B3C", "ORG-4D5E6F"]
 *     responses:
 *       200:
 *         description: Preview generado exitosamente
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
 *                     organizations_to_delete:
 *                       type: integer
 *                       description: Número de organizaciones a eliminar
 *                     children_to_delete:
 *                       type: integer
 *                       description: Número de organizaciones hijas que se eliminarían
 *                     users_affected:
 *                       type: integer
 *                       description: Número de usuarios que perderían acceso
 *                     orphan_users:
 *                       type: integer
 *                       description: Usuarios que quedarían sin organización
 *                   example:
 *                     organizations_to_delete: 2
 *                     children_to_delete: 7
 *                     users_affected: 24
 *                     orphan_users: 3
 *       400:
 *         description: Error de validación - Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INVALID_INPUT"
 *                     message:
 *                       type: string
 *                       example: "organization_ids must be an array"
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       403:
 *         description: Sin permisos (requiere system-admin o org-admin)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "FORBIDDEN"
 *                     message:
 *                       type: string
 *                       example: "Insufficient permissions for delete preview"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error generating preview"
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
 *     description: Obtiene métricas y estadísticas de una organización (usuarios, hijos, descendientes, fechas).
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code de la organización
 *         schema:
 *           type: string
 *           example: "ORG-1A2B3C"
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
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
 *                     total_users:
 *                       type: integer
 *                       description: Número de usuarios asignados
 *                     total_children:
 *                       type: integer
 *                       description: Número de organizaciones hijas directas
 *                     total_descendants:
 *                       type: integer
 *                       description: Número total de descendientes (recursivo)
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                   example:
 *                     total_users: 45
 *                     total_children: 3
 *                     total_descendants: 8
 *                     created_at: "2025-10-01T10:00:00Z"
 *                     updated_at: "2025-10-13T16:45:00Z"
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       403:
 *         description: Sin permisos para ver estadísticas de esta organización
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "FORBIDDEN"
 *                     message:
 *                       type: string
 *                       example: "Insufficient permissions to view stats"
 *       404:
 *         description: Organización no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "NOT_FOUND"
 *                     message:
 *                       type: string
 *                       example: "Organization not found"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error getting stats"
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
 *     description: Activa una organización previamente desactivada. Requiere permisos de edición.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code de la organización
 *         schema:
 *           type: string
 *           example: "ORG-1A2B3C"
 *     responses:
 *       200:
 *         description: Organización activada exitosamente
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
 *                     id:
 *                       type: string
 *                       description: Public code de la organización
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *                   example:
 *                     id: "ORG-4D5E6F"
 *                     is_active: true
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       403:
 *         description: Sin permisos para activar esta organización
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "FORBIDDEN"
 *                     message:
 *                       type: string
 *                       example: "Insufficient permissions to activate organization"
 *       404:
 *         description: Organización no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "NOT_FOUND"
 *                     message:
 *                       type: string
 *                       example: "Organization not found"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error activating organization"
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
            performedBy: req.user.userId,
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
 *     description: Desactiva una organización (soft disable). Requiere permisos de edición. No elimina la organización ni sus datos.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code de la organización
 *         schema:
 *           type: string
 *           example: "ORG-1A2B3C"
 *     responses:
 *       200:
 *         description: Organización desactivada exitosamente
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
 *                     id:
 *                       type: string
 *                       description: Public code de la organización
 *                     is_active:
 *                       type: boolean
 *                       example: false
 *                   example:
 *                     id: "ORG-4D5E6F"
 *                     is_active: false
 *       401:
 *         description: No autenticado - Token JWT faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "UNAUTHORIZED"
 *                     message:
 *                       type: string
 *                       example: "Authentication required"
 *       403:
 *         description: Sin permisos para desactivar esta organización
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "FORBIDDEN"
 *                     message:
 *                       type: string
 *                       example: "Insufficient permissions to deactivate organization"
 *       404:
 *         description: Organización no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "NOT_FOUND"
 *                     message:
 *                       type: string
 *                       example: "Organization not found"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INTERNAL_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Error deactivating organization"
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
            performedBy: req.user.userId,
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
