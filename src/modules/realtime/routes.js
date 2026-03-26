// Rutas REST del módulo realtime
// POST /realtime/token - Generar token efímero para conexión WebSocket
import { Router } from 'express';
import { generateEphemeralToken } from './services/tokenService.js';
import { getUserConnectionCount } from './services/sessionService.js';
import { getMqttStatus } from './mqtt/client.js';
import { getWsStatus } from './wsServer.js';
import { authenticate } from '../../middleware/auth.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import { incrWithTTL } from '../../db/redis/client.js';
import { config } from '../../config/env.js';
import logger from '../../utils/logger.js';

const router = Router();


// 📄 Swagger: src/docs/swagger/realtime.yaml -> POST /token
router.post('/token', authenticate, enforceActiveOrganization, async (req, res) => {
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

        // system-admin no pasa por el filtro — ya tiene exactamente lo que su rol garantiza
        if (requestedServices.length > 0 && role !== 'system-admin') {
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


// 📄 Swagger: src/docs/swagger/realtime.yaml -> GET /status
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
