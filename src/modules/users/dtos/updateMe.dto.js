// modules/users/dtos/updateMe.dto.js
// DTO para validación de actualización de perfil propio

import { z } from 'zod';

/**
 * DTO de validación para PUT /api/v1/users/me
 * Permite al usuario actualizar su propio perfil
 * 
 * Campos permitidos (opcionales):
 * - first_name: Nombre
 * - last_name: Apellido
 * 
 * Campos NO permitidos (requieren admin o endpoints dedicados):
 * - email: Cambio de email requiere verificación
 * - password: Usar PATCH /users/me/password
 * - role: Solo administradores pueden cambiar roles
 * - organization_id: Requiere aprobación admin
 * - is_active: Solo administradores
 */
export const updateMeSchema = z.object({
    first_name: z.string()
        .min(1, 'First name cannot be empty')
        .max(100, 'First name must be at most 100 characters')
        .trim()
        .optional(),
    
    last_name: z.string()
        .min(1, 'Last name cannot be empty')
        .max(100, 'Last name must be at most 100 characters')
        .trim()
        .optional()
}).strict(); // No permitir campos extra para seguridad

/**
 * Valida los datos de entrada para actualización de perfil propio
 * @param {Object} data - Datos sin validar
 * @returns {Object} - Datos validados y transformados
 * @throws {ZodError} - Si la validación falla
 */
export const validateUpdateMe = (data) => {
    return updateMeSchema.parse(data);
};
