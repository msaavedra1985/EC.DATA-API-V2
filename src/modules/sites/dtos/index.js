// modules/sites/dtos/index.js
// Schemas de validación con Zod para endpoints de Sites

import { z } from 'zod';

/**
 * Schema para crear un nuevo site
 * POST /sites
 */
export const createSiteSchema = z.object({
    body: z.object({
        organizationId: z
            .string()
            .min(1, 'organizationId no puede estar vacío')
            .optional(),
        name: z
            .string({
                required_error: 'name es requerido'
            })
            .min(1, 'name no puede estar vacío')
            .max(200, 'name no puede exceder 200 caracteres'),
        description: z
            .string()
            .max(5000, 'description no puede exceder 5000 caracteres')
            .optional(),
        latitude: z
            .number()
            .min(-90, 'latitude debe estar entre -90 y 90')
            .max(90, 'latitude debe estar entre -90 y 90')
            .optional(),
        longitude: z
            .number()
            .min(-180, 'longitude debe estar entre -180 y 180')
            .max(180, 'longitude debe estar entre -180 y 180')
            .optional(),
        address: z
            .string()
            .max(500, 'address no puede exceder 500 caracteres')
            .optional(),
        streetNumber: z
            .string()
            .max(20, 'streetNumber no puede exceder 20 caracteres')
            .optional(),
        city: z
            .string()
            .max(100, 'city no puede exceder 100 caracteres')
            .optional(),
        stateProvince: z
            .string()
            .max(100, 'stateProvince no puede exceder 100 caracteres')
            .optional(),
        postalCode: z
            .string()
            .max(20, 'postalCode no puede exceder 20 caracteres')
            .optional(),
        countryCode: z
            .string({
                required_error: 'countryCode es requerido'
            })
            .length(2, 'countryCode debe ser exactamente 2 caracteres (ISO 3166-1 alpha-2)')
            .toUpperCase()
            .regex(/^[A-Z]{2}$/, 'countryCode debe ser 2 letras mayúsculas'),
        timezone: z
            .string()
            .max(100, 'timezone no puede exceder 100 caracteres')
            .optional(),
        buildingType: z
            .enum(['office', 'warehouse', 'factory', 'retail', 'hospital', 'school', 
                   'datacenter', 'hotel', 'restaurant', 'residential', 'mixed', 'other'], {
                errorMap: () => ({ message: 'buildingType debe ser un tipo válido' })
            })
            .optional(),
        areaM2: z
            .number()
            .positive('areaM2 debe ser un número positivo')
            .optional(),
        floors: z
            .number()
            .int('floors debe ser un número entero')
            .positive('floors debe ser un número positivo')
            .optional(),
        operatingHours: z
            .string()
            .max(200, 'operatingHours no puede exceder 200 caracteres')
            .optional(),
        imageUrl: z
            .string()
            .url('imageUrl debe ser una URL válida')
            .max(500, 'imageUrl no puede exceder 500 caracteres')
            .optional(),
        contactName: z
            .string()
            .max(100, 'contactName no puede exceder 100 caracteres')
            .optional(),
        contactPhone: z
            .string()
            .max(50, 'contactPhone no puede exceder 50 caracteres')
            .optional(),
        contactEmail: z
            .string()
            .email('contactEmail debe ser un email válido')
            .max(100, 'contactEmail no puede exceder 100 caracteres')
            .optional(),
        isActive: z
            .boolean()
            .optional()
            .default(true)
    })
});

/**
 * Schema para actualizar un site
 * PUT /sites/:id
 */
