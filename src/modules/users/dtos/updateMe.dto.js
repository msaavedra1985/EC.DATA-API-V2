// modules/users/dtos/updateMe.dto.js
// DTO para validación de actualización de perfil propio

import { z } from 'zod';

/**
 * DTO de validación para PUT /api/v1/users/me
 * Permite al usuario actualizar su propio perfil
 * 
 * Campos permitidos (opcionales):
 * - firstName: Nombre
 * - lastName: Apellido
 * - phone: Número de teléfono
 * - language: Idioma preferido (es, en)
 * - timezone: Zona horaria IANA
 * - avatarUrl: URL del avatar
 * 
 * Campos NO permitidos (requieren admin o endpoints dedicados):
 * - email: Cambio de email requiere verificación
 * - password: Usar PATCH /users/me/password
 * - role: Solo administradores pueden cambiar roles
 * - organizationId: Requiere aprobación admin
 * - isActive: Solo administradores
 */
export const updateMeSchema = z.object({
    firstName: z.string()
        .min(1, 'First name cannot be empty')
        .max(100, 'First name must be at most 100 characters')
        .trim()
        .optional(),
    
    lastName: z.string()
        .min(1, 'Last name cannot be empty')
        .max(100, 'Last name must be at most 100 characters')
        .trim()
        .optional(),
    
    phone: z.string()
        .max(50, 'Phone must be at most 50 characters')
        .trim()
        .optional()
        .nullable(),
    
    language: z.enum(['es', 'en'], {
        errorMap: () => ({ message: 'Language must be either "es" or "en"' })
    })
        .optional()
        .nullable(),
    
    timezone: z.string()
        .max(100, 'Timezone must be at most 100 characters')
        .trim()
        .optional()
        .nullable(),
    
    avatarUrl: z.string()
        .url('Avatar URL must be a valid URL')
        .optional()
        .nullable()
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
