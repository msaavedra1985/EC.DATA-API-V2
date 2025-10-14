import ErrorLog from '../modules/error-logs/models/ErrorLog.js';
import { v7 as uuidv7 } from 'uuid';
import logger from '../utils/logger.js';

const errorLogger = logger.child({ module: 'error-log' });

/**
 * Helper centralizado para registrar errores en la tabla error_logs
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
 * @param {object} [params.context] - Contexto adicional
 * @param {object} [params.metadata] - Metadata adicional
 * @returns {Promise<ErrorLog>} Error log creado
 */
export const logError = async ({
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
    context = {},
    metadata = {}
}) => {
    try {
        const errorLog = await ErrorLog.create({
            source,
            level,
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
            request_id: requestId || uuidv7(),
            context,
            metadata
        });

        return errorLog;
    } catch (error) {
        // Si falla el logging, solo logear en Pino para evitar loops infinitos
        errorLogger.error({
            err: error,
            originalError: { errorCode, errorMessage }
        }, 'Failed to log error to database');
        
        // No lanzar error para no interrumpir la aplicación
        return null;
    }
};

export default logError;
