// modules/devices/dtos/index.js
// Schemas de validación con Zod para endpoints de Devices

import { z } from 'zod';

/**
 * Regex para validación de direcciones IP (IPv4 e IPv6)
 */
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const ipv6Regex = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;

/**
 * Regex para validación de dirección MAC
 * Formato: 00:1A:2B:3C:4D:5E o 00-1A-2B-3C-4D-5E
 */
const macAddressRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

/**
 * Schema para crear un nuevo device
 * POST /devices
 */
export const createDeviceSchema = z.object({
    body: z.object({
        uuid: z
            .string()
            .max(36, 'uuid no puede exceder 36 caracteres')
            .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'uuid debe tener formato UUID válido')
            .optional()
            .nullable(),
        organization_id: z
            .string({
                required_error: 'organization_id es requerido'
            })
            .min(1, 'organization_id no puede estar vacío'),
        site_id: z
            .string()
            .min(1, 'site_id no puede estar vacío')
            .optional()
            .nullable(),
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

        // --- FKs a catálogos (integers) ---
        device_type_id: z
            .number({ invalid_type_error: 'device_type_id debe ser un número' })
            .int('device_type_id debe ser un entero')
            .positive('device_type_id debe ser positivo')
            .optional()
            .nullable(),
        brand_id: z
            .number({ invalid_type_error: 'brand_id debe ser un número' })
            .int('brand_id debe ser un entero')
            .positive('brand_id debe ser positivo')
            .optional()
            .nullable(),
        model_id: z
            .number({ invalid_type_error: 'model_id debe ser un número' })
            .int('model_id debe ser un entero')
            .positive('model_id debe ser positivo')
            .optional()
            .nullable(),
        server_id: z
            .number({ invalid_type_error: 'server_id debe ser un número' })
            .int('server_id debe ser un entero')
            .positive('server_id debe ser positivo')
            .optional()
            .nullable(),
        network_id: z
            .number({ invalid_type_error: 'network_id debe ser un número' })
            .int('network_id debe ser un entero')
            .positive('network_id debe ser positivo')
            .optional()
            .nullable(),
        license_id: z
            .number({ invalid_type_error: 'license_id debe ser un número' })
            .int('license_id debe ser un entero')
            .positive('license_id debe ser positivo')
            .optional()
            .nullable(),
        validity_period_id: z
            .number({ invalid_type_error: 'validity_period_id debe ser un número' })
            .int('validity_period_id debe ser un entero')
            .positive('validity_period_id debe ser positivo')
            .optional()
            .nullable(),

        // --- Comunicación MQTT ---
        topic: z
            .string()
            .max(500, 'topic no puede exceder 500 caracteres')
            .optional()
            .nullable(),

        // --- Identificación de hardware ---
        status: z
            .enum(['active', 'inactive', 'maintenance', 'decommissioned'], {
                errorMap: () => ({ message: 'status debe ser: active, inactive, maintenance, o decommissioned' })
            })
            .default('active'),
        firmware_version: z
            .string()
            .max(50, 'firmware_version no puede exceder 50 caracteres')
            .optional()
            .nullable(),
        serial_number: z
            .string()
            .max(100, 'serial_number no puede exceder 100 caracteres')
            .optional()
            .nullable(),
        ip_address: z
            .string()
            .max(45, 'ip_address no puede exceder 45 caracteres')
            .refine((val) => {
                if (!val) return true;
                return ipv4Regex.test(val) || ipv6Regex.test(val);
            }, {
                message: 'ip_address debe ser una dirección IPv4 o IPv6 válida'
            })
            .optional()
            .nullable(),
        mac_address: z
            .string()
            .max(17, 'mac_address no puede exceder 17 caracteres')
            .refine((val) => {
                if (!val) return true;
                return macAddressRegex.test(val);
            }, {
                message: 'mac_address debe tener formato válido (ej: 00:1A:2B:3C:4D:5E)'
            })
            .optional()
            .nullable(),

        // --- Ubicación ---
        location_name: z
            .string()
            .max(200, 'location_name no puede exceder 200 caracteres')
            .optional()
            .nullable(),
        physical_location: z
            .string()
            .max(200, 'physical_location no puede exceder 200 caracteres')
            .optional()
            .nullable(),
        electrical_location: z
            .string()
            .max(200, 'electrical_location no puede exceder 200 caracteres')
            .optional()
            .nullable(),
        latitude: z
            .number({ invalid_type_error: 'latitude debe ser un número' })
            .min(-90, 'latitude debe estar entre -90 y 90')
            .max(90, 'latitude debe estar entre -90 y 90')
            .optional()
            .nullable(),
        longitude: z
            .number({ invalid_type_error: 'longitude debe ser un número' })
            .min(-180, 'longitude debe estar entre -180 y 180')
            .max(180, 'longitude debe estar entre -180 y 180')
            .optional()
            .nullable(),
        city: z
            .string()
            .max(100, 'city no puede exceder 100 caracteres')
            .optional()
            .nullable(),
        timezone: z
            .string()
            .max(50, 'timezone no puede exceder 50 caracteres')
            .optional()
            .nullable()
            .default('UTC'),

        // --- Datos comerciales ---
        installation_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'installation_date debe tener formato YYYY-MM-DD')
            .optional()
            .nullable(),
        warranty_months: z
            .number({ invalid_type_error: 'warranty_months debe ser un número' })
            .int('warranty_months debe ser un entero')
            .min(0, 'warranty_months no puede ser negativo')
            .max(120, 'warranty_months no puede exceder 120 meses')
            .optional()
            .nullable(),
        expiration_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'expiration_date debe tener formato YYYY-MM-DD')
            .optional()
            .nullable(),

        // --- Sistema ---
        metadata: z
            .record(z.any())
            .optional(),
        is_active: z
            .boolean()
            .optional()
            .default(true)
    })
});

