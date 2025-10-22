// modules/users/dtos/changePassword.dto.js
// DTO para validación de cambio de contraseña

import { z } from 'zod';

/**
 * DTO de validación para PATCH /api/v1/users/me/password
 * Permite al usuario cambiar su propia contraseña
 * 
 * Campos requeridos:
 * - current_password: Contraseña actual (para verificación)
 * - new_password: Nueva contraseña (mínimo 8 caracteres)
 * 
 * Validaciones adicionales:
 * - new_password debe ser diferente de current_password
 * - new_password debe cumplir políticas de complejidad
 */
export const changePasswordSchema = z.object({
    current_password: z.string()
        .min(1, 'Current password is required'),
    
    new_password: z.string()
        .min(8, 'New password must be at least 8 characters')
        .max(255, 'New password must be at most 255 characters')
}).refine(
    (data) => data.current_password !== data.new_password,
    {
        message: 'New password must be different from current password',
        path: ['new_password']
    }
);

/**
 * Valida los datos de entrada para cambio de contraseña
 * @param {Object} data - Datos sin validar
 * @returns {Object} - Datos validados
 * @throws {ZodError} - Si la validación falla
 */
export const validateChangePassword = (data) => {
    return changePasswordSchema.parse(data);
};
