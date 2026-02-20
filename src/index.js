// Punto de entrada principal - Inicialización del servidor HTTP
import createApp from './app.js';
import { config, validateConfig } from './config/env.js';
import { initializeDatabase, closeDatabase } from './db/sql/sequelize.js';
import { initializeRedis, closeRedis } from './db/redis/client.js';
import { initCassandra, closeCassandra, hasCredentials } from './db/cassandra/client.js';
import { startTokenCleanupScheduler } from './utils/cleanupTokens.js';
import { warmUpTelemetryCache } from './modules/telemetry/index.js';
import { initializeMqtt, closeMqtt, initializeWebSocket, closeWebSocket } from './modules/realtime/index.js';
import logger from './utils/logger.js';

// Importar todos los modelos en orden de dependencias (necesario para Sequelize.sync())
import './db/models.js';

// Variable global para el cleanup scheduler
let stopTokenCleanup = null;

/**
 * Inicializa todos los servicios (DB, Redis, etc.)
 */
const initializeServices = async () => {
    try {
        // Validar configuración
        validateConfig();

        // Inicializar PostgreSQL
        await initializeDatabase();

        // Inicializar Redis (opcional en desarrollo)
        await initializeRedis();

        // Inicializar Cassandra (opcional - solo si hay credenciales)
        if (hasCredentials()) {
            await initCassandra();
        } else {
            logger.info('⏸️  Cassandra: Credenciales no configuradas, saltando inicialización');
        }

        // Warm-up de cache de telemetría (variables globales, measurement types)
        try {
            await warmUpTelemetryCache();
            logger.info('✅ Telemetry cache warmed up successfully');
        } catch (cacheError) {
            logger.warn({ err: cacheError }, '⚠️  Telemetry cache warm-up failed (non-critical)');
        }

        logger.info('✅ All services initialized successfully');
    } catch (error) {
        logger.error(error, '❌ Service initialization failed');
        process.exit(1);
    }
};

/**
 * Inicia el servidor HTTP
 */
const startServer = async () => {
    try {
        // Inicializar servicios externos
        await initializeServices();

        // Iniciar scheduler de limpieza de tokens (cada 6 horas)
        stopTokenCleanup = startTokenCleanupScheduler(6);

        // Crear aplicación Express (incluye Swagger y métricas)
        const app = createApp();

        // Iniciar servidor HTTP en 0.0.0.0:5000
        const server = app.listen(config.port, '0.0.0.0', () => {
            logger.info(`
╔════════════════════════════════════════════════════════════╗
║  🚀 EC.DATA API - Enterprise REST API Server              ║
║                                                            ║
║  Environment:  ${config.env.padEnd(43)} ║
║  Port:         ${config.port.toString().padEnd(43)} ║
║  URL:          ${config.apiUrl.padEnd(43)} ║
║                                                            ║
║  Health:       ${`${config.apiUrl}/api/v1/health`.padEnd(43)} ║
║  Docs:         ${config.env === 'development' ? `${config.apiUrl}/docs`.padEnd(43) : 'N/A (production)'.padEnd(43)} ║
║  Metrics:      ${config.env === 'development' ? `${config.apiUrl}/metrics`.padEnd(43) : 'N/A (production)'.padEnd(43)} ║
║  WebSocket:    ${`${config.apiUrl.replace('http', 'ws')}/ws`.padEnd(43)} ║
║                                                            ║
║  Status:       ✅ Server running successfully             ║
╚════════════════════════════════════════════════════════════╝
            `);
        });

        // Inicializar WebSocket server sobre el mismo HTTP server
        initializeWebSocket(server);

        // Inicializar conexiones MQTT a brokers IoT (no-bloqueante)
        try {
            initializeMqtt();
        } catch (mqttError) {
            logger.warn({ err: mqttError }, '⚠️  MQTT initialization failed (non-critical)');
        }

        // Manejo de señales para graceful shutdown
        const gracefulShutdown = async signal => {
            logger.info(`${signal} received. Starting graceful shutdown...`);
            
            server.close(async () => {
                logger.info('✅ HTTP server closed');
                
                // Detener scheduler de limpieza de tokens
                if (stopTokenCleanup) {
                    stopTokenCleanup();
                }
                
                // Cerrar conexiones a servicios externos
                closeWebSocket();
                await closeMqtt();
                await closeDatabase();
                await closeRedis();
                await closeCassandra();
                
                logger.info('✅ Graceful shutdown completed');
                process.exit(0);
            });

            // Forzar cierre después de 10 segundos si no se completa
            setTimeout(() => {
                logger.error('❌ Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        return server;
    } catch (error) {
        logger.error(error, '❌ Server startup failed');
        process.exit(1);
    }
};

// Iniciar servidor
startServer();
