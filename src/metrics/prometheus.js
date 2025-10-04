// Métricas Prometheus para monitoreo de la API
import * as promClient from 'prom-client';
import { config } from '../config/env.js';

/**
 * Registro de métricas Prometheus
 * Solo disponible en desarrollo y entornos internos
 */

// Crear registro de métricas
const register = new promClient.Registry();

// Habilitar métricas por defecto (CPU, memoria, event loop, etc.)
promClient.collectDefaultMetrics({ register });

/**
 * Métricas personalizadas para la API
 */

// Histograma de duración de requests HTTP
export const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [register],
});

// Contador de requests HTTP por endpoint y status
export const httpRequestTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

// Gauge de conexiones activas
export const activeConnections = new promClient.Gauge({
    name: 'active_connections',
    help: 'Number of active connections',
    registers: [register],
});

/**
 * Endpoint para exponer métricas Prometheus
 * Solo en desarrollo o entornos internos
 */
export const metricsHandler = async (req, res) => {
    if (config.env === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }

    try {
        res.set('Content-Type', register.contentType);
        const metrics = await register.metrics();
        res.send(metrics);
    } catch (error) {
        res.status(500).json({ error: 'Error collecting metrics' });
    }
};

export default register;
