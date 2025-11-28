// modules/channels/routes.js
// Rutas REST para el módulo de Channels (Canales de Comunicación de Dispositivos)

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import * as channelServices from './services.js';
import {
    createChannelSchema,
    updateChannelSchema,
    getChannelsSchema,
    getChannelByIdSchema,
    deleteChannelSchema
} from './dtos/index.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const channelLogger = logger.child({ component: 'channels' });

/**
 * @swagger
 * /api/v1/channels:
 *   post:
 *     summary: Crear un nuevo channel (canal de comunicación de dispositivo)
 *     description: Crea un canal de comunicación perteneciente a un dispositivo. El organization_id se obtiene automáticamente del dispositivo. Solo system-admin y org-admin pueden crear channels.
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
 *               - channel_type
 *               - protocol
 *             properties:
 *               device_id:
 *                 type: string
 *                 description: Public code del dispositivo (ej DEV-abc123-1)
 *                 example: "DEV-abc123xyz-1"
 *               name:
 *                 type: string
 *                 description: Nombre del canal (único por dispositivo)
 *                 example: "MQTT Sensor Data Channel"
 *               description:
 *                 type: string
 *                 description: Descripción del canal
 *                 example: "Canal MQTT para recibir datos de sensores"
 *               channel_type:
 *                 type: string
 *                 enum: [mqtt, http, websocket, coap, modbus, opcua, bacnet, lorawan, sigfox, other]
 *                 description: Tipo de canal
 *                 example: "mqtt"
 *               protocol:
 *                 type: string
 *                 enum: [mqtt, http, https, ws, wss, coap, coaps, modbus_tcp, modbus_rtu, opcua, bacnet_ip, lorawan, sigfox, tcp, udp, other]
 *                 description: Protocolo de comunicación
 *                 example: "mqtt"
 *               direction:
 *                 type: string
 *                 enum: [inbound, outbound, bidirectional]
 *                 description: Dirección de comunicación
 *                 default: bidirectional
 *                 example: "inbound"
 *               status:
 *                 type: string
 *                 enum: [active, inactive, error, disabled]
 *                 description: Estado del canal
 *                 default: active
 *                 example: "active"
 *               endpoint_url:
 *                 type: string
 *                 description: URL del endpoint de comunicación
 *                 example: "mqtt://broker.example.com:1883"
 *               config:
 *                 type: object
 *                 description: Configuración del canal en formato JSON
 *                 example: { "topic": "sensors/temperature", "qos": 1 }
 *               credentials_ref:
 *                 type: string
 *                 description: Referencia a credenciales almacenadas
 *                 example: "mqtt_credentials_123"
 *               priority:
 *                 type: number
 *                 description: Prioridad del canal (1-10)
 *                 minimum: 1
 *                 maximum: 10
 *                 default: 5
 *                 example: 7
 *               metadata:
 *                 type: object
 *                 description: Metadatos adicionales en formato JSON
 *                 example: { "retry_count": 3, "timeout_ms": 5000 }
 *               is_active:
 *                 type: boolean
 *                 description: Si el canal está activo
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
 *                       example: "MQTT Sensor Data Channel"
 *                     channel_type:
 *                       type: string
 *                       example: "mqtt"
 *                     protocol:
 *                       type: string
 *                       example: "mqtt"
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
 *                           example: "Sensor Temperatura Sala 1"
 *                     organization:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "ORG-yOM9ewfqOeWa-4"
 *                         name:
 *                           type: string
 *                           example: "EC.DATA"
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
 *     description: Obtiene una lista paginada de channels con filtros opcionales. Incluye información del dispositivo y organización.
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: device_id
 *         schema:
 *           type: string
 *         description: Filtrar por public_code del dispositivo
 *         example: "DEV-abc123xyz-1"
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *         description: Filtrar por public_code de la organización
 *         example: "ORG-yOM9ewfqOeWa-4"
 *       - in: query
 *         name: channel_type
 *         schema:
 *           type: string
 *           enum: [mqtt, http, websocket, coap, modbus, opcua, bacnet, lorawan, sigfox, other]
 *         description: Filtrar por tipo de canal
 *         example: "mqtt"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, error, disabled]
 *         description: Filtrar por estado
 *         example: "active"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en nombre o endpoint_url
 *         example: "mqtt"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Número de resultados por página
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Número de resultados a saltar
 *     responses:
 *       200:
 *         description: Lista de channels obtenida exitosamente
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
 *                     channels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "CHN-abc123xyz-1"
 *                           name:
 *                             type: string
 *                             example: "MQTT Sensor Data Channel"
 *                           channel_type:
 *                             type: string
 *                             example: "mqtt"
 *                           status:
 *                             type: string
 *                             example: "active"
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *       400:
 *         description: Parámetros inválidos
 */
