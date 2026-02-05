// modules/devices/routes.js
// Rutas REST para el módulo de Devices (Dispositivos IoT/Edge)

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import { validateResourceOwnership } from '../../middleware/validateResourceOwnership.js';
import * as deviceServices from './services.js';
import * as deviceRepository from './repository.js';
import {
    createDeviceSchema,
    updateDeviceSchema,
    getDevicesSchema,
    getDeviceByIdSchema,
    deleteDeviceSchema
} from './dtos/index.js';
import logger from '../../utils/logger.js';
import deviceMetadataRoutes from '../device-metadata/routes.js';

// Middleware de validación de ownership para Devices
// Verifica que el recurso pertenece a una organización accesible por el usuario
const validateDeviceOwnership = validateResourceOwnership({
    findById: deviceRepository.findDeviceById,
    findByPublicCode: deviceRepository.findDeviceByPublicCodeInternal,
    resourceName: 'device',
    paramName: 'id',
    checkSoftDelete: true
});

const router = express.Router();
const deviceLogger = logger.child({ component: 'devices' });

/**
 * @swagger
 * /api/v1/devices:
 *   post:
 *     summary: Crear un nuevo device (dispositivo IoT/Edge)
 *     description: Crea un device perteneciente a una organización y opcionalmente a un site. Solo system-admin y org-admin pueden crear devices.
 *     tags: [Devices]
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
 *               - device_type
 *             properties:
 *               organization_id:
 *                 type: string
 *                 description: Public code de la organización (ej ORG-abc123-1)
 *                 example: "ORG-yOM9ewfqOeWa-4"
 *               site_id:
 *                 type: string
 *                 description: Public code del site (opcional)
 *                 example: "SITE-abc123xyz-1"
 *               name:
 *                 type: string
 *                 description: Nombre del device
 *                 example: "Sensor Temperatura Sala 1"
 *               description:
 *                 type: string
 *                 description: Descripción del device
 *                 example: "Sensor de temperatura y humedad en sala principal"
 *               device_type:
 *                 type: string
 *                 enum: [sensor, gateway, controller, edge, virtual, other]
 *                 description: Tipo de dispositivo
 *                 example: "sensor"
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance, decommissioned]
 *                 description: Estado del dispositivo
 *                 default: active
 *                 example: "active"
 *               firmware_version:
 *                 type: string
 *                 description: Versión del firmware
 *                 example: "v2.5.1"
 *               serial_number:
 *                 type: string
 *                 description: Número de serie del dispositivo
 *                 example: "SN-2024-001234"
 *               ip_address:
 *                 type: string
 *                 description: Dirección IP del dispositivo
 *                 example: "192.168.1.100"
 *               mac_address:
 *                 type: string
 *                 description: Dirección MAC del dispositivo
 *                 example: "00:1A:2B:3C:4D:5E"
 *               location_hint:
 *                 type: string
 *                 description: Pista de ubicación física
 *                 example: "Rack 3, Slot 5"
 *               metadata:
 *                 type: object
 *                 description: Metadatos adicionales en formato JSON
 *                 example: { "manufacturer": "Acme Corp", "model": "TH-100" }
 *               is_active:
 *                 type: boolean
 *                 description: Si el device está activo
 *                 default: true
 *     responses:
 *       201:
 *         description: Device creado exitosamente
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
 *                       example: "DEV-abc123xyz-1"
 *                     name:
 *                       type: string
 *                       example: "Sensor Temperatura Sala 1"
 *                     device_type:
 *                       type: string
 *                       example: "sensor"
 *                     status:
 *                       type: string
 *                       example: "active"
 *                     organization:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "ORG-yOM9ewfqOeWa-4"
 *                         name:
 *                           type: string
 *                           example: "EC.DATA"
 *                     site:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "SITE-abc123xyz-1"
 *                         name:
 *                           type: string
 *                           example: "Sucursal Centro"
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Organización o site no encontrado
 */
