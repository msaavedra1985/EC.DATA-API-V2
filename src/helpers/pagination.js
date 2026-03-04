// helpers/pagination.js
// Helper reutilizable de paginación para schemas Zod
// Soporta page+limit (preferido) y offset+limit (alternativa)

import { z } from 'zod';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Crea un schema Zod de paginación configurable
 * Soporta: page+limit (preferido por frontends) y offset+limit (alternativa)
 * Si vienen ambos page y offset, page tiene prioridad
 * 
 * @param {Object} options - Opciones de configuración
 * @param {number} [options.defaultLimit=20] - Límite por defecto
 * @param {number} [options.maxLimit=100] - Límite máximo permitido
 * @returns {z.ZodObject} Schema Zod para merge con otros schemas de query
 */
export const createPaginationSchema = ({ defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) => {
    return z.object({
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
            .refine((val) => val > 0 && val <= maxLimit, {
                message: `limit debe estar entre 1 y ${maxLimit}`
            })
            .optional()
            .default(String(defaultLimit)),
        offset: z
            .string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => val >= 0, {
                message: 'offset debe ser mayor o igual a 0'
            })
            .optional()
    }).transform((data) => {
        const limit = data.limit;
        let offset;

        if (data.page !== undefined) {
            offset = (data.page - 1) * limit;
        } else if (data.offset !== undefined) {
            offset = data.offset;
        } else {
            offset = 0;
        }

        return { ...data, limit, offset };
    });
};

export const paginationSchema = createPaginationSchema();

/**
 * Construye metadata de paginación para respuestas API
 * Incluye page, totalPages, hasNextPage, hasPrevPage
 * 
 * @param {number} total - Total de registros
 * @param {number} limit - Registros por página
 * @param {number} offset - Offset actual
 * @returns {Object} Metadata de paginación
 */
export const buildPaginationMeta = (total, limit, offset) => {
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    };
};
