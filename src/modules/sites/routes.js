// modules/sites/routes.js
// Rutas REST para el módulo de Sites (Locaciones Físicas)

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import { validateResourceOwnership } from '../../middleware/validateResourceOwnership.js';
import * as siteServices from './services.js';
import * as siteRepository from './repository.js';
import {
    createSiteSchema,
    updateSiteSchema,
    listSitesSchema,
    getSiteSchema,
    deleteSiteSchema
} from './dtos/index.js';
import logger from '../../utils/logger.js';

// Middleware de validación de ownership para Sites
// Verifica que el recurso pertenece a una organización accesible por el usuario
const validateSiteOwnership = validateResourceOwnership({
    findById: siteRepository.findSiteById,
    findByPublicCode: siteRepository.findSiteByPublicCodeInternal,
    resourceName: 'site',
    paramName: 'id',
    checkSoftDelete: true
});

const router = express.Router();
const siteLogger = logger.child({ component: 'sites' });

/**
 * @swagger
 * /api/v1/sites:
 *   post:
 *     summary: Crear un nuevo site (locación física)
 *     description: Crea un site perteneciente a una organización. Solo system-admin y org-admin pueden crear sites.
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization_id
 *               - name
 *               - country_id
 *             properties:
 *               organization_id:
 *                 type: string
 *                 description: Public code de la organización (ej SITE-abc123-1)
 *                 example: "ORG-yOM9ewfqOeWa-4"
 *               name:
 *                 type: string
 *                 description: Nombre del site
 *                 example: "Sucursal Centro"
 *               description:
 *                 type: string
 *                 description: Descripción del site
 *                 example: "Oficina central en el microcentro"
 *               latitude:
 *                 type: number
 *                 description: Latitud GPS (-90 a 90)
 *                 example: -34.6037389
 *               longitude:
 *                 type: number
 *                 description: Longitud GPS (-180 a 180)
 *                 example: -58.3815704
 *               address:
 *                 type: string
 *                 description: Dirección completa
 *                 example: "Av. Corrientes 1234"
 *               street_number:
 *                 type: string
 *                 description: Número de calle
 *                 example: "1234"
 *               city:
 *                 type: string
 *                 description: Ciudad
 *                 example: "Buenos Aires"
 *               state_province:
 *                 type: string
 *                 description: Provincia/Estado
 *                 example: "Ciudad Autónoma de Buenos Aires"
 *               postal_code:
 *                 type: string
 *                 description: Código postal
 *                 example: "C1043"
 *               country_id:
 *                 type: integer
 *                 description: ID del país (tabla countries)
 *                 example: 10
 *               timezone:
 *                 type: string
 *                 description: Zona horaria
 *                 example: "America/Argentina/Buenos_Aires"
 *               building_type:
 *                 type: string
 *                 enum: [office, warehouse, factory, retail, hospital, school, datacenter, hotel, restaurant, residential, mixed, other]
 *                 description: Tipo de edificio
 *                 example: "office"
 *               area_m2:
 *                 type: number
 *                 description: Área en metros cuadrados
 *                 example: 2500.50
 *               floors:
 *                 type: integer
 *                 description: Número de pisos
 *                 example: 12
 *               operating_hours:
 *                 type: string
 *                 description: Horario de operación
 *                 example: "Lun-Vie 9:00-18:00"
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 description: URL de imagen del site
 *                 example: "https://example.com/site.jpg"
 *               contact_name:
 *                 type: string
 *                 description: Nombre del contacto
 *                 example: "Juan Pérez"
 *               contact_phone:
 *                 type: string
 *                 description: Teléfono del contacto
 *                 example: "+54-11-5555-0300"
 *               contact_email:
 *                 type: string
 *                 format: email
 *                 description: Email del contacto
 *                 example: "contacto@site.com"
 *               is_active:
 *                 type: boolean
 *                 description: Si el site está activo
 *                 default: true
 *     responses:
 *       201:
 *         description: Site creado exitosamente
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
 *                       example: "SITE-abc123xyz-1"
 *                     name:
 *                       type: string
 *                       example: "Sucursal Centro"
 *                     description:
 *                       type: string
 *                       example: "Oficina central"
 *                     latitude:
 *                       type: number
 *                       example: -34.6037389
 *                     longitude:
 *                       type: number
 *                       example: -58.3815704
 *                     address:
 *                       type: string
 *                       example: "Av. Corrientes 1234"
 *                     city:
 *                       type: string
 *                       example: "Buenos Aires"
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *                     organization:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "ORG-yOM9ewfqOeWa-4"
 *                         name:
 *                           type: string
 *                           example: "EC.DATA"
 *                     country:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 10
 *                         iso_alpha2:
 *                           type: string
 *                           example: "AR"
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Organización o país no encontrado
 */
