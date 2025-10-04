// Utilidad para generar respuestas con formato envelope estándar
// OK: { ok: true, data, meta }
// Error: { ok: false, error: { message, code, status, details? }, meta }

/**
 * Genera una respuesta exitosa con formato envelope
 * @param {Object} data - Datos de la respuesta
 * @param {Object} meta - Metadatos adicionales (paginación, timestamps, etc.)
 * @returns {Object} Respuesta formateada
 */
export const successResponse = (data, meta = {}) => ({
  ok: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    ...meta,
  },
});

/**
 * Genera una respuesta de error con formato envelope
 * @param {string} message - Mensaje de error
 * @param {string} code - Código de error (ej: 'VALIDATION_ERROR', 'UNAUTHORIZED')
 * @param {number} status - Código HTTP de estado
 * @param {Object} details - Detalles adicionales del error (opcional)
 * @param {Object} meta - Metadatos adicionales
 * @returns {Object} Respuesta de error formateada
 */
export const errorResponse = (message, code, status = 500, details = null, meta = {}) => ({
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
