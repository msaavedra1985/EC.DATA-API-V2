// modules/organizations/dtos/update.dto.js
// DTO y validación para actualización de organizaciones

import { z } from 'zod';

/**
 * Schema Zod para actualizar una organización
 * Todos los campos son opcionales (PATCH semántica)
 */
export const updateOrganizationSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(200, 'Name must not exceed 200 characters')
        .trim()
        .optional(),
    
    slug: z.string()
        .min(2, 'Slug must be at least 2 characters')
        .max(100, 'Slug must not exceed 100 characters')
        .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
        .trim()
        .optional(),
    
    logo_url: z.string()
        .url('Logo URL must be a valid URL')
        .max(500, 'Logo URL must not exceed 500 characters')
        .optional()
        .nullable(),
    
    parent_id: z.string()
        .min(1, 'Parent ID (public_code) cannot be empty')
        .optional()
        .nullable(),
    
    description: z.string()
        .max(5000, 'Description must not exceed 5000 characters')
        .trim()
        .optional()
        .nullable(),
    
    tax_id: z.string()
        .max(50, 'Tax ID must not exceed 50 characters')
        .trim()
        .optional()
        .nullable(),
    
    email: z.string()
        .email('Email must be valid')
        .max(255, 'Email must not exceed 255 characters')
        .trim()
        .optional()
        .nullable(),
    
    phone: z.string()
        .max(50, 'Phone must not exceed 50 characters')
        .trim()
        .optional()
        .nullable(),
    
    address: z.string()
        .max(500, 'Address must not exceed 500 characters')
        .trim()
        .optional()
        .nullable(),
    
    config: z.object({})
        .passthrough() // Permitir cualquier estructura JSON
        .optional()
        .nullable(),
    
    is_active: z.boolean()
        .optional()
});

/**
 * Función helper para validar y parsear los datos de actualización
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados y parseados
 * @throws {Error} Si la validación falla
 */
export const validateUpdateOrganization = (data) => {
    return updateOrganizationSchema.parse(data);
};

/**
 * Función helper para validación segura (no lanza error)
 * 
 * @param {Object} data - Datos a validar
 * @returns {{success: boolean, data?: Object, error?: Object}} Resultado de validación
 */
export const safeValidateUpdateOrganization = (data) => {
    return updateOrganizationSchema.safeParse(data);
};

export default updateOrganizationSchema;
