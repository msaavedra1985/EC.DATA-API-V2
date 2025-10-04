// Endpoint de health check para monitoreo del servicio
import express from 'express';
import { successResponse } from '../../utils/response.js';

const router = express.Router();

/**
 * GET /api/v1/health
 * Endpoint básico de health check que verifica que el servicio esté funcionando
 * @returns {Object} { ok: true, data: { status: 'healthy', ... }, meta: { timestamp } }
 */
router.get('/', (req, res) => {
    const healthData = {
        status: 'healthy',
        service: 'API EC ESM',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    };

    return successResponse(res, healthData);
});

export default router;
