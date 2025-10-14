// utils/winston/logger.js
// Winston logger configurado para error logging con SQL + archivos

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import SqlTransport from './SqlTransport.js';
import { config } from '../../config/env.js';

/**
 * Formato personalizado para logs estructurados
 * Incluye timestamp, nivel, mensaje y metadata
 */
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

/**
 * Transport 1: PostgreSQL (principal)
 * Escribe todos los errores a la tabla error_logs
 */
const sqlTransport = new SqlTransport({
    level: 'warn', // Capturar warn, error y critical
    handleExceptions: false,
    handleRejections: false
});

/**
 * Transport 2: Archivos rotados diariamente
 * Backup/debugging - archivos se rotan cada día y se mantienen 30 días
 */
const fileTransport = new DailyRotateFile({
    level: 'warn',
    filename: 'logs/errors-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m', // Rotar si el archivo supera 20MB
    maxFiles: '30d', // Mantener logs por 30 días
    format: customFormat,
    handleExceptions: false,
    handleRejections: false
});

/**
 * Transport 3 (opcional): Consola en desarrollo
 * Solo para debugging local, deshabilitado en producción
 */
const consoleTransport = new winston.transports.Console({
    level: config.env === 'development' ? 'debug' : 'error',
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
    ),
    handleExceptions: false,
    handleRejections: false
});

/**
 * Winston Logger configurado
 * 
 * Niveles disponibles (en orden):
 * - critical: Errores críticos del sistema
 * - error: Errores estándar
 * - warn: Advertencias
 * - info: Información (no se registra en error_logs)
 * - debug: Debug (no se registra en error_logs)
 * 
 * Uso:
 * ```
 * import winstonLogger from './utils/winston/logger.js';
 * 
 * winstonLogger.error({
 *   error_code: 'DATABASE_ERROR',
 *   error_message: 'Failed to connect to database',
 *   stack_trace: error.stack,
 *   context: { database: 'main' }
 * });
 * ```
 */
const winstonLogger = winston.createLogger({
    levels: {
        critical: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4
    },
    format: customFormat,
    transports: [
        sqlTransport,
        fileTransport
    ],
    exitOnError: false
});

// Agregar consola solo en desarrollo
if (config.env === 'development') {
    winstonLogger.add(consoleTransport);
}

/**
 * Helper: Agregar colores a los niveles personalizados
 */
winston.addColors({
    critical: 'red bold',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
});

/**
 * Método helper para loguear errores con estructura estándar
 * 
 * @param {object} params - Parámetros del error
 * @param {string} params.source - Origen ('frontend' | 'backend')
 * @param {string} params.level - Nivel ('error' | 'warning' | 'critical')
 * @param {string} params.errorCode - Código del error
 * @param {string} params.errorMessage - Mensaje del error
 * @param {string} [params.stackTrace] - Stack trace
 * @param {string} [params.endpoint] - Endpoint de la API
 * @param {string} [params.method] - Método HTTP
 * @param {number} [params.statusCode] - Status code HTTP
 * @param {string} [params.userId] - ID del usuario
 * @param {string} [params.organizationId] - ID de la organización
 * @param {string} [params.sessionId] - ID de sesión
 * @param {string} [params.ipAddress] - IP del cliente
 * @param {string} [params.userAgent] - User agent
 * @param {string} [params.requestId] - Request ID
 * @param {string} [params.correlationId] - Correlation ID (para vincular con audit_logs)
 * @param {object} [params.context] - Contexto adicional
 * @param {object} [params.metadata] - Metadata adicional
 */
winstonLogger.logError = ({
    source = 'backend',
    level = 'error',
    errorCode,
    errorMessage,
    stackTrace = null,
    endpoint = null,
    method = null,
    statusCode = null,
    userId = null,
    organizationId = null,
    sessionId = null,
    ipAddress = null,
    userAgent = null,
    requestId = null,
    correlationId = null,
    context = {},
    metadata = {}
}) => {
    // Mapear level a método de Winston
    const winstonLevel = level === 'critical' ? 'critical' : (level === 'warning' ? 'warn' : 'error');
    
    winstonLogger[winstonLevel]({
        source,
        error_code: errorCode,
        error_message: errorMessage,
        stack_trace: stackTrace,
        endpoint,
        method,
        status_code: statusCode,
        user_id: userId,
        organization_id: organizationId,
        session_id: sessionId,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId,
        correlation_id: correlationId,
        context,
        metadata
    });
};

export default winstonLogger;