router.post('/', authenticate, requireRole(['system-admin', 'org-admin']), validate(createDeviceSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const device = await deviceServices.createDevice(req.body, userId, ipAddress, userAgent);
        
        res.status(201).json({
            ok: true,
            data: device,
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
 * /api/v1/devices:
 *   get:
 *     summary: Listar devices con paginación y filtros
 *     description: Obtiene lista de devices con filtros opcionales
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         description: Filtrar por organización (public_code)
 *         schema:
 *           type: string
 *           example: "ORG-yOM9ewfqOeWa-4"
 *       - in: query
 *         name: site_id
 *         description: Filtrar por site (public_code)
 *         schema:
 *           type: string
 *           example: "SITE-abc123xyz-1"
 *       - in: query
 *         name: device_type
 *         description: Filtrar por tipo de dispositivo
 *         schema:
 *           type: string
 *           enum: [sensor, gateway, controller, edge, virtual, other]
 *           example: "sensor"
 *       - in: query
 *         name: status
 *         description: Filtrar por estado del dispositivo
 *         schema:
 *           type: string
 *           enum: [active, inactive, maintenance, decommissioned]
 *           example: "active"
 *       - in: query
 *         name: search
 *         description: Buscar por nombre o serial_number
 *         schema:
 *           type: string
 *           example: "Sensor"
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
 *         description: Lista de devices obtenida exitosamente
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
 *                   description: Array de devices
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 33
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
router.get('/', authenticate, enforceActiveOrganization, validate(getDevicesSchema), async (req, res, next) => {
    try {
        // Usa la organización del contexto establecido por el middleware
        // Si showAll=true (God View), no filtra por organización
        const result = await deviceServices.listDevices({
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
 * /api/v1/devices/{id}:
 *   get:
 *     summary: Obtener un device por ID
 *     description: Obtiene los detalles de un device específico por su public_code
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code del device (ej DEV-abc123-1)
 *         schema:
 *           type: string
 *           example: "DEV-abc123xyz-1"
 *     responses:
 *       200:
 *         description: Device obtenido exitosamente
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
 *         description: Device no encontrado
 *       401:
 *         description: No autenticado
 */

// Rutas de device metadata (catálogos para formularios)
// IMPORTANTE: Debe estar ANTES de las rutas con :id para evitar que "metadata" sea capturado como ID
router.use('/', deviceMetadataRoutes);

router.get('/:id', authenticate, validateDeviceOwnership, validate(getDeviceByIdSchema), async (req, res, next) => {
    try {
        // El middleware validateDeviceOwnership ya validó el acceso
        const device = await deviceServices.getDeviceByPublicCode(req.params.id);
        
        res.json({
            ok: true,
            data: device,
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
 * /api/v1/devices/{id}:
 *   put:
 *     summary: Actualizar un device
 *     description: Actualiza los datos de un device existente. Solo system-admin y org-admin pueden actualizar.
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code del device
 *         schema:
 *           type: string
 *           example: "DEV-abc123xyz-1"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               site_id:
 *                 type: string
 *                 example: "SITE-abc123xyz-1"
 *               name:
 *                 type: string
 *                 example: "Sensor Temperatura Sala 1 - Actualizado"
 *               description:
 *                 type: string
 *               device_type:
 *                 type: string
 *                 enum: [sensor, gateway, controller, edge, virtual, other]
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance, decommissioned]
 *               firmware_version:
 *                 type: string
 *               serial_number:
 *                 type: string
 *               ip_address:
 *                 type: string
 *               mac_address:
 *                 type: string
 *               location_hint:
 *                 type: string
 *               metadata:
 *                 type: object
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Device actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Device no encontrado
 */
router.put('/:id', authenticate, requireRole(['system-admin', 'org-admin']), validateDeviceOwnership, validate(updateDeviceSchema), async (req, res, next) => {
    try {
        // El middleware validateDeviceOwnership ya validó el acceso
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const device = await deviceServices.updateDevice(req.params.id, req.body, userId, ipAddress, userAgent);
        
        res.json({
            ok: true,
            data: device,
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
 * /api/v1/devices/{id}:
 *   delete:
 *     summary: Eliminar un device (soft delete)
 *     description: Elimina lógicamente un device y marca sus channels como inactivos. Solo system-admin puede eliminar.
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code del device
 *         schema:
 *           type: string
 *           example: "DEV-abc123xyz-1"
 *     responses:
 *       200:
 *         description: Device eliminado exitosamente con cascade a channels
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
 *                     device:
 *                       type: object
 *                       description: Device serializado (sin deleted_at)
 *                     cascade:
 *                       type: object
 *                       properties:
 *                         channels_affected:
 *                           type: integer
 *                           example: 5
 *                         channel_updates:
 *                           type: array
 *                           items:
 *                             type: object
 *                     deletion_status:
 *                       type: object
 *                       properties:
 *                         deleted:
 *                           type: boolean
 *                           example: true
 *                         deleted_at:
 *                           type: string
 *                           format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     locale:
 *                       type: string
 *                     action:
 *                       type: string
 *                       example: "delete"
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Device no encontrado
 */
router.delete('/:id', authenticate, requireRole(['system-admin']), validateDeviceOwnership, validate(deleteDeviceSchema), async (req, res, next) => {
    try {
        // El middleware validateDeviceOwnership ya validó el acceso y existencia
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const result = await deviceServices.deleteDevice(req.params.id, userId, ipAddress, userAgent);
        
        // Respuesta canónica con envelope estándar
        res.json({
            ok: true,
            data: result, // { device, cascade, deletion_status }
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale,
                action: 'delete'
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
