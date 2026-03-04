// modules/organizations/dtos/update.dto.js
// DTO y validación para actualización de organizaciones

import { z } from 'zod';

/**
 * Schema para un país en el array de countries
 */
const countrySchema = z.object({
    code: z.string()
        .length(2, 'Country code must be exactly 2 characters (ISO 3166-1 alpha-2)')
        .toUpperCase()
        .regex(/^[A-Z]{2}$/, 'Country code must be 2 uppercase letters'),
    isPrimary: z.boolean().optional().default(false)
});

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
    
    logoUrl: z.string()
        .url('Logo URL must be a valid URL')
        .max(500, 'Logo URL must not exceed 500 characters')
        .optional()
        .nullable(),
    
    parentId: z.string()
        .min(1, 'Parent ID (public_code) cannot be empty')
        .optional()
        .nullable(),
    
    description: z.string()
        .max(5000, 'Description must not exceed 5000 characters')
        .trim()
        .optional()
        .nullable(),
    
    taxId: z.string()
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
        .min(1, 'At least one country is required')
        .optional(),
    
    selectedUsers: z.any().optional(),
    
    isActive: z.boolean()
        .optional()
}).transform((data) => {
    // Eliminar selectedUsers (no se procesa)
    const { selectedUsers, ...rest } = data;
    
    // Si se envían countries, validar y ajustar primary
    if (rest.countries && rest.countries.length > 0) {
        if (rest.countries.length === 1) {
            rest.countries[0].isPrimary = true;
        }
        
        const primaryCount = rest.countries.filter(c => c.isPrimary).length;
        if (primaryCount === 0) {
            rest.countries[0].isPrimary = true;
        }
    }
    
    return rest;
}).refine((data) => {
    if (!data.countries) return true;
    const primaryCount = data.countries.filter(c => c.isPrimary).length;
    return primaryCount === 1;
}, {
    message: 'Exactly one country must be marked as primary',
    path: ['countries']
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
