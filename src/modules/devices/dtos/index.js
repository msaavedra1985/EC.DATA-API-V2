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
        organizationId: z
            .string()
            .min(1, 'organizationId no puede estar vacío')
            .optional()
            .nullable(),
        siteId: z
            .string()
            .min(1, 'siteId no puede estar vacío')
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
        deviceTypeId: z
            .number({ invalid_type_error: 'deviceTypeId debe ser un número' })
            .int('deviceTypeId debe ser un entero')
            .positive('deviceTypeId debe ser positivo')
            .optional()
            .nullable(),
        brandId: z
            .number({ invalid_type_error: 'brandId debe ser un número' })
            .int('brandId debe ser un entero')
            .positive('brandId debe ser positivo')
            .optional()
            .nullable(),
        modelId: z
            .number({ invalid_type_error: 'modelId debe ser un número' })
            .int('modelId debe ser un entero')
            .positive('modelId debe ser positivo')
            .optional()
            .nullable(),
        serverId: z
            .number({ invalid_type_error: 'serverId debe ser un número' })
            .int('serverId debe ser un entero')
            .positive('serverId debe ser positivo')
            .optional()
            .nullable(),
        networkId: z
            .number({ invalid_type_error: 'networkId debe ser un número' })
            .int('networkId debe ser un entero')
            .positive('networkId debe ser positivo')
            .optional()
            .nullable(),
        licenseId: z
            .number({ invalid_type_error: 'licenseId debe ser un número' })
            .int('licenseId debe ser un entero')
            .positive('licenseId debe ser positivo')
            .optional()
            .nullable(),
        validityPeriodId: z
            .number({ invalid_type_error: 'validityPeriodId debe ser un número' })
            .int('validityPeriodId debe ser un entero')
            .positive('validityPeriodId debe ser positivo')
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
        firmwareVersion: z
            .string()
            .max(50, 'firmwareVersion no puede exceder 50 caracteres')
            .optional()
            .nullable(),
        serialNumber: z
            .string()
            .max(100, 'serialNumber no puede exceder 100 caracteres')
            .optional()
            .nullable(),
        ipAddress: z
            .string()
            .max(45, 'ipAddress no puede exceder 45 caracteres')
            .refine((val) => {
                if (!val) return true;
                return ipv4Regex.test(val) || ipv6Regex.test(val);
            }, {
                message: 'ipAddress debe ser una dirección IPv4 o IPv6 válida'
            })
            .optional()
            .nullable(),
        macAddress: z
            .string()
            .max(17, 'macAddress no puede exceder 17 caracteres')
            .refine((val) => {
                if (!val) return true;
                return macAddressRegex.test(val);
            }, {
                message: 'macAddress debe tener formato válido (ej: 00:1A:2B:3C:4D:5E)'
            })
            .optional()
            .nullable(),

        // --- Ubicación ---
        locationName: z
            .string()
            .max(200, 'locationName no puede exceder 200 caracteres')
            .optional()
            .nullable(),
        physicalLocation: z
            .string()
            .max(200, 'physicalLocation no puede exceder 200 caracteres')
            .optional()
            .nullable(),
        electricalLocation: z
            .string()
            .max(200, 'electricalLocation no puede exceder 200 caracteres')
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
        installationDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'installationDate debe tener formato YYYY-MM-DD')
            .optional()
            .nullable(),
        warrantyMonths: z
            .number({ invalid_type_error: 'warrantyMonths debe ser un número' })
            .int('warrantyMonths debe ser un entero')
            .min(0, 'warrantyMonths no puede ser negativo')
            .max(120, 'warrantyMonths no puede exceder 120 meses')
            .optional()
            .nullable(),
        expirationDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'expirationDate debe tener formato YYYY-MM-DD')
            .optional()
            .nullable(),

        // --- Sistema ---
        metadata: z
            .record(z.any())
            .optional(),
        isActive: z
            .boolean()
            .optional()
            .default(true),

        // --- Canales (creación inline) ---
        channels: z
            .array(
                z.object({
                    name: z
                        .string({ required_error: 'channel.name es requerido' })
                        .min(1, 'channel.name no puede estar vacío')
                        .max(200, 'channel.name no puede exceder 200 caracteres'),
                    description: z
                        .string()
                        .max(5000, 'channel.description no puede exceder 5000 caracteres')
                        .optional()
                        .nullable(),
                    channelIndex: z
                        .number({ invalid_type_error: 'channel.channelIndex debe ser un número' })
                        .int('channel.channelIndex debe ser un entero')
                        .optional()
                        .nullable(),
                    measurementTypeId: z
                        .number({ invalid_type_error: 'channel.measurementTypeId debe ser un número' })
                        .int('channel.measurementTypeId debe ser un entero')
                        .positive('channel.measurementTypeId debe ser positivo')
                        .optional()
                        .nullable(),
                    system: z
                        .string()
                        .optional()
                        .nullable(),
                    phase: z
                        .number({ invalid_type_error: 'channel.phase debe ser un número' })
                        .int('channel.phase debe ser un entero')
                        .optional()
                        .nullable(),
                    process: z
                        .boolean()
                        .optional()
                        .default(true),
                    status: z
                        .enum(['active', 'inactive', 'error', 'disabled'])
                        .optional()
                        .default('active'),
                    isActive: z
                        .boolean()
                        .optional()
                        .default(true),
                    metadata: z
                        .record(z.any())
                        .optional(),
                    val1: z.union([z.string(), z.number()]).optional().nullable(),
                    val2: z.union([z.string(), z.number()]).optional().nullable(),
                    val3: z.union([z.string(), z.number()]).optional().nullable(),
                    val4: z.union([z.string(), z.number()]).optional().nullable(),
                    val5: z.union([z.string(), z.number()]).optional().nullable(),
                    val6: z.union([z.string(), z.number()]).optional().nullable(),
                    val7: z.union([z.string(), z.number()]).optional().nullable(),
                    val8: z.union([z.string(), z.number()]).optional().nullable()
                })
            )
            .max(50, 'No se pueden crear más de 50 canales por request')
            .optional()
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
        siteId: z
            .string()
            .min(1, 'siteId no puede estar vacío')
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
        deviceTypeId: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        brandId: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        modelId: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        serverId: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        networkId: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        licenseId: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        validityPeriodId: z
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
        firmwareVersion: z
            .string()
            .max(50)
            .optional()
            .nullable(),
        serialNumber: z
            .string()
            .max(100)
            .optional()
            .nullable(),
        ipAddress: z
            .string()
            .max(45)
            .refine((val) => {
                if (!val) return true;
                return ipv4Regex.test(val) || ipv6Regex.test(val);
            }, {
                message: 'ipAddress debe ser una dirección IPv4 o IPv6 válida'
            })
            .optional()
            .nullable(),
        macAddress: z
            .string()
            .max(17)
            .refine((val) => {
                if (!val) return true;
                return macAddressRegex.test(val);
            }, {
                message: 'macAddress debe tener formato válido (ej: 00:1A:2B:3C:4D:5E)'
            })
            .optional()
            .nullable(),

        // --- Ubicación ---
        locationName: z.string().max(200).optional().nullable(),
        physicalLocation: z.string().max(200).optional().nullable(),
        electricalLocation: z.string().max(200).optional().nullable(),
        latitude: z.number().min(-90).max(90).optional().nullable(),
        longitude: z.number().min(-180).max(180).optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        timezone: z.string().max(50).optional().nullable(),

        // --- Datos comerciales ---
        installationDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'installationDate debe tener formato YYYY-MM-DD')
            .optional()
            .nullable(),
        warrantyMonths: z.number().int().min(0).max(120).optional().nullable(),
        expirationDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'expirationDate debe tener formato YYYY-MM-DD')
            .optional()
            .nullable(),

        // --- Sistema ---
        metadata: z.record(z.any()).optional(),
        isActive: z.boolean().optional()
    })
});

/**
 * Schema para obtener devices con filtros
 * GET /devices
 */
export const getDevicesSchema = z.object({
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
        const normalized = {
            ...data,
            siteId: data.site_id,
            deviceTypeId: data.device_type_id,
            isActive: data.is_active,
            includeChannels: data.include_channels
        };
        delete normalized.site_id;
        delete normalized.device_type_id;
        delete normalized.is_active;
        delete normalized.include_channels;

        if (normalized.page !== undefined && normalized.page >= 1) {
            const limit = normalized.limit || 20;
            return { ...normalized, offset: (normalized.page - 1) * limit };
        }
        return normalized;
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