router.post('/', authenticate, requireRole(['system-admin', 'org-admin']), validate(createSiteSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const site = await siteServices.createSite(req.body, userId, ipAddress, userAgent);
        
        res.status(201).json({
            ok: true,
            data: site,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/sites:
 *   get:
 *     summary: Listar sites con paginación y filtros
 *     description: |
 *       Obtiene lista de sites filtrados por organización.
 *       
 *       **Comportamiento del filtro por organización:**
 *       - Sin filtro: Usa automáticamente la organización activa del usuario (del JWT)
 *       - Con `organization_id`: Filtra por esa organización específica (si tiene acceso)
 *       - Con `all=true`: Solo admins (system-admin, org-admin), muestra todos los sites accesibles
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         description: Filtrar por organización específica (public_code). Si no se especifica, usa la organización activa del usuario.
 *         schema:
 *           type: string
 *           example: "ORG-yOM9ewfqOeWa-4"
 *       - in: query
 *         name: all
 *         description: Solo admins - Si es "true", muestra todos los sites sin filtrar por organización
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *           example: "true"
 *       - in: query
 *         name: country_id
 *         description: Filtrar por país
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: is_active
 *         description: Filtrar por estado activo
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: city
 *         description: Filtrar por ciudad
 *         schema:
 *           type: string
 *           example: "Buenos Aires"
 *       - in: query
 *         name: not_in_hierarchy
 *         description: Si es "true", muestra solo sites que NO están en ninguna jerarquía de recursos. Útil para evitar duplicados al agregar a la jerarquía.
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *           example: "true"
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
 *         description: Número de registros a saltar
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *     responses:
 *       200:
 *         description: Lista de sites obtenida exitosamente
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
 *                   description: Array de sites
 *                   items:
 *                     $ref: '#/components/schemas/Site'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 15
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     organizationFilter:
 *                       type: object
 *       401:
 *         description: No autenticado
 */
router.get('/', authenticate, enforceActiveOrganization, validate(listSitesSchema), async (req, res, next) => {
    try {
        // Usa la organización del contexto establecido por el middleware
        // Si showAll=true (God View), no filtra por organización
        const result = await siteServices.listSites({
            ...req.query,
            organization_id: req.organizationContext.id,
            showAll: req.organizationContext.showAll || false
        });
        
        // Respuesta con estructura estándar: data[] + meta{}
        res.json({
            ok: true,
            data: result.items,
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                timestamp: new Date().toISOString(),
                locale: req.locale,
                organizationFilter: req.organizationFilter
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/sites/{id}:
 *   get:
 *     summary: Obtener un site por ID
 *     description: Obtiene los detalles de un site específico por su public_code
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code del site (ej SITE-abc123-1)
 *         schema:
 *           type: string
 *           example: "SITE-abc123xyz-1"
 *     responses:
 *       200:
 *         description: Site obtenido exitosamente
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
 *       404:
 *         description: Site no encontrado
 *       401:
 *         description: No autenticado
 */
router.get('/:id', authenticate, validateSiteOwnership, validate(getSiteSchema), async (req, res, next) => {
    try {
        // El middleware validateSiteOwnership ya validó el acceso
        // Usamos el servicio para obtener el DTO público completo con relaciones
        const site = await siteServices.getSiteByPublicCode(req.params.id);
        
        res.json({
            ok: true,
            data: site,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/sites/{id}:
 *   put:
 *     summary: Actualizar un site
 *     description: Actualiza los datos de un site existente. Solo system-admin y org-admin pueden actualizar.
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code del site
 *         schema:
 *           type: string
 *           example: "SITE-abc123xyz-1"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Sucursal Centro - Actualizada"
 *               description:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state_province:
 *                 type: string
 *               postal_code:
 *                 type: string
 *               country_id:
 *                 type: integer
 *               timezone:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Site actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Site no encontrado
 */
router.put('/:id', authenticate, requireRole(['system-admin', 'org-admin']), validateSiteOwnership, validate(updateSiteSchema), async (req, res, next) => {
    try {
        // El middleware validateSiteOwnership ya validó el acceso
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const site = await siteServices.updateSite(req.params.id, req.body, userId, ipAddress, userAgent);
        
        res.json({
            ok: true,
            data: site,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/sites/{id}:
 *   delete:
 *     summary: Eliminar un site (soft delete)
 *     description: Elimina lógicamente un site. Solo system-admin puede eliminar.
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code del site
 *         schema:
 *           type: string
 *           example: "SITE-abc123xyz-1"
 *     responses:
 *       200:
 *         description: Site eliminado exitosamente
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
 *                     message:
 *                       type: string
 *                       example: "Site eliminado exitosamente"
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Site no encontrado
 */
router.delete('/:id', authenticate, requireRole(['system-admin']), validateSiteOwnership, validate(deleteSiteSchema), async (req, res, next) => {
    try {
        // El middleware validateSiteOwnership ya validó el acceso y existencia
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const deleted = await siteServices.deleteSite(req.params.id, userId, ipAddress, userAgent);
        
        if (!deleted) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'SITE_NOT_FOUND',
                    message: 'Site no encontrado'
                }
            });
        }
        
        res.json({
            ok: true,
            data: {
                message: 'Site eliminado exitosamente'
            },
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
