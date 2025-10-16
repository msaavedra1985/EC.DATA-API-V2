// modules/organizations/dtos/validate.dto.js
// DTO y validación para endpoint de validación de unicidad de organizaciones

import { z } from 'zod';

/**
 * Schema Zod para validar disponibilidad de nombre/slug de organización
 * Validaciones:
 * - name: opcional, string 2-200 caracteres
 * - slug: opcional, string 2-100 caracteres alfanumérico con guiones
 * - exclude_id: opcional, public_code de organización a excluir (para edición)
 * - Al menos uno de name o slug debe estar presente
 */
export const validateOrganizationSchema = z.object({
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
    
    exclude_id: z.string()
        .min(1, 'Exclude ID (public_code) cannot be empty')
        .optional()
        .nullable()
}).refine(
    (data) => data.name !== undefined || data.slug !== undefined,
    {
        message: 'At least one of name or slug must be provided',
        path: ['name']
    }
);

/**
 * Función helper para validar y parsear los datos de validación
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados y parseados
 * @throws {Error} Si la validación falla
 */
export const validateOrganizationValidation = (data) => {
    return validateOrganizationSchema.parse(data);
};

/**
 * Función helper para validación segura (no lanza error)
 * 
 * @param {Object} data - Datos a validar
 * @returns {{success: boolean, data?: Object, error?: Object}} Resultado de validación
 */
export const safeValidateOrganizationValidation = (data) => {
    return validateOrganizationSchema.safeParse(data);
};

export default validateOrganizationSchema;
