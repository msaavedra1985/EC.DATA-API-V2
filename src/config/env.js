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
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
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
    if (config.jwt.secret === 'dev-secret-change-in-production') {
      required.push('JWT_SECRET');
    }
  }
  
  if (required.length > 0) {
    throw new Error(`Missing required environment variables: ${required.join(', ')}`);
  }
};