router.get('/', authenticate, enforceActiveOrganization, validate(getChannelsSchema), async (req, res, next) => {
    try {
        // El middleware enforceActiveOrganization ya configuró req.query.organization_id
        // con el UUID correcto (de la org activa o la especificada)
        const { device_id, organization_id, channel_type, status, search, limit, offset } = req.query;
        
        const result = await channelServices.listChannels({
            device_id,
            organization_id,
            channel_type,
            status,
            search,
            limit,
            offset
        });
        
        res.status(200).json({
            ok: true,
            data: result,
            meta: {
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
 *     description: Obtiene los detalles de un channel específico usando su public_code. Incluye información del dispositivo y organización.
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
 *                       example: "MQTT Sensor Data Channel"
 *                     channel_type:
 *                       type: string
 *                       example: "mqtt"
 *                     protocol:
 *                       type: string
 *                       example: "mqtt"
 *                     status:
 *                       type: string
 *                       example: "active"
 *                     endpoint_url:
 *                       type: string
 *                       example: "mqtt://broker.example.com:1883"
 *                     device:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "DEV-abc123xyz-1"
 *                         name:
 *                           type: string
 *                           example: "Sensor Temperatura Sala 1"
 *                     organization:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "ORG-yOM9ewfqOeWa-4"
 *                         name:
 *                           type: string
 *                           example: "EC.DATA"
 *       404:
 *         description: Channel no encontrado
 */
router.get('/:id', authenticate, validate(getChannelByIdSchema), async (req, res, next) => {
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
 *     description: Actualiza los datos de un channel existente. Solo system-admin y org-admin pueden actualizar channels.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre del canal
 *                 example: "MQTT Sensor Data Channel Updated"
 *               description:
 *                 type: string
 *                 description: Descripción del canal
 *                 example: "Canal MQTT actualizado"
 *               channel_type:
 *                 type: string
 *                 enum: [mqtt, http, websocket, coap, modbus, opcua, bacnet, lorawan, sigfox, other]
 *                 description: Tipo de canal
 *               protocol:
 *                 type: string
 *                 enum: [mqtt, http, https, ws, wss, coap, coaps, modbus_tcp, modbus_rtu, opcua, bacnet_ip, lorawan, sigfox, tcp, udp, other]
 *                 description: Protocolo de comunicación
 *               direction:
 *                 type: string
 *                 enum: [inbound, outbound, bidirectional]
 *                 description: Dirección de comunicación
 *               status:
 *                 type: string
 *                 enum: [active, inactive, error, disabled]
 *                 description: Estado del canal
 *               endpoint_url:
 *                 type: string
 *                 description: URL del endpoint
 *                 example: "mqtt://broker.example.com:1883"
 *               config:
 *                 type: object
 *                 description: Configuración del canal
 *               credentials_ref:
 *                 type: string
 *                 description: Referencia a credenciales
 *               priority:
 *                 type: number
 *                 description: Prioridad del canal (1-10)
 *                 minimum: 1
 *                 maximum: 10
 *               metadata:
 *                 type: object
 *                 description: Metadatos adicionales
 *               is_active:
 *                 type: boolean
 *                 description: Si el canal está activo
 *     responses:
 *       200:
 *         description: Channel actualizado exitosamente
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
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Channel no encontrado
 */
router.put('/:id', authenticate, requireRole(['system-admin', 'org-admin']), validate(updateChannelSchema), async (req, res, next) => {
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
 *         example: "CHN-abc123xyz-1"
 *     responses:
 *       200:
 *         description: Channel eliminado exitosamente
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
 *                       example: "Channel eliminado exitosamente"
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Channel no encontrado
 */
router.delete('/:id', authenticate, requireRole(['system-admin']), validate(deleteChannelSchema), async (req, res, next) => {
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
