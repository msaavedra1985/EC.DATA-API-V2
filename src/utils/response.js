// Utilidad para generar respuestas con formato envelope estándar
// OK: { ok: true, data, meta }
// Error: { ok: false, error: { message, code, status, details? }, meta }

/**
 * Envía una respuesta exitosa con formato envelope
 * @param {Object} res - Objeto response de Express
 * @param {Object} data - Datos de la respuesta
 * @param {number} status - Código HTTP de estado (default: 200)
 * @param {Object} meta - Metadatos adicionales (paginación, timestamps, etc.)
 * @returns {Object} Response de Express
 */
export const successResponse = (res, data, status = 200, meta = {}) => {
    return res.status(status).json({
        ok: true,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            ...meta,
        },
    });
};

/**
 * Envía una respuesta de error con formato envelope
 * @param {Object} res - Objeto response de Express
 * @param {Object} errorData - Datos del error
 * @param {string} errorData.message - Mensaje de error
 * @param {string} errorData.code - Código de error
 * @param {number} errorData.status - Código HTTP de estado
 * @param {Object} errorData.details - Detalles adicionales (opcional)
 * @param {Object} meta - Metadatos adicionales
 * @returns {Object} Response de Express
 */
export const errorResponse = (res, errorData, meta = {}) => {
    const { message, code, status = 500, details = null } = errorData;
    
    return res.status(status).json({
        ok: false,
        error: {
            message,
            code,
            status,
            ...(details && { details }),
        },
        meta: {
            timestamp: new Date().toISOString(),
            ...meta,
        },
    });
};

/**
 * Códigos de error estándar de la aplicación
 */
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    BAD_REQUEST: 'BAD_REQUEST',
};
