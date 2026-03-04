// Middleware global para manejo de errores con formato envelope
import { errorResponse, ERROR_CODES } from '../utils/response.js';
import logger from '../utils/logger.js';
import winstonLogger from '../utils/winston/logger.js';

/**
 * Middleware global de manejo de errores
 * Captura todos los errores no manejados y los formatea con envelope response
 * 
 * DIRECTIVA CRÍTICA: Este middleware garantiza que TODOS los errores de la API 
 * se registren automáticamente en la tabla error_logs para auditoría y debugging
 * 
 * @param {Error} err - Error capturado
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next middleware
 */
export const errorHandler = (err, req, res, next) => {
    // Log del error para debugging en Pino
    logger.error(err, 'Error capturado');

    // Determinar el código de estado HTTP
    const status = err.status || err.statusCode || 500;

    // Determinar el código de error de la aplicación
    let code = err.code || ERROR_CODES.INTERNAL_ERROR;

    // Mapear códigos HTTP comunes a códigos de aplicación
    if (status === 400 && !err.code) code = ERROR_CODES.BAD_REQUEST;
    if (status === 401 && !err.code) code = ERROR_CODES.UNAUTHORIZED;
    if (status === 403 && !err.code) code = ERROR_CODES.FORBIDDEN;
    if (status === 404 && !err.code) code = ERROR_CODES.NOT_FOUND;
    if (status === 409 && !err.code) code = ERROR_CODES.CONFLICT;

    // Mensaje de error (en producción no exponer detalles internos)
    const message = err.message || 'Internal server error';

    // Detalles adicionales (solo en desarrollo)
    const details =
        process.env.NODE_ENV === 'development'
            ? {
                  stack: err.stack,
                  ...(err.details && { details: err.details }),
              }
            : null;

    // ========================================
    // LOGGING AUTOMÁTICO A LA BASE DE DATOS
    // ========================================
    
    // Determinar nivel de severidad
    let level = 'error';
    if (status >= 500) {
        level = 'critical'; // Errores del servidor son críticos
    } else if (status >= 400 && status < 500) {
        level = 'warning'; // Errores del cliente son warnings
    }

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
    if (req.body && !req.body.password && !req.body.token && !req.body.refresh_token) {
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

    // Registrar error usando Winston (no bloqueante)
    // Winston automáticamente escribe a SQL + archivos vía transportes
    winstonLogger.logError({
        source: 'backend',
        level,
        errorCode: code,
        errorMessage: message,
        stackTrace: err.stack || null,
        endpoint,
        method,
        statusCode: status,
        userId,
        organizationId,
        ipAddress,
        userAgent,
        context,
        metadata
    });

    // Enviar respuesta envelope
    return errorResponse(res, {
        message,
        code,
        status,
        details
    });
};

/**
 * Middleware para manejar rutas no encontradas (404)
 * Debe colocarse después de todas las rutas válidas
 */
export const notFoundHandler = (req, res, next) => {
    const error = new Error('errors.route_not_found');
    error.status = 404;
    error.code = ERROR_CODES.NOT_FOUND;
    error.params = { method: req.method, path: req.path };
    next(error);
};
