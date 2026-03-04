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
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     timestamp:
 *                       type: string
 *                       format: date-time
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

/**
 * @swagger
 * /api/v1/organizations/validate-slug:
 *   get:
 *     summary: Validar disponibilidad de slug
 *     description: Verifica si un slug está disponible para uso. Útil para validación en tiempo real en formularios.
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
 *           example: "acme-corp"
 *     responses:
 *       200:
 *         description: Validación exitosa
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
 *                       example: "acme-corp"
 *                     available:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Slug faltante o inválido
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
 *                       example: "MISSING_SLUG"
 *                     message:
 *                       type: string
 *                       example: "Slug parameter is required"
 *       401:
 *         description: No autenticado
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
 *                     id: "ORG-7K9D2-X"
 *                     slug: "ec-data"
 *                     name: "EC.DATA"
 *                     description: "Enterprise data solutions and backend infrastructure"
 *                     logo_url: "https://storage.azure.com/logos/ecdata.png"
 *                     website: "https://ec.data"
 *                     countries:
 *                       - code: "US"
 *                         is_primary: true
 *                     primary_country: "US"
 *                     is_active: true
 *                     has_parent: false
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
 * /api/v1/organizations/validate:
 *   post:
 *     summary: Validar disponibilidad de nombre y/o slug de organización
 *     description: Verifica si el nombre o slug ya están en uso. Útil para validación en tiempo real en formularios.
 *     tags: [Organizations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre de organización a validar
 *                 example: "ACME Corporation"
 *               slug:
 *                 type: string
 *                 description: Slug a validar
 *                 example: "acme-corp"
 *               exclude_id:
 *                 type: string
 *                 description: Public code de organización a excluir (para edición)
 *                 example: "ORG-1A2B3C"
 *             oneOf:
 *               - required: [name]
 *               - required: [slug]
 *     responses:
 *       200:
 *         description: Validación exitosa
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
 *                     valid:
 *                       type: boolean
 *                       description: true si está disponible, false si hay conflictos
 *                       example: false
 *                     conflicts:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: boolean
 *                           description: true si el nombre ya existe
 *                           example: true
 *                         slug:
 *                           type: boolean
 *                           description: true si el slug ya existe
 *                           example: false
 *                   example:
 *                     valid: false
 *                     conflicts:
 *                       name: true
 *                       slug: false
 *       400:
 *         description: Error de validación - Al menos name o slug debe estar presente
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
 *                       example:
 *                         - path: ["name"]
 *                           message: "At least one of name or slug must be provided"
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
 *                       example: "Error validating organization"
 */
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
 *               countries:
 *                 type: array
 *                 description: Países donde opera la organización (mínimo 1, exactamente 1 primary)
 *                 items:
 *                   type: object
 *                   required:
 *                     - code
 *                   properties:
 *                     code:
 *                       type: string
 *                       description: Código ISO 3166-1 alpha-2 del país
 *                       example: "MX"
 *                     is_primary:
 *                       type: boolean
 *                       description: Indica si es el país principal
 *                       example: true
 *                 example:
 *                   - code: "MX"
 *                     is_primary: true
 *                   - code: "CO"
 *                     is_primary: false
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
 *                         - path: ["countries"]
 *                           message: "At least one country is required"
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
 *               countries:
 *                 type: array
 *                 description: Países donde opera la organización
 *                 items:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "MX"
 *                     is_primary:
 *                       type: boolean
 *                       example: true
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

/**
 * @swagger
 * /api/v1/organizations/{id}/move:
 *   patch:
 *     summary: Mover organización en la jerarquía
 *     description: Cambia el padre de una organización. Valida que no se creen ciclos y respeta límites de profundidad. Requiere permisos de edición.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code de la organización a mover
 *         schema:
 *           type: string
 *           example: "ORG-4D5E6F"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parent_id
 *             properties:
 *               parent_id:
 *                 type: string
 *                 nullable: true
 *                 description: Public code del nuevo padre, o null para convertir en raíz
 *                 example: "ORG-1A2B3C"
 *     responses:
 *       200:
 *         description: Organización movida exitosamente
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
 *                       example: "ORG-4D5E6F"
 *                     name:
 *                       type: string
 *                       example: "ACME Corporation"
 *                     parent_id:
 *                       type: string
 *                       example: "ORG-1A2B3C"
 *                     old_parent_id:
 *                       type: string
 *                       nullable: true
 *                       example: "ORG-7G8H9J"
 *       400:
 *         description: Error de validación
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
 *         description: No autenticado
 *       403:
 *         description: Sin permisos para mover esta organización
 *       404:
 *         description: Organización o padre no encontrado
 *       422:
 *         description: Ciclo detectado o profundidad máxima excedida
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
 */
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

/**
 * @swagger
 * /api/v1/organizations/{id}:
 *   delete:
 *     summary: Eliminar organización (soft delete)
 *     description: Marca organización como eliminada. Valida que no tenga hijos activos. Los usuarios se mantienen y se les quita la membresía. Requiere permisos de eliminación.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code de la organización a eliminar
 *         schema:
 *           type: string
 *           example: "ORG-4D5E6F"
 *     responses:
 *       200:
 *         description: Organización eliminada exitosamente
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
 *                     deleted:
 *                       type: boolean
 *                       example: true
 *                     organization_id:
 *                       type: string
 *                       example: "ORG-4D5E6F"
 *                     memberships_removed:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Organización tiene hijos activos
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
 *                       example: "HAS_ACTIVE_CHILDREN"
 *                     message:
 *                       type: string
 *                       example: "Cannot delete organization with active children"
 *                     details:
 *                       type: object
 *                       properties:
 *                         children_count:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos para eliminar esta organización
 *       404:
 *         description: Organización no encontrada
 *       500:
 *         description: Error interno del servidor
 */
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

/**
 * @swagger
 * /api/v1/organizations/{id}/children:
 *   get:
 *     summary: Obtener hijos directos de una organización con lazy loading
 *     description: Obtiene los hijos de una organización con soporte de lazy loading. Por defecto carga 2 niveles e incluye flag hasChildren para saber si cada nodo tiene descendientes.
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
 *       - in: query
 *         name: levels
 *         description: Número de niveles a cargar (default 2)
 *         schema:
 *           type: integer
 *           default: 2
 *           minimum: 1
 *           maximum: 5
 *       - in: query
 *         name: active_only
 *         description: Solo organizaciones activas
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Hijos obtenidos exitosamente con hasChildren flag
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

/**
 * @swagger
 * /api/v1/organizations/{id}/subtree:
 *   get:
 *     summary: Obtener árbol completo de organización y descendientes
 *     description: Obtiene el árbol jerárquico completo desde una organización específica hacia abajo. Soporta lazy loading con niveles configurables.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code de la organización raíz
 *         schema:
 *           type: string
 *           example: "ORG-1A2B3C"
 *       - in: query
 *         name: levels
 *         description: Número de niveles a cargar (lazy loading, default 2). Use 0 para solo el nodo actual.
 *         schema:
 *           type: integer
 *           default: 2
 *           minimum: 0
 *           maximum: 10
 *       - in: query
 *         name: active_only
 *         description: Solo organizaciones activas
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Árbol obtenido exitosamente
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
 *                       example: "ORG-1A2B3C"
 *                     name:
 *                       type: string
 *                       example: "EC.DATA"
 *                     hasChildren:
 *                       type: boolean
 *                       example: true
 *                     children:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Organización no encontrada
 *       500:
 *         description: Error interno del servidor
 */
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
