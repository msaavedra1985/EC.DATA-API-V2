// modules/resource-hierarchy/dtos/index.js
// Schemas de validación con Zod para endpoints de Resource Hierarchy

import { z } from 'zod';

const nodeTypes = ['folder', 'site', 'channel'];

const accessTypes = ['view', 'edit', 'admin'];

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const paginationBaseSchema = z.object({
    page: z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((val) => !isNaN(val) && val >= 1, {
            message: 'page debe ser un entero mayor o igual a 1'
        })
        .optional(),
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

const pageToOffsetTransform = (data) => {
    if (data.page !== undefined && data.page >= 1) {
        const limit = data.limit || 50;
        return { ...data, offset: (data.page - 1) * limit };
    }
    return data;
};

const commonNodeFields = {
    organizationId: z
        .string()
        .min(1, 'organizationId no puede estar vacío')
        .optional(),
    parentId: z
        .string()
        .nullable()
        .optional(),
    displayOrder: z
        .number()
        .int('displayOrder debe ser un número entero')
        .min(0, 'displayOrder debe ser mayor o igual a 0')
        .optional()
        .default(0)
};

export const createNodeSchema = z.object({
    body: z.discriminatedUnion('nodeType', [
        z.object({
            ...commonNodeFields,
            nodeType: z.literal('site'),
            referenceId: z
                .string()
                .min(1, 'referenceId no puede estar vacío')
                .max(100, 'referenceId no puede exceder 100 caracteres'),
            name: z
                .string()
                .min(1, 'name no puede estar vacío')
                .max(255, 'name no puede exceder 255 caracteres')
                .optional()
        }),
        z.object({
            ...commonNodeFields,
            nodeType: z.literal('channel'),
            referenceId: z
                .string()
                .min(1, 'referenceId no puede estar vacío')
                .max(100, 'referenceId no puede exceder 100 caracteres'),
            name: z
                .string()
                .min(1, 'name no puede estar vacío')
                .max(255, 'name no puede exceder 255 caracteres')
                .optional(),
            assetCategoryId: z
                .number()
                .int('assetCategoryId debe ser un número entero')
                .positive('assetCategoryId debe ser positivo')
                .optional()
        }),
        z.object({
            ...commonNodeFields,
            nodeType: z.literal('folder'),
            name: z
                .string({
                    required_error: 'name es requerido para folders'
                })
                .min(1, 'name no puede estar vacío')
                .max(255, 'name no puede exceder 255 caracteres'),
            description: z
                .string()
                .max(2000, 'description no puede exceder 2000 caracteres')
                .optional()
                .nullable(),
            icon: z
                .string()
                .max(50, 'icon no puede exceder 50 caracteres')
                .optional(),
            metadata: z
                .record(z.any())
                .optional()
        })
    ])
});

export const getNodeSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del nodo es requerido'
            })
            .min(1, 'ID del nodo no puede estar vacío')
    })
});

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
        displayOrder: z
            .number()
            .int('displayOrder debe ser un número entero')
            .min(0, 'displayOrder debe ser mayor o igual a 0')
            .optional(),
        metadata: z
            .record(z.any())
            .optional(),
        isActive: z
            .boolean()
            .optional()
    })
});

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

export const moveNodeSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del nodo es requerido'
            })
            .min(1, 'ID del nodo no puede estar vacío')
    }),
    body: z.object({
        newParentId: z
            .string()
            .nullable(),
        displayOrder: z
            .number()
            .int('displayOrder debe ser un número entero')
            .min(0, 'displayOrder debe ser mayor o igual a 0')
            .optional()
    })
});

