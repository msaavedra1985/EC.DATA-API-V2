import winstonLogger from '../utils/winston/logger.js';
import logger from '../utils/logger.js';

const pinoLogger = logger.child({ module: 'error-log' });

/**
 * Helper centralizado para registrar errores usando Winston
 * 
 * Winston maneja automáticamente la persistencia a:
 * - PostgreSQL (tabla error_logs) vía SqlTransport
 * - Archivos rotados diariamente (logs/errors-YYYY-MM-DD.log)
 * 
 * @param {object} params - Parámetros del error
 * @param {string} params.source - Origen del error ('frontend' | 'backend')
 * @param {string} params.level - Nivel de severidad ('error' | 'warning' | 'critical')
 * @param {string} params.errorCode - Código del error
 * @param {string} params.errorMessage - Mensaje del error
 * @param {string} [params.stackTrace] - Stack trace del error
 * @param {string} [params.endpoint] - Endpoint de la API
 * @param {string} [params.method] - Método HTTP
 * @param {number} [params.statusCode] - Código de estado HTTP
 * @param {string} [params.userId] - ID del usuario
 * @param {string} [params.organizationId] - ID de la organización
 * @param {string} [params.sessionId] - ID de sesión
 * @param {string} [params.ipAddress] - IP del cliente
 * @param {string} [params.userAgent] - User agent del cliente
 * @param {string} [params.requestId] - ID de request
 * @param {string} [params.correlationId] - ID de correlación con audit_logs (opcional)
 * @param {object} [params.context] - Contexto adicional
 * @param {object} [params.metadata] - Metadata adicional
 */
export const logError = ({
    source,
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
    try {
        // Usar el método helper de Winston para logging estructurado
        winstonLogger.logError({
            source,
            level,
            errorCode,
            errorMessage,
            stackTrace,
            endpoint,
            method,
            statusCode,
            userId,
            organizationId,
            sessionId,
            ipAddress,
            userAgent,
            requestId,
            correlationId,
            context,
            metadata
        });
    } catch (error) {
        // Si falla Winston, loguear en Pino como fallback
        pinoLogger.error({
            err: error,
            originalError: { errorCode, errorMessage }
        }, 'Failed to log error via Winston');
    }
};

export default logError;
