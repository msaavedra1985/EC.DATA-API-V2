import { z } from 'zod';

/**
 * Schema de validación para crear un error log
 * Usado tanto para frontend como para backend
 */
export const createErrorLogSchema = z.object({
    source: z.enum(['frontend', 'backend'], {
        errorMap: () => ({ message: 'Source must be either "frontend" or "backend"' })
    }),
    level: z.enum(['error', 'warning', 'critical']).default('error'),
    errorCode: z.string().min(1).max(100),
    errorMessage: z.string().min(1),
    stackTrace: z.string().optional().nullable(),
    endpoint: z.string().max(500).optional().nullable(),
    method: z.string().max(10).optional().nullable(),
    statusCode: z.number().int().min(100).max(599).optional().nullable(),
    sessionId: z.string().max(100).optional().nullable(),
    correlationId: z.string().max(100).optional().nullable(),
    context: z.record(z.any()).optional().default({}),
    metadata: z.record(z.any()).optional().default({})
});

/**
 * Validar datos de creación de error log
 * @param {object} data - Datos a validar
 * @returns {object} Datos validados
 * @throws {ZodError} Si la validación falla
 */
export const validateCreateErrorLog = (data) => {
    return createErrorLogSchema.parse(data);
};
