// Endpoint de health check para monitoreo del servicio
import express from 'express';
import { successResponse } from '../../utils/response.js';
import { getRedisStatus } from '../../db/redis/client.js';

const router = express.Router();

/**
 * GET /api/v1/health
 * Health check que reporta estado del servicio y sus dependencias
 * @returns {Object} { ok: true, data: { status, services, ... }, meta: { timestamp } }
 */
router.get('/', (req, res) => {
    const redis = getRedisStatus();

    const overallStatus = redis.connected ? 'healthy' : 'degraded';

    const healthData = {
        status: overallStatus,
        service: 'EC.DATA API',
        version: '1.0.0',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        services: {
            redis: {
                status: redis.connected ? 'connected' : 'fallback',
                mode: redis.mode,
                reconnecting: redis.reconnecting,
                ...(redis.inMemoryKeys !== null && { inMemoryKeys: redis.inMemoryKeys }),
            },
        },
    };

    return successResponse(res, healthData);
});

export default router;
