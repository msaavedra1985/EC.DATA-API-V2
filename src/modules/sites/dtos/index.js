// modules/sites/dtos/index.js
// Schemas de validación con Zod para endpoints de Sites

import { z } from 'zod';

/**
 * Schema para crear un nuevo site
 * POST /sites
 */
export const createSiteSchema = z.object({
    body: z.object({
        organization_id: z
            .string({
                required_error: 'organization_id es requerido'
            })
            .min(1, 'organization_id no puede estar vacío'),
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
        street_number: z
            .string()
            .max(20, 'street_number no puede exceder 20 caracteres')
            .optional(),
        city: z
            .string()
            .max(100, 'city no puede exceder 100 caracteres')
            .optional(),
        state_province: z
            .string()
            .max(100, 'state_province no puede exceder 100 caracteres')
            .optional(),
        postal_code: z
            .string()
            .max(20, 'postal_code no puede exceder 20 caracteres')
            .optional(),
        country_id: z
            .number({
                required_error: 'country_id es requerido',
                invalid_type_error: 'country_id debe ser un número'
            })
            .int('country_id debe ser un entero')
            .positive('country_id debe ser positivo'),
        timezone: z
            .string()
            .max(100, 'timezone no puede exceder 100 caracteres')
            .optional(),
        building_type: z
            .enum(['office', 'warehouse', 'factory', 'retail', 'hospital', 'school', 
                   'datacenter', 'hotel', 'restaurant', 'residential', 'mixed', 'other'], {
                errorMap: () => ({ message: 'building_type debe ser un tipo válido' })
            })
            .optional(),
        area_m2: z
            .number()
            .positive('area_m2 debe ser un número positivo')
            .optional(),
        floors: z
            .number()
            .int('floors debe ser un número entero')
            .positive('floors debe ser un número positivo')
            .optional(),
        operating_hours: z
            .string()
            .max(200, 'operating_hours no puede exceder 200 caracteres')
            .optional(),
        image_url: z
            .string()
            .url('image_url debe ser una URL válida')
            .max(500, 'image_url no puede exceder 500 caracteres')
            .optional(),
        contact_name: z
            .string()
            .max(100, 'contact_name no puede exceder 100 caracteres')
            .optional(),
        contact_phone: z
            .string()
            .max(50, 'contact_phone no puede exceder 50 caracteres')
            .optional(),
        contact_email: z
            .string()
            .email('contact_email debe ser un email válido')
            .max(100, 'contact_email no puede exceder 100 caracteres')
            .optional(),
        is_active: z
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
        street_number: z
            .string()
            .max(20, 'street_number no puede exceder 20 caracteres')
            .optional(),
        city: z
            .string()
            .max(100, 'city no puede exceder 100 caracteres')
            .optional(),
        state_province: z
            .string()
            .max(100, 'state_province no puede exceder 100 caracteres')
            .optional(),
        postal_code: z
            .string()
            .max(20, 'postal_code no puede exceder 20 caracteres')
            .optional(),
        country_id: z
            .number()
            .int('country_id debe ser un entero')
            .positive('country_id debe ser positivo')
            .optional(),
        timezone: z
            .string()
            .max(100, 'timezone no puede exceder 100 caracteres')
            .optional(),
        building_type: z
            .enum(['office', 'warehouse', 'factory', 'retail', 'hospital', 'school', 
                   'datacenter', 'hotel', 'restaurant', 'residential', 'mixed', 'other'], {
                errorMap: () => ({ message: 'building_type debe ser un tipo válido' })
            })
            .optional(),
        area_m2: z
            .number()
            .positive('area_m2 debe ser un número positivo')
            .optional(),
        floors: z
            .number()
            .int('floors debe ser un número entero')
            .positive('floors debe ser un número positivo')
            .optional(),
        operating_hours: z
            .string()
            .max(200, 'operating_hours no puede exceder 200 caracteres')
            .optional(),
        image_url: z
            .string()
            .url('image_url debe ser una URL válida')
            .max(500, 'image_url no puede exceder 500 caracteres')
            .optional(),
        contact_name: z
            .string()
            .max(100, 'contact_name no puede exceder 100 caracteres')
            .optional(),
        contact_phone: z
            .string()
            .max(50, 'contact_phone no puede exceder 50 caracteres')
            .optional(),
        contact_email: z
            .string()
            .email('contact_email debe ser un email válido')
            .max(100, 'contact_email no puede exceder 100 caracteres')
            .optional(),
        is_active: z
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
 * - Con all=true: Solo admins, muestra todos los sites accesibles
 */
export const listSitesSchema = z.object({
    query: z.object({
        organization_id: z
            .string()
            .optional(),
        all: z
            .string()
            .optional()
            .describe('Solo admins: si es "true", muestra todos los sites sin filtrar por organización'),
        country_id: z
            .string()
            .transform(val => parseInt(val, 10))
            .optional(),
        is_active: z
            .string()
            .transform(val => val === 'true')
            .optional(),
        city: z
            .string()
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
