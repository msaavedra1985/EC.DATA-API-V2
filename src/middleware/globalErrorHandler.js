import logError from '../helpers/errorLog.js';
import logger from '../helpers/logger.js';

const errorLogger = logger.child({ module: 'global-error-handler' });

/**
 * Middleware global de error handling
 * Captura TODOS los errores de la API y los registra automáticamente en error_logs
 * 
 * DIRECTIVA CRÍTICA: Este middleware garantiza que ningún error de la API quede sin registrar
 * Se ejecuta como última capa de Express para capturar errores no manejados
 * 
 * @param {Error} err - Error capturado
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {Function} next - Next middleware
 */
const globalErrorHandler = async (err, req, res, next) => {
    // Determinar status code (si no está definido, usar 500)
    const statusCode = err.statusCode || res.statusCode || 500;
    
    // Determinar nivel de severidad
    let level = 'error';
    if (statusCode >= 500) {
        level = 'critical'; // Errores del servidor son críticos
    } else if (statusCode >= 400 && statusCode < 500) {
        level = 'warning'; // Errores del cliente son warnings
    }

    // Determinar error code (usar el del error o genérico)
    const errorCode = err.code || err.name || 'INTERNAL_ERROR';

    // Extraer información del request
    const endpoint = req.originalUrl || req.url;
    const method = req.method;
    const userId = req.user?.id || null;
    const organizationId = req.user?.activeOrgId || null;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');

    // Construir contexto (sin incluir passwords u otros datos sensibles)
    const context = {
        url: endpoint,
        query: req.query,
        params: req.params
    };

    // Solo incluir body si no contiene datos sensibles
    if (req.body && !req.body.password && !req.body.token) {
        context.body = req.body;
    }

    // Metadata adicional
    const metadata = {
        headers: {
            host: req.get('host'),
            referer: req.get('referer'),
            origin: req.get('origin')
        }
    };

    // Registrar error en la base de datos (sin await para no bloquear la respuesta)
    logError({
        source: 'backend',
        level,
        errorCode,
        errorMessage: err.message || 'Unknown error',
        stackTrace: err.stack || null,
        endpoint,
        method,
        statusCode,
        userId,
        organizationId,
        ipAddress,
        userAgent,
        context,
        metadata
    }).catch(dbError => {
        // Si falla el logging a la BD, solo loguear en Pino
        errorLogger.error({
            err: dbError,
            originalError: err
        }, 'Failed to log error to database in global handler');
    });

    // También loguear en Pino para debugging inmediato
    errorLogger.error({
        err,
        statusCode,
        endpoint,
        method,
        userId,
        errorCode
    }, 'API error captured by global handler');

    // Responder al cliente con formato estándar
    res.status(statusCode).json({
        ok: false,
        error: {
            code: errorCode,
            message: err.message || 'An unexpected error occurred'
        }
    });
};

export default globalErrorHandler;
