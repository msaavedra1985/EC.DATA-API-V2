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

const optionalDescriptionField = z
    .string()
    .max(2000, 'description no puede exceder 2000 caracteres')
    .optional()
    .nullable();

const optionalIconField = z
    .string()
    .max(50, 'icon no puede exceder 50 caracteres')
    .optional();

const optionalMetadataField = z
    .record(z.any())
    .optional();

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
                .optional(),
            description: optionalDescriptionField,
            icon: optionalIconField,
            metadata: optionalMetadataField
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
                .optional(),
            description: optionalDescriptionField,
            icon: optionalIconField,
            metadata: optionalMetadataField
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
            description: optionalDescriptionField,
            icon: optionalIconField,
            metadata: optionalMetadataField
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
            .default('false')
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
    }).transform((data) => {
        const normalized = pageToOffsetTransform(data);
        const { parent_id, node_type, is_active, include_counts, ...rest } = normalized;
        return {
            ...rest,
            parentId: parent_id,
            nodeType: node_type,
            isActive: is_active,
            includeCounts: include_counts
        };
    })
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
    }).transform((data) => {
        const normalized = pageToOffsetTransform(data);
        const { node_type, include_counts, ...rest } = normalized;
        return {
            ...rest,
            nodeType: node_type,
            includeCounts: include_counts
        };
    })
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
    }).transform((data) => {
        const normalized = pageToOffsetTransform(data);
        const { node_type, max_depth, ...rest } = normalized;
        return {
            ...rest,
            nodeType: node_type,
            maxDepth: max_depth
        };
    })
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
    }).transform((data) => {
        const { root_id, max_depth, include_counts, ...rest } = data;
        return {
            ...rest,
            rootId: root_id,
            maxDepth: max_depth,
            includeCounts: include_counts
        };
    })
});

export const getRootsSchema = z.object({
    query: paginationBaseSchema.extend({
        organizationId: z
            .string()
            .min(1, 'organizationId no puede estar vacío')
            .optional(),
        node_type: z
            .enum(nodeTypes, {
                errorMap: () => ({ message: 'node_type debe ser: folder, site, o channel' })
            })
            .optional()
    }).transform((data) => {
        const normalized = pageToOffsetTransform(data);
        const { node_type, ...rest } = normalized;
        return {
            ...rest,
            nodeType: node_type
        };
    })
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
    }).transform((data) => {
        const { user_id, node_id, access_type, ...rest } = data;
        return {
            ...rest,
            userId: user_id,
            nodeId: node_id,
            accessType: access_type
        };
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

const batchDisplayOrderField = z
    .number()
    .int('displayOrder debe ser un número entero')
    .min(0, 'displayOrder debe ser mayor o igual a 0')
    .optional()
    .default(0);

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
        description: optionalDescriptionField,
        icon: optionalIconField,
        metadata: optionalMetadataField,
        displayOrder: batchDisplayOrderField
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
        description: optionalDescriptionField,
        icon: optionalIconField,
        metadata: optionalMetadataField,
        displayOrder: batchDisplayOrderField
    }),
    z.object({
        nodeType: z.literal('folder'),
        name: z
            .string({
                required_error: 'name es requerido para folders'
            })
            .min(1, 'name no puede estar vacío')
            .max(255, 'name no puede exceder 255 caracteres'),
        description: optionalDescriptionField,
        icon: optionalIconField,
        metadata: optionalMetadataField,
        displayOrder: batchDisplayOrderField
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
        category_id: z
            .string()
            .transform(val => parseInt(val, 10))
            .pipe(z.number().int().positive('category_id debe ser un entero positivo')),
        include_subcategories: z
            .string()
            .optional()
            .transform(val => val !== 'false')
    }).transform((data) => {
        const { category_id, include_subcategories, ...rest } = data;
        return {
            ...rest,
            categoryId: category_id,
            includeSubcategories: include_subcategories
        };
    })
});

export const checkCategoryDescendantsSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'id es requerido')
    }),
    query: z.object({
        category_id: z
            .string()
            .transform(val => parseInt(val, 10))
            .pipe(z.number().int().positive('category_id debe ser un entero positivo')),
        include_subcategories: z
            .string()
            .optional()
            .transform(val => val !== 'false')
    }).transform((data) => {
        const { category_id, include_subcategories, ...rest } = data;
        return {
            ...rest,
            categoryId: category_id,
            includeSubcategories: include_subcategories
        };
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
