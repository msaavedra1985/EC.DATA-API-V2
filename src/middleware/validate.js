// middleware/validate.js
// Middleware de validación con Zod

import { errorResponse } from '../utils/response.js';

/**
 * Middleware genérico para validar request con schemas de Zod
 * @param {Object} schema - Schema de Zod con estructura { body?, query?, params? }
 * @returns {Function} - Middleware de Express
 */
export const validate = (schema) => {
    return async (req, res, next) => {
        try {
            // Validar body, query y params según el schema
            const toValidate = {};
            
            if (schema.shape.body) {
                toValidate.body = req.body;
            }
            
            if (schema.shape.query) {
                toValidate.query = req.query;
            }
            
            if (schema.shape.params) {
                toValidate.params = req.params;
            }

            // Ejecutar validación
            const validated = await schema.parseAsync(toValidate);

            // Sobrescribir request con datos validados y transformados
            if (validated.body) req.body = validated.body;
            if (validated.query) req.query = validated.query;
            if (validated.params) req.params = validated.params;

            next();
        } catch (error) {
            // Si es un error de Zod, formatear y devolver 400
            if (error.name === 'ZodError') {
                const validationErrors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));

                console.warn('Validation failed:', validationErrors);

                return errorResponse(res, {
                    message: 'Error de validación',
                    status: 400,
                    code: 'VALIDATION_ERROR',
                    details: validationErrors
                });
            }

            // Si es otro error, pasar al error handler
            next(error);
        }
    };
};
