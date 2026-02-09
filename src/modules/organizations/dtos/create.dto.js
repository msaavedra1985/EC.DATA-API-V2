// modules/organizations/dtos/create.dto.js
// DTO y validación para creación de organizaciones

import { z } from 'zod';

/**
 * Schema para un país en el array de countries
 */
const countrySchema = z.object({
    code: z.string()
        .length(2, 'Country code must be exactly 2 characters (ISO 3166-1 alpha-2)')
        .toUpperCase()
        .regex(/^[A-Z]{2}$/, 'Country code must be 2 uppercase letters'),
    is_primary: z.boolean().optional().default(false)
});

/**
 * Schema Zod para crear una organización
 * Validaciones:
 * - name: requerido, string 2-200 caracteres
 * - slug: opcional (se auto-genera si no viene), alfanumérico con guiones
 * - logo_url: opcional, URL válida
 * - parent_id: opcional, public_code del padre
 * - description: opcional, texto hasta 5000 caracteres
 * - config: opcional, objeto JSON
 * - countries: requerido, array de objetos {code, is_primary}
 */
export const createOrganizationSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(200, 'Name must not exceed 200 characters')
        .trim(),
    
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
        .passthrough()
        .optional()
        .nullable(),
    
    countries: z.array(countrySchema)
        .min(1, 'At least one country is required'),
    
    selected_users: z.any().optional(),
    
    is_active: z.boolean()
        .optional()
        .default(true)
}).transform((data) => {
    // Eliminar selected_users (no se procesa)
    const { selected_users, ...rest } = data;
    
    // Si solo hay un país, auto-asignar como primary
    if (rest.countries.length === 1) {
        rest.countries[0].is_primary = true;
    }
    
    // Validar que exactamente un país sea primary
    const primaryCount = rest.countries.filter(c => c.is_primary).length;
    if (primaryCount === 0) {
        // Si ninguno es primary, asignar el primero
        rest.countries[0].is_primary = true;
    }
    
    return rest;
}).refine((data) => {
    const primaryCount = data.countries.filter(c => c.is_primary).length;
    return primaryCount === 1;
}, {
    message: 'Exactly one country must be marked as primary',
    path: ['countries']
});

/**
 * Función helper para validar y parsear los datos de creación
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados y parseados
 * @throws {Error} Si la validación falla
 */
export const validateCreateOrganization = (data) => {
    return createOrganizationSchema.parse(data);
};

/**
 * Función helper para validación segura (no lanza error)
 * 
 * @param {Object} data - Datos a validar
 * @returns {{success: boolean, data?: Object, error?: Object}} Resultado de validación
 */
export const safeValidateCreateOrganization = (data) => {
    return createOrganizationSchema.safeParse(data);
};

export default createOrganizationSchema;
