// Configuración centralizada de variables de entorno
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env
dotenv.config();

/**
 * Configuración de la aplicación desde variables de entorno
 * Valores por defecto para desarrollo local
 */
export const config = {
    // Configuración del servidor
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),

    // URLs y CORS
    apiUrl: process.env.API_URL || 'http://localhost:5000',
    frontendUrl: process.env.DEV_FRONT_URL || 'http://localhost:3000',
    allowedOriginsFallback: process.env.ALLOWED_ORIGINS_FALLBACK || '',

    // Base de datos PostgreSQL (Sequelize)
    database: {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        name: process.env.PGDATABASE || 'api_ec',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        url: process.env.DATABASE_URL || null,
    },

    // Redis para cache
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || null,
        url: process.env.REDIS_URL || null,
    },

    // JWT - Secrets separados para access y refresh tokens
    jwt: {
        // Access token (corta duración - 15 minutos)
        accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production',
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        
        // Refresh token (larga duración - 14 días)
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '14d',
        
        // Idle timeout (revocación por inactividad - 7 días)
        refreshIdleDays: parseInt(process.env.JWT_REFRESH_IDLE_DAYS || '7', 10),
    },

    // Rate limiting (observational mode)
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minuto
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },

    // CORS dinámico (cache TTL en Redis)
    corsCache: {
        ttl: parseInt(process.env.CORS_CACHE_TTL || '600', 10), // 10 minutos
    },
};

/**
 * Valida que las variables de entorno críticas estén configuradas
 * Útil para entornos de producción
 */
export const validateConfig = () => {
    const required = [];

    // En producción, validar secretos críticos
    if (config.env === 'production') {
        if (config.jwt.accessSecret === 'dev-access-secret-change-in-production') {
            required.push('JWT_ACCESS_SECRET');
        }
        if (config.jwt.refreshSecret === 'dev-refresh-secret-change-in-production') {
            required.push('JWT_REFRESH_SECRET');
        }
    }

    if (required.length > 0) {
        throw new Error(`Missing required environment variables: ${required.join(', ')}`);
    }
};
