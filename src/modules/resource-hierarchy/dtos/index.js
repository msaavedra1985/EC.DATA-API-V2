// modules/resource-hierarchy/dtos/index.js
// Schemas de validación con Zod para endpoints de Resource Hierarchy

import { z } from 'zod';

/**
 * Tipos de nodo válidos
 */
const nodeTypes = ['folder', 'site', 'channel'];

/**
 * Tipos de acceso válidos
 */
const accessTypes = ['view', 'edit', 'admin'];

/**
 * Regex para validar UUID v7
 */
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Schema base para paginación
 */
const paginationSchema = z.object({
    limit: z
        .string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : 50)
        .pipe(z.number().int().min(1).max(500)),
    offset: z
        .string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : 0)
        .pipe(z.number().int().min(0))
});

/**
 * Schema para crear un nuevo nodo
 * POST /resource-hierarchy/nodes
 * Nota: organization_id es opcional, se usa la organización activa del usuario si no se especifica
 * Solo system-admin puede especificar organization_id para crear en otra organización
 */
export const createNodeSchema = z.object({
    body: z.object({
        organization_id: z
            .string()
            .min(1, 'organization_id no puede estar vacío')
            .optional(),
        parent_id: z
            .string()
            .nullable()
            .optional(),
        node_type: z
            .enum(nodeTypes, {
                errorMap: () => ({ message: 'node_type debe ser: folder, site, o channel' })
            }),
        name: z
            .string({
                required_error: 'name es requerido'
            })
            .min(1, 'name no puede estar vacío')
            .max(255, 'name no puede exceder 255 caracteres'),
        description: z
            .string()
            .max(2000, 'description no puede exceder 2000 caracteres')
            .optional()
            .nullable(),
        reference_id: z
            .string()
            .max(100, 'reference_id no puede exceder 100 caracteres')
            .optional()
            .nullable(),
        icon: z
            .string()
            .max(50, 'icon no puede exceder 50 caracteres')
            .optional(),
        display_order: z
            .number()
            .int('display_order debe ser un número entero')
            .min(0, 'display_order debe ser mayor o igual a 0')
            .optional()
            .default(0),
        metadata: z
            .record(z.any())
            .optional()
    })
});

/**
 * Schema para obtener un nodo por ID
 * GET /resource-hierarchy/nodes/:id
 */
export const getNodeSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del nodo es requerido'
            })
            .min(1, 'ID del nodo no puede estar vacío')
    })
});

/**
 * Schema para actualizar un nodo
 * PUT /resource-hierarchy/nodes/:id
 */
export const updateNodeSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del nodo es requerido'
            })
            .min(1, 'ID del nodo no puede estar vacío')
    }),
    body: z.object({
        name: z
            .string()
            .min(1, 'name no puede estar vacío')
            .max(255, 'name no puede exceder 255 caracteres')
            .optional(),
        description: z
            .string()
            .max(2000, 'description no puede exceder 2000 caracteres')
            .optional()
            .nullable(),
        icon: z
            .string()
            .max(50, 'icon no puede exceder 50 caracteres')
            .optional(),
        display_order: z
            .number()
            .int('display_order debe ser un número entero')
            .min(0, 'display_order debe ser mayor o igual a 0')
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
 * Schema para eliminar un nodo
 * DELETE /resource-hierarchy/nodes/:id
 */
export const deleteNodeSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del nodo es requerido'
            })
            .min(1, 'ID del nodo no puede estar vacío')
    }),
    query: z.object({
        cascade: z
            .string()
            .optional()
            .transform(val => val === 'true' || val === '1')
            .default('true')
    })
});

/**
 * Schema para mover un nodo
 * PATCH /resource-hierarchy/nodes/:id/move
 * Soporta cambio de padre y/o display_order en una sola operación
 */
export const moveNodeSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del nodo es requerido'
            })
            .min(1, 'ID del nodo no puede estar vacío')
    }),
    body: z.object({
        new_parent_id: z
            .string()
            .nullable(),
        display_order: z
            .number()
            .int('display_order debe ser un número entero')
            .min(0, 'display_order debe ser mayor o igual a 0')
            .optional()
    })
});

/**
 * Schema para listar nodos de una organización
 * GET /resource-hierarchy/nodes
 * Nota: organization_id es opcional, se usa la organización activa del usuario si no se especifica
 * Solo system-admin puede especificar organization_id para ver otra organización
 */
