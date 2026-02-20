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
        
        // Refresh token extendido con "remember me" (90 días)
        refreshExpiresInLong: process.env.JWT_REFRESH_EXPIRES_IN_LONG || '90d',
        
        // Idle timeout (revocación por inactividad - 7 días)
        refreshIdleDays: parseInt(process.env.JWT_REFRESH_IDLE_DAYS || '7', 10),
        
        // Idle timeout extendido con "remember me" (30 días)
        refreshIdleDaysLong: parseInt(process.env.JWT_REFRESH_IDLE_DAYS_LONG || '30', 10),
        
        // Claims estándar JWT
        issuer: process.env.JWT_ISSUER || 'https://api.ec.com',
        audience: process.env.JWT_AUDIENCE || 'ec-frontend',
    },

    // Rate limiting con Redis
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minuto
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        // Modo observación: solo logea sin bloquear (false = activo, bloquea requests)
        observeOnly: process.env.RATE_LIMIT_OBSERVE_MODE !== 'false' && process.env.RATE_LIMIT_OBSERVE_MODE !== '0', // Default: true (solo false/0 desactiva)
    },

    // CORS dinámico (cache TTL en Redis)
    corsCache: {
        ttl: parseInt(process.env.CORS_CACHE_TTL || '600', 10), // 10 minutos
    },

    // Azure Blob Storage para archivos (logos, imágenes, documentos)
    azure: {
        // Connection string contiene account name, key y endpoint
        connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || null,
        // Contenedor público (acceso anónimo directo para logos, favicons, etc.)
        containerPublic: process.env.AZURE_STORAGE_CONTAINER_PUBLIC || 'public',
        // Contenedor privado (requiere SAS URL para documentos sensibles)
        containerPrivate: process.env.AZURE_STORAGE_CONTAINER_PRIVATE || 'private',
        // Tiempo de expiración del SAS URL en minutos
        sasExpiryMinutes: parseInt(process.env.AZURE_STORAGE_SAS_EXPIRY || '15', 10),
    },

    // Cloudflare Turnstile (Captcha)
    // Si está configurado Y habilitado, se valida el captcha en el login
    turnstile: {
        secretKey: process.env.TURNSTILE_SECRET_KEY || null,
        verifyUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        // Permite deshabilitar captcha en desarrollo (TURNSTILE_ENABLED=false)
        enabled: process.env.TURNSTILE_ENABLED !== 'false',
    },

    // MQTT Brokers para datos IoT en tiempo real
    // 3 brokers activos funcionando como load balancer (suscripción a los 3)
    mqtt: {
        brokers: [
            {
                url: process.env.MQTT_BROKER_1_URL || null,
                username: process.env.MQTT_BROKER_1_USER || null,
                password: process.env.MQTT_BROKER_1_PASS || null,
            },
            {
                url: process.env.MQTT_BROKER_2_URL || null,
                username: process.env.MQTT_BROKER_2_USER || null,
                password: process.env.MQTT_BROKER_2_PASS || null,
            },
            {
                url: process.env.MQTT_BROKER_3_URL || null,
                username: process.env.MQTT_BROKER_3_USER || null,
                password: process.env.MQTT_BROKER_3_PASS || null,
            },
        ],
        topicPrefix: process.env.MQTT_TOPIC_PREFIX || 'Solution',
    },

    // WebSocket / Realtime
    realtime: {
        // URL del WS server que el BFF usará para conectarse (vista interna)
        wsUrl: process.env.WS_URL || 'wss://ws.ecdata-backend.com/ws',
        // TTL del token efímero en segundos (5 minutos)
        ephemeralTokenTTL: parseInt(process.env.WS_EPHEMERAL_TOKEN_TTL || '300', 10),
        // Heartbeat interval en ms (30 segundos)
        heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000', 10),
        // Timeout para considerar conexión muerta (90 segundos sin heartbeat)
        heartbeatTimeout: parseInt(process.env.WS_HEARTBEAT_TIMEOUT || '90000', 10),
        // Máximo de conexiones simultáneas por usuario
        maxConnectionsPerUser: parseInt(process.env.WS_MAX_CONNECTIONS_PER_USER || '3', 10),
        // Máximo de suscripciones activas por conexión
        maxSubscriptionsPerConnection: parseInt(process.env.WS_MAX_SUBSCRIPTIONS || '10', 10),
        // Rate limit: máximo de mensajes entrantes por conexión por minuto
        maxMessagesPerMinute: parseInt(process.env.WS_MAX_MESSAGES_PER_MINUTE || '60', 10),
        // Tamaño máximo de mensaje WS en bytes (64KB)
        maxPayloadSize: parseInt(process.env.WS_MAX_PAYLOAD_SIZE || '65536', 10),
        // Idle timeout para suscripciones MQTT sin datos (en ms, default 5 minutos)
        subscriptionIdleTimeout: parseInt(process.env.WS_SUBSCRIPTION_IDLE_TIMEOUT || '300000', 10),
        // Intervalo del sweep de suscripciones idle (en ms, default 60 segundos)
        subscriptionIdleSweepInterval: parseInt(process.env.WS_SUBSCRIPTION_IDLE_SWEEP_INTERVAL || '60000', 10),
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