export const updateSiteSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del site es requerido'
            })
            .min(1, 'ID del site no puede estar vacío')
    }),
    body: z.object({
        name: z
            .string()
            .min(1, 'name no puede estar vacío')
            .max(200, 'name no puede exceder 200 caracteres')
            .optional(),
        description: z
            .string()
            .max(5000, 'description no puede exceder 5000 caracteres')
            .optional(),
        latitude: z
            .number()
            .min(-90, 'latitude debe estar entre -90 y 90')
            .max(90, 'latitude debe estar entre -90 y 90')
            .optional(),
        longitude: z
            .number()
            .min(-180, 'longitude debe estar entre -180 y 180')
            .max(180, 'longitude debe estar entre -180 y 180')
            .optional(),
        address: z
            .string()
            .max(500, 'address no puede exceder 500 caracteres')
            .optional(),
        streetNumber: z
            .string()
            .max(20, 'streetNumber no puede exceder 20 caracteres')
            .optional(),
        city: z
            .string()
            .max(100, 'city no puede exceder 100 caracteres')
            .optional(),
        stateProvince: z
            .string()
            .max(100, 'stateProvince no puede exceder 100 caracteres')
            .optional(),
        postalCode: z
            .string()
            .max(20, 'postalCode no puede exceder 20 caracteres')
            .optional(),
        countryCode: z
            .string()
            .length(2, 'countryCode debe ser exactamente 2 caracteres (ISO 3166-1 alpha-2)')
            .toUpperCase()
            .regex(/^[A-Z]{2}$/, 'countryCode debe ser 2 letras mayúsculas')
            .optional(),
        timezone: z
            .string()
            .max(100, 'timezone no puede exceder 100 caracteres')
            .optional(),
        buildingType: z
            .enum(['office', 'warehouse', 'factory', 'retail', 'hospital', 'school', 
                   'datacenter', 'hotel', 'restaurant', 'residential', 'mixed', 'other'], {
                errorMap: () => ({ message: 'buildingType debe ser un tipo válido' })
            })
            .optional(),
        areaM2: z
            .number()
            .positive('areaM2 debe ser un número positivo')
            .optional(),
        floors: z
            .number()
            .int('floors debe ser un número entero')
            .positive('floors debe ser un número positivo')
            .optional(),
        operatingHours: z
            .string()
            .max(200, 'operatingHours no puede exceder 200 caracteres')
            .optional(),
        imageUrl: z
            .string()
            .url('imageUrl debe ser una URL válida')
            .max(500, 'imageUrl no puede exceder 500 caracteres')
            .optional(),
        contactName: z
            .string()
            .max(100, 'contactName no puede exceder 100 caracteres')
            .optional(),
        contactPhone: z
            .string()
            .max(50, 'contactPhone no puede exceder 50 caracteres')
            .optional(),
        contactEmail: z
            .string()
            .email('contactEmail debe ser un email válido')
            .max(100, 'contactEmail no puede exceder 100 caracteres')
            .optional(),
        isActive: z
            .boolean()
            .optional()
    }).refine(
        (data) => Object.keys(data).length > 0,
        { message: 'Debe proporcionar al menos un campo para actualizar' }
    )
});

/**
 * Schema para listar sites con filtros
 * GET /sites
 * 
 * Comportamiento del filtro por organización:
 * - Sin filtro: Usa la organización activa del usuario (del JWT)
 * - Con organization_id: Filtra por esa organización (si tiene acceso)
 * - Con all=true: Solo admins, muestra todos los sites accesibles (org-admins limitados a su scope)
 * - organization_ids: Array interno usado por el middleware (no expuesto a clientes)
 */
export const listSitesSchema = z.object({
    query: z.object({
        organizationId: z
            .string()
            .optional(),
        organizationIds: z
            .array(z.string())
            .optional()
            .describe('INTERNO: Array de UUIDs de organizaciones (inyectado por middleware)'),
        all: z
            .string()
            .optional()
            .describe('Solo admins: si es "true", muestra todos los sites sin filtrar por organización'),
        countryCode: z
            .string()
            .length(2, 'countryCode debe ser exactamente 2 caracteres')
            .toUpperCase()
            .optional(),
        isActive: z
            .string()
            .transform(val => val === 'true')
            .optional(),
        city: z
            .string()
            .optional(),
        notInHierarchy: z
            .string()
            .transform(val => val === 'true')
            .optional()
            .describe('Si es "true", muestra solo sites que NO están en ninguna jerarquía de recursos'),
        page: z
            .string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => !isNaN(val) && val >= 1, {
                message: 'page debe ser un entero mayor o igual a 1'
            })
            .optional(),
        limit: z
            .string()
            .transform(val => parseInt(val, 10))
            .optional()
            .default('20'),
        offset: z
            .string()
            .transform(val => parseInt(val, 10))
            .optional()
            .default('0')
    }).transform((data) => {
        if (data.page !== undefined && data.page >= 1) {
            const limit = data.limit || 20;
            return { ...data, offset: (data.page - 1) * limit };
        }
        return data;
    })
});

/**
 * Schema para obtener site por ID
 * GET /sites/:id
 */
export const getSiteSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del site es requerido'
            })
            .min(1, 'ID del site no puede estar vacío')
    })
});

/**
 * Schema para eliminar site
 * DELETE /sites/:id
 */
export const deleteSiteSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del site es requerido'
            })
            .min(1, 'ID del site no puede estar vacío')
    })
});
