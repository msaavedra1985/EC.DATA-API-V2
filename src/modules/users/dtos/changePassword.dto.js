// modules/users/dtos/changePassword.dto.js
// DTO para validación de cambio de contraseña

import { z } from 'zod';

/**
 * DTO de validación para PATCH /api/v1/users/me/password
 * Permite al usuario cambiar su propia contraseña
 * 
 * Campos requeridos:
 * - currentPassword: Contraseña actual (para verificación)
 * - newPassword: Nueva contraseña (mínimo 8 caracteres)
 * 
 * Validaciones adicionales:
 * - newPassword debe ser diferente de currentPassword
 * - newPassword debe cumplir políticas de complejidad
 */
export const changePasswordSchema = z.object({
    currentPassword: z.string()
        .min(1, 'Current password is required'),
    
    newPassword: z.string()
        .min(8, 'New password must be at least 8 characters')
        .max(255, 'New password must be at most 255 characters')
}).refine(
    (data) => data.currentPassword !== data.newPassword,
    {
        message: 'New password must be different from current password',
        path: ['newPassword']
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