export const listNodesSchema = z.object({
    query: paginationBaseSchema.extend({
        organizationId: z
            .string()
            .min(1, 'organizationId no puede estar vacío')
            .optional(),
        parentId: z
            .string()
            .optional(),
        nodeType: z
            .enum(nodeTypes, {
                errorMap: () => ({ message: 'nodeType debe ser: folder, site, o channel' })
            })
            .optional(),
        search: z
            .string()
            .max(100, 'search no puede exceder 100 caracteres')
            .optional(),
        isActive: z
            .string()
            .optional()
            .transform(val => {
                if (val === 'true' || val === '1') return true;
                if (val === 'false' || val === '0') return false;
                return undefined;
            }),
        includeCounts: z
            .string()
            .optional()
            .transform(val => val !== 'false' && val !== '0')
            .default('true')
    }).transform(pageToOffsetTransform)
});

export const getChildrenSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del nodo es requerido'
            })
            .min(1, 'ID del nodo no puede estar vacío')
    }),
    query: paginationBaseSchema.extend({
        nodeType: z
            .enum(nodeTypes, {
                errorMap: () => ({ message: 'nodeType debe ser: folder, site, o channel' })
            })
            .optional(),
        includeCounts: z
            .string()
            .optional()
            .transform(val => val !== 'false' && val !== '0')
            .default('true')
    }).transform(pageToOffsetTransform)
});

export const getDescendantsSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del nodo es requerido'
            })
            .min(1, 'ID del nodo no puede estar vacío')
    }),
    query: paginationBaseSchema.extend({
        nodeType: z
            .enum(nodeTypes, {
                errorMap: () => ({ message: 'nodeType debe ser: folder, site, o channel' })
            })
            .optional(),
        maxDepth: z
            .string()
            .optional()
            .transform(val => val ? parseInt(val, 10) : null)
            .pipe(z.number().int().min(1).max(50).nullable())
    }).transform(pageToOffsetTransform)
});

export const getAncestorsSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del nodo es requerido'
            })
            .min(1, 'ID del nodo no puede estar vacío')
    })
});

export const getTreeSchema = z.object({
    query: z.object({
        organizationId: z
            .string()
            .min(1, 'organizationId no puede estar vacío')
            .optional(),
        rootId: z
            .string()
            .optional(),
        maxDepth: z
            .string()
            .optional()
            .transform(val => val ? parseInt(val, 10) : null)
            .pipe(z.number().int().min(1).max(50).nullable()),
        includeCounts: z
            .string()
            .optional()
            .transform(val => val !== 'false' && val !== '0')
            .default('true')
    })
});

export const getRootsSchema = z.object({
    query: paginationBaseSchema.extend({
        organizationId: z
            .string()
            .min(1, 'organizationId no puede estar vacío')
            .optional(),
        nodeType: z
            .enum(nodeTypes, {
                errorMap: () => ({ message: 'nodeType debe ser: folder, site, o channel' })
            })
            .optional()
    }).transform(pageToOffsetTransform)
});

// ============ SCHEMAS DE ACCESO ============

export const grantAccessSchema = z.object({
    body: z.object({
        userId: z
            .string({
                required_error: 'userId es requerido'
            })
            .refine(val => uuidRegex.test(val), {
                message: 'userId debe ser un UUID válido'
            }),
        nodeId: z
            .string({
                required_error: 'nodeId es requerido'
            })
            .min(1, 'nodeId no puede estar vacío'),
        accessType: z
            .enum(accessTypes, {
                errorMap: () => ({ message: 'accessType debe ser: view, edit, o admin' })
            })
            .default('view'),
        includeDescendants: z
            .boolean()
            .default(true),
        expiresAt: z
            .string()
            .datetime({ message: 'expiresAt debe ser una fecha ISO 8601 válida' })
            .optional()
            .nullable(),
        notes: z
            .string()
            .max(500, 'notes no puede exceder 500 caracteres')
            .optional()
            .nullable()
    })
});

export const revokeAccessSchema = z.object({
    body: z.object({
        userId: z
            .string({
                required_error: 'userId es requerido'
            })
            .refine(val => uuidRegex.test(val), {
                message: 'userId debe ser un UUID válido'
            }),
        nodeId: z
            .string({
                required_error: 'nodeId es requerido'
            })
            .min(1, 'nodeId no puede estar vacío')
    })
});

