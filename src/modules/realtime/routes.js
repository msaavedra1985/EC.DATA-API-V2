// Rutas REST del módulo realtime
// POST /realtime/token - Generar token efímero para conexión WebSocket
import { Router } from 'express';
import { generateEphemeralToken } from './services/tokenService.js';
import { getUserConnectionCount } from './services/sessionService.js';
import { getMqttStatus } from './mqtt/client.js';
import { getWsStatus } from './wsServer.js';
import { authenticate } from '../../middleware/auth.js';
import { incrWithTTL } from '../../db/redis/client.js';
import { config } from '../../config/env.js';
import logger from '../../utils/logger.js';

const router = Router();

/**
 * @swagger
 * /api/v1/realtime/token:
 *   post:
 *     summary: Generar token efímero para conexión WebSocket
 *     description: |
 *       Genera un token efímero de un solo uso (TTL 5 min) que el BFF usa para
 *       establecer la conexión WebSocket con el backend. El token incluye datos
 *       del usuario y permisos para validación sin consultar DB.
 *     tags: [Realtime]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               services:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [DASHBOARD, NOTIFY, IOT, CHATBOT]
 *                 description: Servicios solicitados (opcional, todos si no se envía)
 *     responses:
 *       200:
 *         description: Token efímero generado
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
 *                     token:
 *                       type: string
 *                       example: "eph_abc123..."
 *                     wsUrl:
 *                       type: string
 *                       example: "wss://ws.ecdata-backend.com/ws"
 *                     expiresIn:
 *                       type: integer
 *                       example: 300
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     allowedServices:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Token JWT inválido o expirado
 *       429:
 *         description: Rate limit excedido
 */
router.post('/token', authenticate, async (req, res) => {
    try {
        const { userId, role, email } = req.user;
        const organizationId = req.organizationContext?.activeOrgId || null;

        // Rate limit: máximo 10 tokens por minuto por usuario
        const rateLimitKey = `ws:token_rate:${userId}`;
        const currentCount = await incrWithTTL(rateLimitKey, 60);
        if (currentCount > 10) {
            logger.warn({ userId }, 'Rate limit de tokens efímeros excedido');
            return res.status(429).json({
                ok: false,
                error: {
                    code: 'RATE_LIMITED',
                    message: 'Too many token requests. Try again in 30 seconds',
                    retryAfter: 30,
                },
            });
        }

        // Verificar límite de conexiones activas
        const activeConnections = await getUserConnectionCount(userId);
        if (activeConnections >= config.realtime.maxConnectionsPerUser) {
            return res.status(429).json({
                ok: false,
                error: {
                    code: 'CONNECTION_LIMIT',
                    message: `Maximum ${config.realtime.maxConnectionsPerUser} simultaneous connections reached`,
                },
            });
        }

        // Determinar servicios permitidos según rol
        const allServices = ['SYSTEM', 'DASHBOARD', 'NOTIFY', 'IOT', 'CHATBOT'];
        if (config.env === 'development') {
            allServices.push('DEV');
        }
        const requestedServices = req.body?.services || [];

        let allowedServices = ['SYSTEM'];
        if (role === 'system-admin') {
            allowedServices = [...allServices];
        } else {
            allowedServices.push('DASHBOARD', 'NOTIFY');
            if (requestedServices.includes('IOT')) {
                allowedServices.push('IOT');
            }
            if (config.env === 'development' && ['admin', 'superadmin', 'system-admin'].includes(role) && requestedServices.includes('DEV')) {
                allowedServices.push('DEV');
            }
        }

        if (requestedServices.length > 0) {
            allowedServices = allowedServices.filter(s =>
                s === 'SYSTEM' || requestedServices.includes(s)
            );
        }

        const tokenResult = await generateEphemeralToken({
            userId,
            organizationId,
            role,
            allowedServices,
            email,
        });

        res.json({
            ok: true,
            data: {
                ...tokenResult,
                allowedServices,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Error generando token efímero');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error generating realtime token',
            },
        });
    }
});

/**
 * @swagger
 * /api/v1/realtime/status:
 *   get:
 *     summary: Estado del sistema realtime (MQTT + WebSocket)
 *     tags: [Realtime]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado actual del sistema realtime
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'system-admin') {
            return res.status(403).json({
                ok: false,
                error: { code: 'FORBIDDEN', message: 'Only system-admin can view realtime status' },
            });
        }

        const mqttStatus = getMqttStatus();
        const wsStatus = getWsStatus();

        res.json({
            ok: true,
            data: {
                mqtt: mqttStatus,
                websocket: wsStatus,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Error obteniendo estado realtime');
        res.status(500).json({
            ok: false,
            error: { code: 'INTERNAL_ERROR', message: 'Error getting realtime status' },
        });
    }
});

export default router;