/**
 * Schema para actualizar un device
 * PATCH /devices/:id
 */
export const updateDeviceSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del device es requerido'
            })
            .min(1, 'ID del device no puede estar vacío')
    }),
    body: z.object({
        uuid: z
            .string()
            .max(36)
            .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'uuid debe tener formato UUID válido')
            .optional()
            .nullable(),
        site_id: z
            .string()
            .min(1, 'site_id no puede estar vacío')
            .optional()
            .nullable(),
        name: z
            .string()
            .min(1, 'name no puede estar vacío')
            .max(200, 'name no puede exceder 200 caracteres')
            .optional(),
        description: z
            .string()
            .max(5000, 'description no puede exceder 5000 caracteres')
            .optional()
            .nullable(),

        // --- FKs a catálogos ---
        device_type_id: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        brand_id: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        model_id: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        server_id: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        network_id: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        license_id: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        validity_period_id: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),

        // --- Comunicación MQTT ---
        topic: z
            .string()
            .max(500)
            .optional()
            .nullable(),

        // --- Hardware ---
        status: z
            .enum(['active', 'inactive', 'maintenance', 'decommissioned'], {
                errorMap: () => ({ message: 'status debe ser: active, inactive, maintenance, o decommissioned' })
            })
            .optional(),
        firmware_version: z
            .string()
            .max(50)
            .optional()
            .nullable(),
        serial_number: z
            .string()
            .max(100)
            .optional()
            .nullable(),
        ip_address: z
            .string()
            .max(45)
            .refine((val) => {
                if (!val) return true;
                return ipv4Regex.test(val) || ipv6Regex.test(val);
            }, {
                message: 'ip_address debe ser una dirección IPv4 o IPv6 válida'
            })
            .optional()
            .nullable(),
        mac_address: z
            .string()
            .max(17)
            .refine((val) => {
                if (!val) return true;
                return macAddressRegex.test(val);
            }, {
                message: 'mac_address debe tener formato válido (ej: 00:1A:2B:3C:4D:5E)'
            })
            .optional()
            .nullable(),

        // --- Ubicación ---
        location_name: z.string().max(200).optional().nullable(),
        physical_location: z.string().max(200).optional().nullable(),
        electrical_location: z.string().max(200).optional().nullable(),
        latitude: z.number().min(-90).max(90).optional().nullable(),
        longitude: z.number().min(-180).max(180).optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        timezone: z.string().max(50).optional().nullable(),

        // --- Datos comerciales ---
        installation_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'installation_date debe tener formato YYYY-MM-DD')
            .optional()
            .nullable(),
        warranty_months: z.number().int().min(0).max(120).optional().nullable(),
        expiration_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'expiration_date debe tener formato YYYY-MM-DD')
            .optional()
            .nullable(),

        // --- Sistema ---
        metadata: z.record(z.any()).optional(),
        is_active: z.boolean().optional()
    })
});

/**
 * Schema para obtener devices con filtros
 * GET /devices
 */
export const getDevicesSchema = z.object({
    query: z.object({
        organization_id: z
            .string()
            .optional(),
        organization_ids: z
            .array(z.string())
            .optional()
            .describe('INTERNO: Array de UUIDs de organizaciones (inyectado por middleware)'),
        all: z
            .string()
            .optional()
            .describe('Solo admins: si es "true", muestra todos los devices sin filtrar por organización'),
        site_id: z
            .string()
            .optional(),
        device_type_id: z
            .string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => !isNaN(val) && val > 0, {
                message: 'device_type_id debe ser un entero positivo'
            })
            .optional(),
        status: z
            .enum(['active', 'inactive', 'maintenance', 'decommissioned'])
            .optional(),
        is_active: z
            .string()
            .transform((val) => val === 'true')
            .optional(),
        search: z
            .string()
            .max(200, 'search no puede exceder 200 caracteres')
            .optional(),
        include_channels: z
            .string()
            .transform((val) => val === 'true')
            .optional(),
        page: z
            .string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => !isNaN(val) && val >= 1, {
                message: 'page debe ser un entero mayor o igual a 1'
            })
            .optional(),
        limit: z
            .string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => val > 0 && val <= 100, {
                message: 'limit debe estar entre 1 y 100'
            })
            .optional()
            .default('20'),
        offset: z
            .string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => val >= 0, {
                message: 'offset debe ser mayor o igual a 0'
            })
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
 * Schema para obtener un device por ID (public_code)
 * GET /devices/:id
 */
export const getDeviceByIdSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del device es requerido'
            })
            .min(1, 'ID del device no puede estar vacío')
    })
});

/**
 * Schema para eliminar (soft delete) un device
 * DELETE /devices/:id
 */
export const deleteDeviceSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del device es requerido'
            })
            .min(1, 'ID del device no puede estar vacío')
    })
});

/**
 * Función de validación genérica
 * Extrae y formatea errores de Zod
 */
export const validate = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params
            });
            next();
        } catch (error) {
            return res.status(400).json({
                ok: false,
                error: {
                    message: 'Datos de entrada inválidos',
                    code: 'VALIDATION_ERROR',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                },
                meta: {
                    timestamp: new Date().toISOString()
                }
            });
        }
    };
};
