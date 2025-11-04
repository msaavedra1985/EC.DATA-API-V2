// modules/organizations/dtos/move.dto.js
// DTO y validador para mover organizaciones en jerarquía

import { z } from 'zod';

/**
 * Schema Zod para validar datos de mover organización
 * Valida que el parent_id sea un public_code válido o null
 */
const moveOrganizationSchema = z.object({
    parent_id: z.string()
        .regex(/^ORG-[A-Z0-9]{5,10}(-[A-Z0-9])?$/, 'Invalid organization ID format')
        .nullable()
        .optional()
        .describe('Public code de la nueva organización padre, o null para convertir en raíz')
});

/**
 * Validar datos para mover organización
 * Lanza ZodError si la validación falla
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} - Datos validados
 * @throws {ZodError} - Si la validación falla
 */
export const validateMoveOrganization = (data) => {
    return moveOrganizationSchema.parse(data);
};
