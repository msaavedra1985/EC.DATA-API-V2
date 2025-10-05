// Utilidad para generar respuestas con formato envelope estándar
// OK: { ok: true, data, meta }
// Error: { ok: false, error: { message, code, status, details? }, meta }

/**
 * Helper para traducir mensajes si es una clave de i18n
 * Las claves de traducción empiezan con un namespace (ej: "auth.login.success")
 * @param {Object} res - Response de Express con helpers de i18n
 * @param {string} message - Mensaje o clave de traducción
 * @param {Object} params - Parámetros para interpolación en la traducción
 * @returns {string} - Mensaje traducido o el mensaje original
 */
const translateMessage = (res, message, params = {}) => {
    // Si res.locals.__ existe (i18n middleware activo) y el mensaje parece una clave
    if (res.locals && res.locals.__ && message && message.includes('.')) {
        try {
            // Intentar traducir el mensaje
            const translated = res.locals.__(message, params);
            // Si la traducción es diferente de la clave, usar la traducción
            if (translated !== message) {
                return translated;
            }
        } catch (error) {
            // Si hay error en la traducción, usar el mensaje original
        }
    }
    // Si no es una clave de traducción o no hay i18n, devolver el mensaje original
    return message;
};

/**
 * Envía una respuesta exitosa con formato envelope
 * @param {Object} res - Objeto response de Express
 * @param {Object|string} data - Datos de la respuesta o mensaje de éxito
 * @param {number} status - Código HTTP de estado (default: 200)
 * @param {Object} meta - Metadatos adicionales (paginación, timestamps, etc.)
 * @param {Object} translationParams - Parámetros para interpolación en traducciones
 * @returns {Object} Response de Express
 */
export const successResponse = (res, data, status = 200, meta = {}, translationParams = {}) => {
    // Si data es un string, considerarlo como mensaje de éxito y traducirlo
    if (typeof data === 'string') {
        const translatedMessage = translateMessage(res, data, translationParams);
        return res.status(status).json({
            ok: true,
            data: { message: translatedMessage },
            meta: {
                timestamp: new Date().toISOString(),
                locale: res.locals?.locale || 'es',
                ...meta,
            },
        });
    }
    
    // Si data es un objeto con un campo message, traducir el mensaje
    if (data && typeof data === 'object' && data.message) {
        data.message = translateMessage(res, data.message, translationParams);
    }
    
    return res.status(status).json({
        ok: true,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            locale: res.locals?.locale || 'es',
            ...meta,
        },
    });
};

/**
 * Envía una respuesta de error con formato envelope
 * @param {Object} res - Objeto response de Express
 * @param {Object} errorData - Datos del error
 * @param {string} errorData.message - Mensaje de error o clave de traducción
 * @param {string} errorData.code - Código de error
 * @param {number} errorData.status - Código HTTP de estado
 * @param {Object} errorData.details - Detalles adicionales (opcional)
 * @param {Object} errorData.translationParams - Parámetros para interpolación en traducciones
 * @param {Object} meta - Metadatos adicionales
 * @returns {Object} Response de Express
 */
export const errorResponse = (res, errorData, meta = {}) => {
    const { 
        message, 
        code, 
        status = 500, 
        details = null,
        translationParams = {}
    } = errorData;
    
    // Traducir el mensaje principal del error
    const translatedMessage = translateMessage(res, message, translationParams);
    
    // Si hay detalles de validación, traducir los mensajes
    let translatedDetails = details;
    if (details && Array.isArray(details)) {
        translatedDetails = details.map(detail => {
            if (detail.message) {
                return {
                    ...detail,
                    message: translateMessage(res, detail.message, { 
                        field: detail.field,
                        ...translationParams 
                    })
                };
            }
            return detail;
        });
    }
    
    return res.status(status).json({
        ok: false,
        error: {
            message: translatedMessage,
            code,
            status,
            ...(translatedDetails && { details: translatedDetails }),
        },
        meta: {
            timestamp: new Date().toISOString(),
            locale: res.locals?.locale || 'es',
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