export const listNodesSchema = z.object({
    query: paginationSchema.extend({
        organization_id: z
            .string()
            .min(1, 'organization_id no puede estar vacío')
            .optional(),
        parent_id: z
            .string()
            .optional(),
        node_type: z
            .enum(nodeTypes, {
                errorMap: () => ({ message: 'node_type debe ser: folder, site, o channel' })
            })
            .optional(),
        search: z
            .string()
            .max(100, 'search no puede exceder 100 caracteres')
            .optional(),
        is_active: z
            .string()
            .optional()
            .transform(val => {
                if (val === 'true' || val === '1') return true;
                if (val === 'false' || val === '0') return false;
                return undefined;
            }),
        include_counts: z
            .string()
            .optional()
            .transform(val => val !== 'false' && val !== '0')
            .default('true')
    })
});

/**
 * Schema para obtener hijos de un nodo
 * GET /resource-hierarchy/nodes/:id/children
 */
export const getChildrenSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del nodo es requerido'
            })
            .min(1, 'ID del nodo no puede estar vacío')
    }),
    query: paginationSchema.extend({
        node_type: z
            .enum(nodeTypes, {
                errorMap: () => ({ message: 'node_type debe ser: folder, site, o channel' })
            })
            .optional(),
        include_counts: z
            .string()
            .optional()
            .transform(val => val !== 'false' && val !== '0')
            .default('true')
    })
});

/**
 * Schema para obtener descendientes de un nodo
 * GET /resource-hierarchy/nodes/:id/descendants
 */
export const getDescendantsSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del nodo es requerido'
            })
            .min(1, 'ID del nodo no puede estar vacío')
    }),
    query: paginationSchema.extend({
        node_type: z
            .enum(nodeTypes, {
                errorMap: () => ({ message: 'node_type debe ser: folder, site, o channel' })
            })
            .optional(),
        max_depth: z
            .string()
            .optional()
            .transform(val => val ? parseInt(val, 10) : null)
            .pipe(z.number().int().min(1).max(50).nullable())
    })
});

/**
 * Schema para obtener ancestros de un nodo
 * GET /resource-hierarchy/nodes/:id/ancestors
 */
export const getAncestorsSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del nodo es requerido'
            })
            .min(1, 'ID del nodo no puede estar vacío')
    })
});

/**
 * Schema para obtener árbol de una organización
 * GET /resource-hierarchy/tree
 * Nota: organization_id es opcional, se usa la organización activa del usuario si no se especifica
 * Solo system-admin puede especificar organization_id para ver otra organización
 */
export const getTreeSchema = z.object({
    query: z.object({
        organization_id: z
            .string()
            .min(1, 'organization_id no puede estar vacío')
            .optional(),
        root_id: z
            .string()
            .optional(),
        max_depth: z
            .string()
            .optional()
            .transform(val => val ? parseInt(val, 10) : null)
            .pipe(z.number().int().min(1).max(50).nullable()),
        include_counts: z
            .string()
            .optional()
            .transform(val => val !== 'false' && val !== '0')
            .default('true')
    })
});

/**
 * Schema para obtener nodos raíz de una organización
 * GET /resource-hierarchy/roots
 * Nota: organization_id es opcional, se usa la organización activa del usuario si no se especifica
 * Solo system-admin puede especificar organization_id para ver otra organización
 */
export const getRootsSchema = z.object({
    query: paginationSchema.extend({
        organization_id: z
            .string()
            .min(1, 'organization_id no puede estar vacío')
            .optional(),
        node_type: z
            .enum(nodeTypes, {
                errorMap: () => ({ message: 'node_type debe ser: folder, site, o channel' })
            })
            .optional()
    })
});

// ============ SCHEMAS DE ACCESO ============

/**
 * Schema para otorgar acceso
 * POST /resource-hierarchy/access
 */
export const grantAccessSchema = z.object({
    body: z.object({
        user_id: z
            .string({
                required_error: 'user_id es requerido'
            })
            .refine(val => uuidRegex.test(val), {
                message: 'user_id debe ser un UUID válido'
            }),
        node_id: z
            .string({
                required_error: 'node_id es requerido'
            })
            .min(1, 'node_id no puede estar vacío'),
        access_type: z
            .enum(accessTypes, {
                errorMap: () => ({ message: 'access_type debe ser: view, edit, o admin' })
            })
            .default('view'),
        include_descendants: z
            .boolean()
            .default(true),
        expires_at: z
            .string()
            .datetime({ message: 'expires_at debe ser una fecha ISO 8601 válida' })
            .optional()
            .nullable(),
        notes: z
            .string()
            .max(500, 'notes no puede exceder 500 caracteres')
            .optional()
            .nullable()
    })
});

