// Servidor Express principal con ESM y arquitectura preparada para escalabilidad
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config, validateConfig } from './config/env.js';
import { errorHandler, notFoundHandler } from './common/middleware/errorHandler.js';
import healthRouter from './modules/health/router.js';

// Validar configuración al inicio
validateConfig();

// Crear aplicación Express
const app = express();

// ========================================
// MIDDLEWARES DE SEGURIDAD
// ========================================

// Helmet: protección de headers HTTP
app.use(helmet());

// CORS: por ahora configuración básica (Fase 2 será dinámico desde BD)
const corsOptions = {
    origin: config.env === 'development' ? '*' : config.allowedOriginsFallback.split(','),
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ========================================
// MIDDLEWARES DE PARSING Y COMPRESIÓN
// ========================================

// Body parser para JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compresión de respuestas (brotli/gzip)
app.use(compression());

// ========================================
// RUTAS DE LA API
// ========================================

// Health check endpoint
app.use('/api/v1/health', healthRouter);

// ========================================
// MANEJO DE ERRORES
// ========================================

// Middleware 404 para rutas no encontradas (debe ir antes del errorHandler)
app.use(notFoundHandler);

// Middleware global de manejo de errores
app.use(errorHandler);

// ========================================
// INICIALIZACIÓN DEL SERVIDOR
// ========================================

/**
 * Inicia el servidor HTTP en el puerto configurado
 * Preparado para inyectar Socket.io en el futuro
 */
const startServer = () => {
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
║                                                            ║
║  Status:       ✅ Server running successfully             ║
╚════════════════════════════════════════════════════════════╝
    `);
    });

    // Manejo de señales para graceful shutdown
    const gracefulShutdown = signal => {
        console.log(`\n${signal} received. Starting graceful shutdown...`);
        server.close(() => {
            console.log('✅ HTTP server closed');
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
};

// Iniciar servidor
startServer();

// Exportar app para testing
export default app;
