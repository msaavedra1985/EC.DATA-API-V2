// modules/users/dtos/create.dto.js
// DTO para validación de creación de usuarios

import { z } from 'zod';

/**
 * DTO de validación para POST /api/v1/users
 * Valida datos de creación de usuarios con Zod
 * 
 * Campos requeridos:
 * - email: Email único (se normalizará con trim + toLowerCase)
 * - first_name: Nombre (1-100 caracteres)
 * - last_name: Apellido (1-100 caracteres)
 * - password: Contraseña (mínimo 8 caracteres)
 * - role: Slug del rol (ej: 'user', 'org-admin')
 * 
 * Campos opcionales:
 * - organization_id: ID público de organización (solo system-admin puede asignar)
 * - send_invite: Enviar email de invitación (default: false)
 */
export const createUserSchema = z.object({
    email: z.string()
        .min(1, 'Email is required')
        .max(255, 'Email must be at most 255 characters')
        .email('Must be a valid email address')
        .trim()
        .toLowerCase(),
    
    first_name: z.string()
        .min(1, 'First name is required')
        .max(100, 'First name must be at most 100 characters')
        .trim(),
    
    last_name: z.string()
        .min(1, 'Last name is required')
        .max(100, 'Last name must be at most 100 characters')
        .trim(),
    
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(255, 'Password must be at most 255 characters'),
    
    role: z.string()
        .min(1, 'Role is required')
        .regex(/^[a-z-]+$/, 'Role must be a valid slug (lowercase with hyphens)'),
    
    organization_id: z.string()
        .optional()
        .nullable()
        .refine(
            (val) => !val || /^USR-[A-Z0-9]{5}-[A-Z0-9]$/.test(val) || /^ORG-[A-Z0-9]{5}-[A-Z0-9]$/.test(val),
            'Invalid organization public code format'
        ),
    
    send_invite: z.boolean()
        .optional()
        .default(false)
});

/**
 * Valida los datos de entrada para creación de usuario
 * @param {Object} data - Datos sin validar
 * @returns {Object} - Datos validados y transformados
 * @throws {ZodError} - Si la validación falla
 */
export const validateCreateUser = (data) => {
    return createUserSchema.parse(data);
};
