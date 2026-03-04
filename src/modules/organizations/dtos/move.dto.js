// modules/organizations/dtos/move.dto.js
// DTO y validador para mover organizaciones en jerarquía

import { z } from 'zod';

/**
 * Schema Zod para validar datos de mover organización
 * Valida que el parentId sea un public_code válido o null
 */
const moveOrganizationSchema = z.object({
    parentId: z.string()
        .regex(/^ORG-[A-Z2-9]{3}-[A-Z2-9]{3}$/, 'Invalid organization ID format')
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
