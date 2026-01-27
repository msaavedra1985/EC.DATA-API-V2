// modules/asset-categories/dtos/index.js
// Schemas de validación con Zod para endpoints de AssetCategory

import { z } from 'zod';

/**
 * Regex para validación de colores hexadecimales
 */
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

/**
 * Schema para crear una categoría de organización
 * POST /asset-categories/organization
 */
export const createOrganizationCategorySchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'name es requerido'
      })
      .min(1, 'name no puede estar vacío')
      .max(100, 'name no puede exceder 100 caracteres'),
    color: z
      .string()
      .regex(hexColorRegex, 'color debe ser un código hexadecimal válido (ej: #3B82F6)')
      .optional()
      .default('#6B7280'),
    parent_id: z
      .number()
      .int()
      .positive('parent_id debe ser un número positivo')
      .optional()
      .nullable()
  })
});

/**
 * Schema para crear una categoría personal de usuario
 * POST /asset-categories/user
 */
export const createUserCategorySchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'name es requerido'
      })
      .min(1, 'name no puede estar vacío')
      .max(100, 'name no puede exceder 100 caracteres'),
    color: z
      .string()
      .regex(hexColorRegex, 'color debe ser un código hexadecimal válido (ej: #3B82F6)')
      .optional()
      .default('#6B7280'),
    parent_id: z
      .number()
      .int()
      .positive('parent_id debe ser un número positivo')
      .optional()
      .nullable()
  })
});

/**
 * Schema para actualizar una categoría
 * PUT /asset-categories/:id
 */
export const updateCategorySchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, 'id debe ser un número')
      .transform(val => parseInt(val, 10))
  }),
  body: z.object({
    name: z
      .string()
      .min(1, 'name no puede estar vacío')
      .max(100, 'name no puede exceder 100 caracteres')
      .optional(),
    color: z
      .string()
      .regex(hexColorRegex, 'color debe ser un código hexadecimal válido (ej: #3B82F6)')
      .optional(),
    parent_id: z
      .number()
      .int()
      .positive('parent_id debe ser un número positivo')
      .optional()
      .nullable()
  })
});

/**
 * Schema para obtener categoría por ID
 * GET /asset-categories/:id
 */
export const getCategoryByIdSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, 'id debe ser un número')
      .transform(val => parseInt(val, 10))
  })
});

/**
 * Schema para obtener árbol de categoría
 * GET /asset-categories/:id/tree
 */
export const getCategoryTreeSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, 'id debe ser un número')
      .transform(val => parseInt(val, 10))
  })
});

/**
 * Schema para obtener categorías con filtros
 * GET /asset-categories
 */
export const getCategoriesSchema = z.object({
  query: z.object({
    scope: z
      .enum(['organization', 'user', 'all'])
      .optional()
      .default('all'),
    parent_id: z
      .string()
      .regex(/^\d+$/, 'parent_id debe ser un número')
      .transform(val => parseInt(val, 10))
      .optional()
      .nullable(),
    roots_only: z
      .enum(['true', 'false'])
      .transform(val => val === 'true')
      .optional()
      .default('false')
  })
});

/**
 * Schema para eliminar (desactivar) categoría
 * DELETE /asset-categories/:id
 */
export const deleteCategorySchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, 'id debe ser un número')
      .transform(val => parseInt(val, 10))
  })
});

export default {
  createOrganizationCategorySchema,
  createUserCategorySchema,
  updateCategorySchema,
  getCategoryByIdSchema,
  getCategoryTreeSchema,
  getCategoriesSchema,
  deleteCategorySchema
};
