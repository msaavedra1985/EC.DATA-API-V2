// modules/channels/routes.js
// Rutas REST para el módulo de Channels (Puntos de Medición de Dispositivos)

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import { validateResourceOwnership } from '../../middleware/validateResourceOwnership.js';
import * as channelServices from './services.js';
import * as channelRepository from './repository.js';
import {
    createChannelSchema,
    updateChannelSchema,
    getChannelsSchema,
    getChannelByIdSchema,
    deleteChannelSchema
} from './dtos/index.js';
import logger from '../../utils/logger.js';

const validateChannelOwnership = validateResourceOwnership({
    findById: channelRepository.findChannelById,
    findByPublicCode: channelRepository.findChannelByPublicCodeInternal,
    resourceName: 'channel',
    paramName: 'id',
    checkSoftDelete: true
});

const router = express.Router();
const channelLogger = logger.child({ component: 'channels' });

/**
 * @swagger
 * /api/v1/channels:
 *   post:
 *     summary: Crear un nuevo channel (punto de medición)
 *     description: Crea un punto de medición perteneciente a un dispositivo. El organization_id se obtiene automáticamente del dispositivo.
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_id
 *               - name
 *             properties:
 *               device_id:
 *                 type: string
 *                 description: Public code del dispositivo
 *                 example: "DEV-abc123xyz-1"
 *               name:
 *                 type: string
 *                 description: Nombre del canal (único por dispositivo)
 *                 example: "Edificio 1 - Lado Derecho"
 *               description:
 *                 type: string
 *                 description: Descripción del canal
 *               ch:
 *                 type: integer
 *                 description: Número de canal físico
 *                 example: 1
 *               measurement_type_id:
 *                 type: integer
 *                 description: ID del tipo de medición
 *                 example: 1
 *               phase_system:
 *                 type: integer
 *                 description: "Sistema eléctrico: 0=N/A, 1=monofásico, 3=trifásico"
 *                 example: 3
 *               phase:
 *                 type: integer
 *                 description: "Fase que lee (1, 2 o 3)"
 *                 minimum: 1
 *                 maximum: 3
 *                 example: 1
 *               process:
 *                 type: boolean
 *                 description: Si se procesan los datos del canal
 *                 default: true
 *               status:
 *                 type: string
 *                 enum: [active, inactive, error, disabled]
 *                 default: active
 *               metadata:
 *                 type: object
 *                 description: Metadatos adicionales
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Channel creado exitosamente
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
 *                       example: "CHN-abc123xyz-1"
 *                     name:
 *                       type: string
 *                       example: "Edificio 1 - Lado Derecho"
 *                     ch:
 *                       type: integer
 *                       example: 1
 *                     measurement_type_id:
 *                       type: integer
 *                       example: 1
 *                     phase_system:
 *                       type: integer
 *                       example: 3
 *                     phase:
 *                       type: integer
 *                       example: 1
 *                     process:
 *                       type: boolean
 *                       example: true
 *                     status:
 *                       type: string
 *                       example: "active"
 *                     device:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "DEV-abc123xyz-1"
 *                         name:
 *                           type: string
 *                     organization:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "ORG-yOM9ewfqOeWa-4"
 *                         name:
 *                           type: string
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Device no encontrado
 */
router.post('/', authenticate, requireRole(['system-admin', 'org-admin']), validate(createChannelSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const channel = await channelServices.createChannel(req.body, userId, ipAddress, userAgent);
        
        res.status(201).json({
            ok: true,
            data: channel,
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
 * /api/v1/channels:
 *   get:
 *     summary: Listar channels con paginación y filtros
 *     description: Obtiene una lista paginada de channels con filtros opcionales.
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: device_id
 *         schema:
 *           type: string
 *         description: Filtrar por public_code del dispositivo
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *         description: Filtrar por public_code de la organización
 *       - in: query
 *         name: measurement_type_id
 *         schema:
 *           type: integer
 *         description: Filtrar por tipo de medición
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, error, disabled]
 *         description: Filtrar por estado
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en nombre o descripción
 *       - in: query
 *         name: not_in_hierarchy
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Si es "true", muestra solo channels que NO están en ninguna jerarquía de recursos
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Lista de channels obtenida exitosamente
 *       400:
 *         description: Parámetros inválidos
 */
router.get('/', authenticate, enforceActiveOrganization, validate(getChannelsSchema), async (req, res, next) => {
    try {
        const { device_id, measurement_type_id, status, search, not_in_hierarchy, limit, offset } = req.query;
        
        const result = await channelServices.listChannels({
            device_id,
            organization_id: req.organizationContext.id,
            measurement_type_id,
            status,
            search,
            not_in_hierarchy,
            limit,
            offset,
            showAll: req.organizationContext.showAll || false
        });
        
        res.status(200).json({
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
 * /api/v1/channels/{id}:
 *   get:
 *     summary: Obtener un channel por ID público
 *     description: Obtiene los detalles de un channel específico usando su public_code.
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del channel
 *         example: "CHN-abc123xyz-1"
 *     responses:
 *       200:
 *         description: Channel obtenido exitosamente
 *       404:
 *         description: Channel no encontrado
 */
router.get('/:id', authenticate, validateChannelOwnership, validate(getChannelByIdSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const channel = await channelServices.getChannelByPublicCode(id);
        
        res.status(200).json({
            ok: true,
            data: channel,
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
 * /api/v1/channels/{id}:
 *   put:
 *     summary: Actualizar un channel
 *     description: Actualiza los datos de un channel existente.
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del channel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               ch:
 *                 type: integer
 *               measurement_type_id:
 *                 type: integer
 *               phase_system:
 *                 type: integer
 *                 description: "0=N/A, 1=monofásico, 3=trifásico"
 *               phase:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 3
 *               process:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [active, inactive, error, disabled]
 *               metadata:
 *                 type: object
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Channel actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Channel no encontrado
 */
router.put('/:id', authenticate, requireRole(['system-admin', 'org-admin']), validateChannelOwnership, validate(updateChannelSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const channel = await channelServices.updateChannel(id, req.body, userId, ipAddress, userAgent);
        
        res.status(200).json({
            ok: true,
            data: channel,
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
 * /api/v1/channels/{id}:
 *   delete:
 *     summary: Eliminar un channel (soft delete)
 *     description: Realiza un soft delete de un channel. Solo system-admin puede eliminar channels.
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del channel
 *     responses:
 *       200:
 *         description: Channel eliminado exitosamente
 *       404:
 *         description: Channel no encontrado
 */
router.delete('/:id', authenticate, requireRole(['system-admin']), validateChannelOwnership, validate(deleteChannelSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        await channelServices.deleteChannel(id, userId, ipAddress, userAgent);
        
        res.status(200).json({
            ok: true,
            data: {
                message: 'Channel eliminado exitosamente'
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
