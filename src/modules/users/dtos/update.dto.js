// modules/users/dtos/update.dto.js
// DTO para validación de actualización de usuarios (admin)

import { z } from 'zod';

/**
 * DTO de validación para PUT /api/v1/users/:id
 * Permite actualizar datos del usuario por parte de administradores
 * 
 * Todos los campos son opcionales (partial update)
 * 
 * Campos permitidos:
 * - first_name: Nombre
 * - last_name: Apellido
 * - role: Cambiar rol (con validación de jerarquía)
 * - organization_id: Cambiar organización (solo system-admin)
 * - is_active: Activar/desactivar usuario
 * - phone: Número de teléfono
 * - language: Idioma preferido (es, en)
 * - timezone: Zona horaria IANA
 * - avatar_url: URL del avatar
 * 
 * Campos NO permitidos aquí:
 * - email: Requiere endpoint dedicado (evitar conflictos)
 * - password: Usar PATCH /users/:id/password
 */
export const updateUserSchema = z.object({
    first_name: z.string()
        .min(1, 'First name cannot be empty')
        .max(100, 'First name must be at most 100 characters')
        .trim()
        .optional(),
    
    last_name: z.string()
        .min(1, 'Last name cannot be empty')
        .max(100, 'Last name must be at most 100 characters')
        .trim()
        .optional(),
    
    role: z.string()
        .min(1, 'Role cannot be empty')
        .regex(/^[a-z-]+$/, 'Role must be a valid slug (lowercase with hyphens)')
        .optional(),
    
    organization_id: z.string()
        .refine(
            (val) => !val || /^ORG-[A-Z0-9]{5}-[A-Z0-9]$/.test(val),
            'Invalid organization public code format'
        )
        .optional()
        .nullable(),
    
    is_active: z.boolean()
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
    
    avatar_url: z.string()
        .url('Avatar URL must be a valid URL')
        .optional()
        .nullable()
}).strict(); // No permitir campos extra

/**
 * Valida los datos de entrada para actualización de usuario
 * @param {Object} data - Datos sin validar
 * @returns {Object} - Datos validados y transformados
 * @throws {ZodError} - Si la validación falla
 */
export const validateUpdateUser = (data) => {
    return updateUserSchema.parse(data);
};
