// modules/users/dtos/validate.dto.js
// DTO y validación para endpoint de validación de unicidad de email de usuarios

import { z } from 'zod';

/**
 * Schema Zod para validar disponibilidad de email de usuario
 * Validaciones:
 * - email: requerido, formato válido de email
 * - excludeId: opcional, publicCode de usuario a excluir (para edición)
 */
export const validateEmailSchema = z.object({
    email: z.string()
        .min(1, 'Email is required')
        .email('Invalid email format')
        .trim()
        .toLowerCase(),
    
    excludeId: z.string()
        .min(1, 'Exclude ID (publicCode) cannot be empty')
        .optional()
        .nullable()
});

/**
 * Función helper para validar y parsear los datos de validación de email
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados y parseados
 * @throws {Error} Si la validación falla
 */
export const validateEmailValidation = (data) => {
    return validateEmailSchema.parse(data);
};

/**
 * Función helper para validación segura (no lanza error)
 * 
 * @param {Object} data - Datos a validar
 * @returns {{success: boolean, data?: Object, error?: Object}} Resultado de validación
 */
export const safeValidateEmailValidation = (data) => {
    return validateEmailSchema.safeParse(data);
};

export default validateEmailSchema;
