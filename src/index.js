// Punto de entrada principal - Inicialización del servidor HTTP
import createApp from './app.js';
import { config, validateConfig } from './config/env.js';
import { initializeDatabase, closeDatabase } from './db/sql/sequelize.js';
import { initializeRedis, closeRedis } from './db/redis/client.js';
import { setupSwagger } from './docs/openapi.js';
import { metricsHandler } from './metrics/prometheus.js';
import { startTokenCleanupScheduler } from './utils/cleanupTokens.js';

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

        console.log('✅ All services initialized successfully');
    } catch (error) {
        console.error('❌ Service initialization failed:', error);
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

        // Crear aplicación Express
        const app = createApp();

        // Setup Swagger docs (solo en desarrollo)
        setupSwagger(app);

        // Endpoint de métricas Prometheus (solo en desarrollo)
        if (config.env === 'development') {
            app.get('/metrics', metricsHandler);
        }

        // Iniciar servidor HTTP en 0.0.0.0:5000 (preparado para Socket.io)
        const server = app.listen(config.port, '0.0.0.0', () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 API EC ESM - Enterprise API Server                    ║
║                                                            ║
║  Environment:  ${config.env.padEnd(43)} ║
║  Port:         ${config.port.toString().padEnd(43)} ║
║  URL:          ${config.apiUrl.padEnd(43)} ║
║                                                            ║
║  Health:       ${`${config.apiUrl}/api/v1/health`.padEnd(43)} ║
║  Docs:         ${config.env === 'development' ? `${config.apiUrl}/docs`.padEnd(43) : 'N/A (production)'.padEnd(43)} ║
║  Metrics:      ${config.env === 'development' ? `${config.apiUrl}/metrics`.padEnd(43) : 'N/A (production)'.padEnd(43)} ║
║                                                            ║
║  Status:       ✅ Server running successfully             ║
╚════════════════════════════════════════════════════════════╝
            `);
        });

        // Manejo de señales para graceful shutdown
        const gracefulShutdown = async signal => {
            console.log(`\n${signal} received. Starting graceful shutdown...`);
            
            server.close(async () => {
                console.log('✅ HTTP server closed');
                
                // Detener scheduler de limpieza de tokens
                if (stopTokenCleanup) {
                    stopTokenCleanup();
                }
                
                // Cerrar conexiones a servicios externos
                await closeDatabase();
                await closeRedis();
                
                console.log('✅ Graceful shutdown completed');
                process.exit(0);
            });

            // Forzar cierre después de 10 segundos si no se completa
            setTimeout(() => {
                console.error('❌ Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        return server;
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
};

// Iniciar servidor
startServer();