export const checkAccessSchema = z.object({
    query: z.object({
        userId: z
            .string({
                required_error: 'userId es requerido'
            })
            .refine(val => uuidRegex.test(val), {
                message: 'userId debe ser un UUID válido'
            }),
        nodeId: z
            .string({
                required_error: 'nodeId es requerido'
            })
            .min(1, 'nodeId no puede estar vacío'),
        accessType: z
            .enum(accessTypes, {
                errorMap: () => ({ message: 'accessType debe ser: view, edit, o admin' })
            })
            .default('view')
    })
});

export const batchGetNodesSchema = z.object({
    body: z.object({
        ids: z
            .array(z.string().min(1), {
                required_error: 'ids es requerido'
            })
            .min(1, 'Debe proporcionar al menos un ID')
            .max(100, 'No puede solicitar más de 100 nodos a la vez'),
        includeCounts: z
            .boolean()
            .optional()
            .default(true)
    })
});

const batchNodeItemSchema = z.discriminatedUnion('nodeType', [
    z.object({
        nodeType: z.literal('site'),
        referenceId: z
            .string()
            .min(1, 'referenceId no puede estar vacío')
            .max(100, 'referenceId no puede exceder 100 caracteres'),
        name: z
            .string()
            .min(1, 'name no puede estar vacío')
            .max(255, 'name no puede exceder 255 caracteres')
            .optional(),
        displayOrder: z
            .number()
            .int('displayOrder debe ser un número entero')
            .min(0, 'displayOrder debe ser mayor o igual a 0')
            .optional()
            .default(0)
    }),
    z.object({
        nodeType: z.literal('channel'),
        referenceId: z
            .string()
            .min(1, 'referenceId no puede estar vacío')
            .max(100, 'referenceId no puede exceder 100 caracteres'),
        name: z
            .string()
            .min(1, 'name no puede estar vacío')
            .max(255, 'name no puede exceder 255 caracteres')
            .optional(),
        assetCategoryId: z
            .number()
            .int('assetCategoryId debe ser un número entero')
            .positive('assetCategoryId debe ser positivo')
            .optional(),
        displayOrder: z
            .number()
            .int('displayOrder debe ser un número entero')
            .min(0, 'displayOrder debe ser mayor o igual a 0')
            .optional()
            .default(0)
    }),
    z.object({
        nodeType: z.literal('folder'),
        name: z
            .string({
                required_error: 'name es requerido para folders'
            })
            .min(1, 'name no puede estar vacío')
            .max(255, 'name no puede exceder 255 caracteres'),
        description: z
            .string()
            .max(2000, 'description no puede exceder 2000 caracteres')
            .optional()
            .nullable(),
        icon: z
            .string()
            .max(50, 'icon no puede exceder 50 caracteres')
            .optional(),
        displayOrder: z
            .number()
            .int('displayOrder debe ser un número entero')
            .min(0, 'displayOrder debe ser mayor o igual a 0')
            .optional()
            .default(0),
        metadata: z
            .record(z.any())
            .optional()
    })
]);

export const batchCreateNodesSchema = z.object({
    body: z.object({
        parentId: z
            .string()
            .min(1, 'parentId no puede estar vacío')
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

export const getFilteredTreeSchema = z.object({
    query: z.object({
        organizationId: z
            .string()
            .min(1, 'organizationId no puede estar vacío')
            .optional(),
        categoryId: z
            .string()
            .transform(val => parseInt(val, 10))
            .pipe(z.number().int().positive('categoryId debe ser un entero positivo')),
        includeSubcategories: z
            .string()
            .optional()
            .transform(val => val !== 'false')
    })
});

export const checkCategoryDescendantsSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'id es requerido')
    }),
    query: z.object({
        categoryId: z
            .string()
            .transform(val => parseInt(val, 10))
            .pipe(z.number().int().positive('categoryId debe ser un entero positivo')),
        includeSubcategories: z
            .string()
            .optional()
            .transform(val => val !== 'false')
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
    batchCreateNodesSchema,
    getFilteredTreeSchema,
    checkCategoryDescendantsSchema
};
