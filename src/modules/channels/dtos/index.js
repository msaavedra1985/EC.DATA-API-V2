// modules/channels/dtos/index.js
// Schemas de validación con Zod para endpoints de Channels

import { z } from 'zod';

/**
 * Schema para crear un nuevo channel
 * POST /channels
 */
export const createChannelSchema = z.object({
    body: z.object({
        deviceId: z
            .string({
                required_error: 'deviceId es requerido'
            })
            .min(1, 'deviceId no puede estar vacío'),
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
        ch: z
            .number({ invalid_type_error: 'ch debe ser un número' })
            .int('ch debe ser un entero')
            .min(0, 'ch debe ser mayor o igual a 0')
            .optional()
            .nullable(),
        measurementTypeId: z
            .number({ invalid_type_error: 'measurementTypeId debe ser un número' })
            .int('measurementTypeId debe ser un entero')
            .positive('measurementTypeId debe ser positivo')
            .optional()
            .nullable(),
        phaseSystem: z
            .number({ invalid_type_error: 'phaseSystem debe ser un número' })
            .int('phaseSystem debe ser un entero')
            .min(0, 'phaseSystem debe ser 0, 1 o 3')
            .max(3, 'phaseSystem debe ser 0, 1 o 3')
            .optional()
            .nullable(),
        phase: z
            .number({ invalid_type_error: 'phase debe ser un número' })
            .int('phase debe ser un entero')
            .min(1, 'phase debe estar entre 1 y 3')
            .max(3, 'phase debe estar entre 1 y 3')
            .optional()
            .nullable(),
        process: z
            .boolean()
            .optional()
            .default(true),
        status: z
            .enum(['active', 'inactive', 'error', 'disabled'], {
                errorMap: () => ({ message: 'status debe ser: active, inactive, error, o disabled' })
            })
            .default('active'),
        metadata: z
            .record(z.any())
            .optional(),
        isActive: z
            .boolean()
            .optional()
            .default(true)
    })
});

/**
 * Schema para actualizar un channel
 * PATCH /channels/:id
 */
export const updateChannelSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del channel es requerido'
            })
            .min(1, 'ID del channel no puede estar vacío')
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
        ch: z
            .number()
            .int()
            .min(0)
            .optional()
            .nullable(),
        measurementTypeId: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
        phaseSystem: z
            .number()
            .int()
            .min(0)
            .max(3)
            .optional()
            .nullable(),
        phase: z
            .number()
            .int()
            .min(1)
            .max(3)
            .optional()
            .nullable(),
        process: z
            .boolean()
            .optional(),
        status: z
            .enum(['active', 'inactive', 'error', 'disabled'], {
                errorMap: () => ({ message: 'status debe ser: active, inactive, error, o disabled' })
            })
            .optional(),
        metadata: z
            .record(z.any())
            .optional(),
        isActive: z
            .boolean()
            .optional()
    })
});

/**
 * Schema para obtener channels con filtros
 * GET /channels
 */
export const getChannelsSchema = z.object({
    query: z.object({
        deviceId: z
            .string()
            .optional(),
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
            .describe('Solo admins: si es "true", muestra todos los channels sin filtrar por organización'),
        measurementTypeId: z
            .string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => !isNaN(val) && val > 0, {
                message: 'measurementTypeId debe ser un entero positivo'
            })
            .optional(),
        status: z
            .enum(['active', 'inactive', 'error', 'disabled'])
            .optional(),
        search: z
            .string()
            .optional(),
        notInHierarchy: z
            .string()
            .transform(val => val === 'true')
            .optional()
            .describe('Si es "true", muestra solo channels que NO están en ninguna jerarquía de recursos'),
        page: z
            .string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => !isNaN(val) && val >= 1, {
                message: 'page debe ser un entero mayor o igual a 1'
            })
            .optional(),
        limit: z
            .string()
            .regex(/^\d+$/, 'limit debe ser un número')
            .transform(Number)
            .refine(val => val > 0 && val <= 100, {
                message: 'limit debe estar entre 1 y 100'
            })
            .optional()
            .default('20'),
        offset: z
            .string()
            .regex(/^\d+$/, 'offset debe ser un número')
            .transform(Number)
            .refine(val => val >= 0, {
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
 * Schema para obtener un channel por ID
 * GET /channels/:id
 */
export const getChannelByIdSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del channel es requerido'
            })
            .min(1, 'ID del channel no puede estar vacío')
    })
});

/**
 * Schema para eliminar un channel
 * DELETE /channels/:id
 */
export const deleteChannelSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del channel es requerido'
            })
            .min(1, 'ID del channel no puede estar vacío')
    })
});
