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
        device_type: z
            .enum(['sensor', 'gateway', 'controller', 'edge', 'virtual', 'other'], {
                errorMap: () => ({ message: 'device_type debe ser: sensor, gateway, controller, edge, virtual, o other' })
            })
            .default('other'),
        status: z
            .enum(['active', 'inactive', 'maintenance', 'decommissioned'], {
                errorMap: () => ({ message: 'status debe ser: active, inactive, maintenance, o decommissioned' })
            })
            .default('active'),
        firmware_version: z
            .string()
            .max(50, 'firmware_version no puede exceder 50 caracteres')
            .optional(),
        serial_number: z
            .string()
            .max(100, 'serial_number no puede exceder 100 caracteres')
            .optional(),
        ip_address: z
            .string()
            .max(45, 'ip_address no puede exceder 45 caracteres')
            .refine((val) => {
                if (!val) return true; // Permitir vacío si es opcional
                return ipv4Regex.test(val) || ipv6Regex.test(val);
            }, {
                message: 'ip_address debe ser una dirección IPv4 o IPv6 válida'
            })
            .optional(),
        mac_address: z
            .string()
            .max(17, 'mac_address no puede exceder 17 caracteres')
            .refine((val) => {
                if (!val) return true; // Permitir vacío si es opcional
                return macAddressRegex.test(val);
            }, {
                message: 'mac_address debe tener formato válido (ej: 00:1A:2B:3C:4D:5E)'
            })
            .optional(),
        location_hint: z
            .string()
            .max(200, 'location_hint no puede exceder 200 caracteres')
            .optional(),
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
 * PUT /devices/:id
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
            .optional(),
        device_type: z
            .enum(['sensor', 'gateway', 'controller', 'edge', 'virtual', 'other'], {
                errorMap: () => ({ message: 'device_type debe ser: sensor, gateway, controller, edge, virtual, o other' })
            })
            .optional(),
        status: z
            .enum(['active', 'inactive', 'maintenance', 'decommissioned'], {
                errorMap: () => ({ message: 'status debe ser: active, inactive, maintenance, o decommissioned' })
            })
            .optional(),
        firmware_version: z
            .string()
            .max(50, 'firmware_version no puede exceder 50 caracteres')
            .optional(),
        serial_number: z
            .string()
            .max(100, 'serial_number no puede exceder 100 caracteres')
            .optional(),
        ip_address: z
            .string()
            .max(45, 'ip_address no puede exceder 45 caracteres')
            .refine((val) => {
                if (!val) return true;
                return ipv4Regex.test(val) || ipv6Regex.test(val);
            }, {
                message: 'ip_address debe ser una dirección IPv4 o IPv6 válida'
            })
            .optional(),
        mac_address: z
            .string()
            .max(17, 'mac_address no puede exceder 17 caracteres')
            .refine((val) => {
                if (!val) return true;
                return macAddressRegex.test(val);
            }, {
                message: 'mac_address debe tener formato válido (ej: 00:1A:2B:3C:4D:5E)'
            })
            .optional(),
        location_hint: z
            .string()
            .max(200, 'location_hint no puede exceder 200 caracteres')
            .optional(),
        metadata: z
            .record(z.any())
            .optional(),
        is_active: z
            .boolean()
            .optional()
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
        site_id: z
            .string()
            .optional(),
        device_type: z
            .enum(['sensor', 'gateway', 'controller', 'edge', 'virtual', 'other'])
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
