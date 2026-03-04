// modules/users/dtos/toggleStatus.dto.js
// DTO para toggle de estado activo/inactivo de usuario

import { z } from 'zod';

/**
 * Schema de validación para PATCH /users/:id/status
 * Solo permite cambiar el campo isActive
 */
const toggleStatusSchema = z.object({
    isActive: z.boolean({
        required_error: 'isActive es requerido',
        invalid_type_error: 'isActive debe ser un booleano (true/false)'
    })
});

/**
 * Validar datos de toggle de estado
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} - Datos validados
 * @throws {Error} - Error de validación con detalles
 */
export const validateToggleStatus = (data) => {
    try {
        return toggleStatusSchema.parse(data);
    } catch (error) {
        const validationError = new Error('Validation error');
        validationError.status = 400;
        validationError.code = 'VALIDATION_ERROR';
        validationError.details = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }));
        throw validationError;
    }
};
