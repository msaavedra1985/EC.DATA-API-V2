// Configuración de la aplicación Express con middlewares y rutas
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { setupSwagger } from './docs/openapi.js';
import { metricsHandler } from './metrics/prometheus.js';
import routes from './routes/index.js';

/**
 * Crea y configura la aplicación Express
 * @returns {Express} Aplicación Express configurada
 */
const createApp = () => {
    const app = express();

    // ========================================
    // MIDDLEWARES DE SEGURIDAD
    // ========================================

    // Helmet: protección de headers HTTP
    app.use(helmet());

    // CORS: por ahora configuración básica (será dinámico desde BD + Redis)
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

    // Centralizar todas las rutas desde routes/index.js
    app.use('/api/v1', routes);

    // ========================================
    // DOCUMENTACIÓN Y MÉTRICAS (solo desarrollo)
    // ========================================

    // Setup Swagger docs
    setupSwagger(app);

    // Endpoint de métricas Prometheus
    if (config.env === 'development') {
        app.get('/metrics', metricsHandler);
    }

    // ========================================
    // MANEJO DE ERRORES
    // ========================================

    // Middleware 404 para rutas no encontradas (debe ir antes del errorHandler)
    app.use(notFoundHandler);

    // Middleware global de manejo de errores
    app.use(errorHandler);

    return app;
};

export default createApp;
