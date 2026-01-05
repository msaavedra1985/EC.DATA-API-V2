// modules/channels/dtos/index.js
// Schemas de validación con Zod para endpoints de Channels

import { z } from 'zod';

/**
 * Regex para validación de URLs
 * Soporta http, https, mqtt, mqtts, ws, wss, coap, coaps, tcp, udp
 */
const urlRegex = /^(https?|mqtt|mqtts|ws|wss|coap|coaps|tcp|udp):\/\/.+/i;

/**
 * Schema para crear un nuevo channel
 * POST /channels
 */
export const createChannelSchema = z.object({
    body: z.object({
        device_id: z
            .string({
                required_error: 'device_id es requerido'
            })
            .min(1, 'device_id no puede estar vacío'),
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
        channel_type: z
            .enum(['mqtt', 'http', 'websocket', 'coap', 'modbus', 'opcua', 'bacnet', 'lorawan', 'sigfox', 'other'], {
                errorMap: () => ({ message: 'channel_type debe ser: mqtt, http, websocket, coap, modbus, opcua, bacnet, lorawan, sigfox, o other' })
            })
            .default('other'),
        protocol: z
            .enum(['mqtt', 'http', 'https', 'ws', 'wss', 'coap', 'coaps', 'modbus_tcp', 'modbus_rtu', 'opcua', 'bacnet_ip', 'lorawan', 'sigfox', 'tcp', 'udp', 'other'], {
                errorMap: () => ({ message: 'protocol debe ser: mqtt, http, https, ws, wss, coap, coaps, modbus_tcp, modbus_rtu, opcua, bacnet_ip, lorawan, sigfox, tcp, udp, o other' })
            })
            .default('other'),
        direction: z
            .enum(['inbound', 'outbound', 'bidirectional'], {
                errorMap: () => ({ message: 'direction debe ser: inbound, outbound, o bidirectional' })
            })
            .default('bidirectional'),
        status: z
            .enum(['active', 'inactive', 'error', 'disabled'], {
                errorMap: () => ({ message: 'status debe ser: active, inactive, error, o disabled' })
            })
            .default('active'),
        endpoint_url: z
            .string()
            .max(500, 'endpoint_url no puede exceder 500 caracteres')
            .refine((val) => {
                if (!val) return true; // Permitir vacío si es opcional
                return urlRegex.test(val);
            }, {
                message: 'endpoint_url debe ser una URL válida (ej: mqtt://broker.example.com:1883, https://api.example.com)'
            })
            .optional(),
        config: z
            .record(z.any())
            .optional(),
        credentials_ref: z
            .string()
            .max(100, 'credentials_ref no puede exceder 100 caracteres')
            .optional(),
        priority: z
            .number({
                invalid_type_error: 'priority debe ser un número'
            })
            .int('priority debe ser un número entero')
            .min(1, 'priority debe ser al menos 1')
            .max(10, 'priority no puede exceder 10')
            .default(5)
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
 * Schema para actualizar un channel
 * PUT /channels/:id
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
        channel_type: z
            .enum(['mqtt', 'http', 'websocket', 'coap', 'modbus', 'opcua', 'bacnet', 'lorawan', 'sigfox', 'other'], {
                errorMap: () => ({ message: 'channel_type debe ser: mqtt, http, websocket, coap, modbus, opcua, bacnet, lorawan, sigfox, o other' })
            })
            .optional(),
        protocol: z
            .enum(['mqtt', 'http', 'https', 'ws', 'wss', 'coap', 'coaps', 'modbus_tcp', 'modbus_rtu', 'opcua', 'bacnet_ip', 'lorawan', 'sigfox', 'tcp', 'udp', 'other'], {
                errorMap: () => ({ message: 'protocol debe ser: mqtt, http, https, ws, wss, coap, coaps, modbus_tcp, modbus_rtu, opcua, bacnet_ip, lorawan, sigfox, tcp, udp, o other' })
            })
            .optional(),
        direction: z
            .enum(['inbound', 'outbound', 'bidirectional'], {
                errorMap: () => ({ message: 'direction debe ser: inbound, outbound, o bidirectional' })
            })
            .optional(),
        status: z
            .enum(['active', 'inactive', 'error', 'disabled'], {
                errorMap: () => ({ message: 'status debe ser: active, inactive, error, o disabled' })
            })
            .optional(),
        endpoint_url: z
            .string()
            .max(500, 'endpoint_url no puede exceder 500 caracteres')
            .refine((val) => {
                if (!val) return true;
                return urlRegex.test(val);
            }, {
                message: 'endpoint_url debe ser una URL válida (ej: mqtt://broker.example.com:1883, https://api.example.com)'
            })
            .optional(),
        config: z
            .record(z.any())
            .optional(),
        credentials_ref: z
            .string()
            .max(100, 'credentials_ref no puede exceder 100 caracteres')
            .optional(),
        priority: z
            .number({
                invalid_type_error: 'priority debe ser un número'
            })
            .int('priority debe ser un número entero')
            .min(1, 'priority debe ser al menos 1')
            .max(10, 'priority no puede exceder 10')
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
 * Schema para obtener channels con filtros
 * GET /channels
 * 
 * Comportamiento del filtro por organización:
 * - Sin filtro: Usa la organización activa del usuario (del JWT)
 * - Con organization_id: Filtra por esa organización (si tiene acceso)
 * - Con all=true: Solo admins, muestra todos los channels accesibles (org-admins limitados a su scope)
 * - organization_ids: Array interno usado por el middleware (no expuesto a clientes)
 */
export const getChannelsSchema = z.object({
    query: z.object({
        device_id: z
            .string()
            .optional(),
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
            .describe('Solo admins: si es "true", muestra todos los channels sin filtrar por organización'),
        channel_type: z
            .enum(['mqtt', 'http', 'websocket', 'coap', 'modbus', 'opcua', 'bacnet', 'lorawan', 'sigfox', 'other'])
            .optional(),
        status: z
            .enum(['active', 'inactive', 'error', 'disabled'])
            .optional(),
        search: z
            .string()
            .optional(),
        not_in_hierarchy: z
            .string()
            .transform(val => val === 'true')
            .optional()
            .describe('Si es "true", muestra solo channels que NO están en ninguna jerarquía de recursos'),
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