/**
 * Schema para revocar acceso
 * DELETE /resource-hierarchy/access
 */
export const revokeAccessSchema = z.object({
    body: z.object({
        user_id: z
            .string({
                required_error: 'user_id es requerido'
            })
            .refine(val => uuidRegex.test(val), {
                message: 'user_id debe ser un UUID válido'
            }),
        node_id: z
            .string({
                required_error: 'node_id es requerido'
            })
            .min(1, 'node_id no puede estar vacío')
    })
});

/**
 * Schema para verificar acceso
 * GET /resource-hierarchy/access/check
 */
export const checkAccessSchema = z.object({
    query: z.object({
        user_id: z
            .string({
                required_error: 'user_id es requerido'
            })
            .refine(val => uuidRegex.test(val), {
                message: 'user_id debe ser un UUID válido'
            }),
        node_id: z
            .string({
                required_error: 'node_id es requerido'
            })
            .min(1, 'node_id no puede estar vacío'),
        access_type: z
            .enum(accessTypes, {
                errorMap: () => ({ message: 'access_type debe ser: view, edit, o admin' })
            })
            .default('view')
    })
});

/**
 * Schema para obtener múltiples nodos por IDs
 * POST /resource-hierarchy/nodes/batch
 */
export const batchGetNodesSchema = z.object({
    body: z.object({
        ids: z
            .array(z.string().min(1), {
                required_error: 'ids es requerido'
            })
            .min(1, 'Debe proporcionar al menos un ID')
            .max(100, 'No puede solicitar más de 100 nodos a la vez'),
        include_counts: z
            .boolean()
            .optional()
            .default(true)
    })
});

/**
 * Schema para un nodo individual en creación batch
 * Usado internamente por batchCreateNodesSchema
 */
const batchNodeItemSchema = z.object({
    node_type: z
        .enum(nodeTypes, {
            errorMap: () => ({ message: 'node_type debe ser: folder, site, o channel' })
        }),
    name: z
        .string({
            required_error: 'name es requerido'
        })
        .min(1, 'name no puede estar vacío')
        .max(255, 'name no puede exceder 255 caracteres'),
    description: z
        .string()
        .max(2000, 'description no puede exceder 2000 caracteres')
        .optional()
        .nullable(),
    reference_id: z
        .string()
        .max(100, 'reference_id no puede exceder 100 caracteres')
        .optional()
        .nullable(),
    icon: z
        .string()
        .max(50, 'icon no puede exceder 50 caracteres')
        .optional(),
    color: z
        .string()
        .max(20, 'color no puede exceder 20 caracteres')
        .regex(/^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{3}$/, 'color debe ser un código hexadecimal válido (#RGB o #RRGGBB)')
        .optional()
        .nullable(),
    display_order: z
        .number()
        .int('display_order debe ser un número entero')
        .min(0, 'display_order debe ser mayor o igual a 0')
        .optional()
        .default(0),
    metadata: z
        .record(z.any())
        .optional()
});

/**
 * Schema para crear múltiples nodos de una vez
 * POST /resource-hierarchy/nodes/batch-create
 * Todos los nodos se crean bajo el mismo parent_id
 * La organización se toma del contexto (req.organizationContext.id)
 */
export const batchCreateNodesSchema = z.object({
    body: z.object({
        parent_id: z
            .string()
            .min(1, 'parent_id no puede estar vacío')
            .nullable()
            .optional(),
        nodes: z
            .array(batchNodeItemSchema, {
                required_error: 'nodes es requerido'
            })
            .min(1, 'Debe proporcionar al menos un nodo')
            .max(50, 'No puede crear más de 50 nodos a la vez')
    })
});

export default {
    createNodeSchema,
    getNodeSchema,
    updateNodeSchema,
    deleteNodeSchema,
    moveNodeSchema,
    listNodesSchema,
    getChildrenSchema,
    getDescendantsSchema,
    getAncestorsSchema,
    getTreeSchema,
    getRootsSchema,
    grantAccessSchema,
    revokeAccessSchema,
    checkAccessSchema,
    batchGetNodesSchema,
    batchCreateNodesSchema
};
