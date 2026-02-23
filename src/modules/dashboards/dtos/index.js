// modules/dashboards/dtos/index.js
// Schemas de validación con Zod para endpoints de Dashboards

import { z } from 'zod';

// --- Enums reutilizables ---

const widgetTypeEnum = [
    'line_chart', 'bar_chart', 'gauge', 'stat_card',
    'table', 'map', 'heatmap', 'pie_chart',
    'area_chart', 'scatter_chart'
];

const entityTypeEnum = ['channel', 'device', 'site', 'resource_hierarchy'];

const collaboratorRoleEnum = ['viewer', 'editor'];

const dashboardSizeEnum = ['FREE', 'HD', 'VERTICAL', 'CUSTOM'];
const dashboardPositioningEnum = ['AUTO', 'FLOAT'];

// =============================================
// DASHBOARDS
// =============================================

/**
 * Schema para crear un nuevo dashboard
 * POST /dashboards
 * Nota: organization_id y owner_id vienen del middleware (req.organizationContext y req.user)
 */
export const createDashboardSchema = z.object({
    body: z.object({
        name: z
            .string({
                required_error: 'name es requerido'
            })
            .min(1, 'name no puede estar vacío')
            .max(200, 'name no puede exceder 200 caracteres'),
        description: z
            .string()
            .optional(),
        icon: z
            .string()
            .max(50, 'icon no puede exceder 50 caracteres')
            .optional(),
        is_public: z
            .boolean()
            .optional()
            .default(false),
        size: z
            .enum(dashboardSizeEnum, {
                errorMap: () => ({ message: `size debe ser uno de: ${dashboardSizeEnum.join(', ')}` })
            })
            .optional()
            .default('FREE'),
        positioning: z
            .enum(dashboardPositioningEnum, {
                errorMap: () => ({ message: `positioning debe ser uno de: ${dashboardPositioningEnum.join(', ')}` })
            })
            .optional()
            .default('AUTO'),
        custom_width: z
            .number()
            .int('custom_width debe ser un entero')
            .min(800, 'custom_width mínimo es 800')
            .max(3840, 'custom_width máximo es 3840')
            .nullable()
            .optional()
            .default(null),
        custom_height: z
            .number()
            .int('custom_height debe ser un entero')
            .min(600, 'custom_height mínimo es 600')
            .max(2160, 'custom_height máximo es 2160')
            .nullable()
            .optional()
            .default(null),
        settings: z
            .object({
                forceK: z.boolean().optional().default(false),
                backgroundImage: z.string().url('backgroundImage debe ser una URL válida').nullable().optional().default(null)
            })
            .optional()
            .default({}),
        template_id: z
            .string()
            .nullable()
            .optional()
            .default(null)
    }).refine(
        (data) => {
            if (data.size === 'CUSTOM') {
                return data.custom_width != null && data.custom_height != null;
            }
            return true;
        },
        { message: 'custom_width y custom_height son requeridos cuando size es CUSTOM', path: ['custom_width'] }
    ).refine(
        (data) => {
            if (data.size !== 'CUSTOM') {
                return data.custom_width == null && data.custom_height == null;
            }
            return true;
        },
        { message: 'custom_width y custom_height solo son válidos cuando size es CUSTOM', path: ['custom_width'] }
    )
});

/**
 * Schema para actualizar un dashboard
 * PATCH /dashboards/:id
 */
export const updateDashboardSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del dashboard es requerido'
            })
            .min(1, 'ID del dashboard no puede estar vacío')
    }),
    body: z.object({
        name: z
            .string()
            .min(1, 'name no puede estar vacío')
            .max(200, 'name no puede exceder 200 caracteres')
            .optional(),
        description: z
            .string()
            .optional(),
        icon: z
            .string()
            .max(50, 'icon no puede exceder 50 caracteres')
            .optional(),
        is_public: z
            .boolean()
            .optional(),
        is_active: z
            .boolean()
            .optional(),
        size: z
            .enum(dashboardSizeEnum, {
                errorMap: () => ({ message: `size debe ser uno de: ${dashboardSizeEnum.join(', ')}` })
            })
            .optional(),
        positioning: z
            .enum(dashboardPositioningEnum, {
                errorMap: () => ({ message: `positioning debe ser uno de: ${dashboardPositioningEnum.join(', ')}` })
            })
            .optional(),
        custom_width: z
            .number()
            .int('custom_width debe ser un entero')
            .min(800, 'custom_width mínimo es 800')
            .max(3840, 'custom_width máximo es 3840')
            .nullable()
            .optional(),
        custom_height: z
            .number()
            .int('custom_height debe ser un entero')
            .min(600, 'custom_height mínimo es 600')
            .max(2160, 'custom_height máximo es 2160')
            .nullable()
            .optional(),
        settings: z
            .object({
                forceK: z.boolean().optional(),
                backgroundImage: z.string().url('backgroundImage debe ser una URL válida').nullable().optional()
            })
            .optional()
    }).refine(
        (data) => {
            if (data.size === 'CUSTOM') {
                return data.custom_width != null && data.custom_height != null;
            }
            return true;
        },
        { message: 'custom_width y custom_height son requeridos cuando size es CUSTOM', path: ['custom_width'] }
    ).refine(
        (data) => {
            if (data.size !== undefined && data.size !== 'CUSTOM') {
                return data.custom_width == null && data.custom_height == null;
            }
            return true;
        },
        { message: 'custom_width y custom_height solo son válidos cuando size es CUSTOM', path: ['custom_width'] }
    )
});

/**
 * Schema para obtener dashboards con filtros
 * GET /dashboards
 */
export const getDashboardsSchema = z.object({
    query: z.object({
        search: z
            .string()
            .max(200, 'search no puede exceder 200 caracteres')
            .optional(),
        is_public: z
            .string()
            .transform((val) => val === 'true')
            .optional(),
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
            .refine((val) => val > 0 && val <= 100, {
                message: 'limit debe estar entre 1 y 100'
            })
            .optional()
            .default('20'),
        offset: z
            .string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => val >= 0, {
                message: 'offset debe ser mayor o igual a 0'
            })
            .optional()
            .default('0')
    }).transform((data) => {
        if (data.page !== undefined && data.page >= 1) {
            const limit = data.limit || 20;
            return { ...data, offset: (data.page - 1) * limit };
        }
        return data;
    })
});

/**
 * Schema para obtener un dashboard por ID
 * GET /dashboards/:id
 */
export const getDashboardByIdSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del dashboard es requerido'
            })
            .min(1, 'ID del dashboard no puede estar vacío')
    })
});

/**
 * Schema para eliminar un dashboard
 * DELETE /dashboards/:id
 */
export const deleteDashboardSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del dashboard es requerido'
            })
            .min(1, 'ID del dashboard no puede estar vacío')
    })
});

// =============================================
// PÁGINAS DE DASHBOARD
// =============================================

/**
 * Schema para crear una página de dashboard
 * POST /dashboards/:dashboardId/pages
 */
export const createPageSchema = z.object({
    params: z.object({
        dashboardId: z
            .string({
                required_error: 'dashboardId es requerido'
            })
            .min(1, 'dashboardId no puede estar vacío')
    }),
    body: z.object({
        name: z
            .string({
                required_error: 'name es requerido'
            })
            .min(1, 'name no puede estar vacío')
            .max(200, 'name no puede exceder 200 caracteres'),
        order_index: z
            .number({ invalid_type_error: 'order_index debe ser un número' })
            .int('order_index debe ser un entero')
            .min(0, 'order_index debe ser mayor o igual a 0')
            .optional()
            .default(0)
    })
});

/**
 * Schema para actualizar una página de dashboard
 * PATCH /dashboards/:dashboardId/pages/:pageId
 */
export const updatePageSchema = z.object({
    params: z.object({
        dashboardId: z
            .string({
                required_error: 'dashboardId es requerido'
            })
            .min(1, 'dashboardId no puede estar vacío'),
        pageId: z
            .string({
                required_error: 'pageId es requerido'
            })
            .min(1, 'pageId no puede estar vacío')
    }),
    body: z.object({
        name: z
            .string()
            .min(1, 'name no puede estar vacío')
            .max(200, 'name no puede exceder 200 caracteres')
            .optional(),
        order_index: z
            .number({ invalid_type_error: 'order_index debe ser un número' })
            .int('order_index debe ser un entero')
            .min(0, 'order_index debe ser mayor o igual a 0')
            .optional()
    })
});

/**
 * Schema para eliminar una página de dashboard
 * DELETE /dashboards/:dashboardId/pages/:pageId
 */
export const deletePageSchema = z.object({
    params: z.object({
        dashboardId: z
            .string({
                required_error: 'dashboardId es requerido'
            })
            .min(1, 'dashboardId no puede estar vacío'),
        pageId: z
            .string({
                required_error: 'pageId es requerido'
            })
            .min(1, 'pageId no puede estar vacío')
    })
});

// =============================================
// WIDGETS
// =============================================

/**
 * Schema para crear un widget
 * POST /dashboards/:dashboardId/pages/:pageId/widgets
 */
export const createWidgetSchema = z.object({
    params: z.object({
        dashboardId: z
            .string({
                required_error: 'dashboardId es requerido'
            })
            .min(1, 'dashboardId no puede estar vacío'),
        pageId: z
            .string({
                required_error: 'pageId es requerido'
            })
            .min(1, 'pageId no puede estar vacío')
    }),
    body: z.object({
        type: z
            .enum(widgetTypeEnum, {
                errorMap: () => ({ message: `type debe ser uno de: ${widgetTypeEnum.join(', ')}` })
            }),
        title: z
            .string()
            .max(200, 'title no puede exceder 200 caracteres')
            .optional(),
        layout: z
            .object({
                x: z.number({ invalid_type_error: 'layout.x debe ser un número' }),
                y: z.number({ invalid_type_error: 'layout.y debe ser un número' }),
                w: z.number({ invalid_type_error: 'layout.w debe ser un número' }),
                h: z.number({ invalid_type_error: 'layout.h debe ser un número' })
            })
            .optional(),
        style_config: z
            .record(z.any())
            .optional(),
        data_config: z
            .record(z.any())
            .optional(),
        order_index: z
            .number({ invalid_type_error: 'order_index debe ser un número' })
            .int('order_index debe ser un entero')
            .min(0, 'order_index debe ser mayor o igual a 0')
            .optional()
            .default(0)
    })
});

/**
 * Schema para actualizar un widget
 * PATCH /dashboards/:dashboardId/pages/:pageId/widgets/:widgetId
 */
export const updateWidgetSchema = z.object({
    params: z.object({
        dashboardId: z
            .string({
                required_error: 'dashboardId es requerido'
            })
            .min(1, 'dashboardId no puede estar vacío'),
        pageId: z
            .string({
                required_error: 'pageId es requerido'
            })
            .min(1, 'pageId no puede estar vacío'),
        widgetId: z
            .string({
                required_error: 'widgetId es requerido'
            })
            .min(1, 'widgetId no puede estar vacío')
    }),
    body: z.object({
        type: z
            .enum(widgetTypeEnum, {
                errorMap: () => ({ message: `type debe ser uno de: ${widgetTypeEnum.join(', ')}` })
            })
            .optional(),
        title: z
            .string()
            .max(200, 'title no puede exceder 200 caracteres')
            .optional(),
        layout: z
            .object({
                x: z.number({ invalid_type_error: 'layout.x debe ser un número' }),
                y: z.number({ invalid_type_error: 'layout.y debe ser un número' }),
                w: z.number({ invalid_type_error: 'layout.w debe ser un número' }),
                h: z.number({ invalid_type_error: 'layout.h debe ser un número' })
            })
            .optional(),
        style_config: z
            .record(z.any())
            .optional(),
        data_config: z
            .record(z.any())
            .optional(),
        order_index: z
            .number({ invalid_type_error: 'order_index debe ser un número' })
            .int('order_index debe ser un entero')
            .min(0, 'order_index debe ser mayor o igual a 0')
            .optional()
    })
});

/**
 * Schema para eliminar un widget
 * DELETE /dashboards/:dashboardId/pages/:pageId/widgets/:widgetId
 */
export const deleteWidgetSchema = z.object({
    params: z.object({
        dashboardId: z
            .string({
                required_error: 'dashboardId es requerido'
            })
            .min(1, 'dashboardId no puede estar vacío'),
        pageId: z
            .string({
                required_error: 'pageId es requerido'
            })
            .min(1, 'pageId no puede estar vacío'),
        widgetId: z
            .string({
                required_error: 'widgetId es requerido'
            })
            .min(1, 'widgetId no puede estar vacío')
    })
});

// =============================================
// DATA SOURCES (Fuentes de datos de widgets)
// =============================================

/**
 * Schema para crear una fuente de datos de widget
 * POST /widgets/:widgetId/data-sources
 */
export const createDataSourceSchema = z.object({
    params: z.object({
        widgetId: z
            .string({
                required_error: 'widgetId es requerido'
            })
            .min(1, 'widgetId no puede estar vacío')
    }),
    body: z.object({
        entity_type: z
            .enum(entityTypeEnum, {
                errorMap: () => ({ message: `entity_type debe ser uno de: ${entityTypeEnum.join(', ')}` })
            }),
        entity_id: z
            .string({
                required_error: 'entity_id es requerido'
            })
            .min(1, 'entity_id no puede estar vacío')
            .max(100, 'entity_id no puede exceder 100 caracteres'),
        label: z
            .string()
            .max(200, 'label no puede exceder 200 caracteres')
            .optional(),
        series_config: z
            .record(z.any())
            .optional(),
        order_index: z
            .number({ invalid_type_error: 'order_index debe ser un número' })
            .int('order_index debe ser un entero')
            .min(0, 'order_index debe ser mayor o igual a 0')
            .optional()
            .default(0)
    })
});

/**
 * Schema para actualizar una fuente de datos de widget
 * PATCH /widgets/:widgetId/data-sources/:dataSourceId
 */
export const updateDataSourceSchema = z.object({
    params: z.object({
        widgetId: z
            .string({
                required_error: 'widgetId es requerido'
            })
            .min(1, 'widgetId no puede estar vacío'),
        dataSourceId: z
            .string({
                required_error: 'dataSourceId es requerido'
            })
            .min(1, 'dataSourceId no puede estar vacío')
    }),
    body: z.object({
        entity_type: z
            .enum(entityTypeEnum, {
                errorMap: () => ({ message: `entity_type debe ser uno de: ${entityTypeEnum.join(', ')}` })
            })
            .optional(),
        entity_id: z
            .string()
            .min(1, 'entity_id no puede estar vacío')
            .max(100, 'entity_id no puede exceder 100 caracteres')
            .optional(),
        label: z
            .string()
            .max(200, 'label no puede exceder 200 caracteres')
            .optional(),
        series_config: z
            .record(z.any())
            .optional(),
        order_index: z
            .number({ invalid_type_error: 'order_index debe ser un número' })
            .int('order_index debe ser un entero')
            .min(0, 'order_index debe ser mayor o igual a 0')
            .optional()
    })
});

/**
 * Schema para eliminar una fuente de datos de widget
 * DELETE /widgets/:widgetId/data-sources/:dataSourceId
 */
export const deleteDataSourceSchema = z.object({
    params: z.object({
        widgetId: z
            .string({
                required_error: 'widgetId es requerido'
            })
            .min(1, 'widgetId no puede estar vacío'),
        dataSourceId: z
            .string({
                required_error: 'dataSourceId es requerido'
            })
            .min(1, 'dataSourceId no puede estar vacío')
    })
});

// =============================================
// GRUPOS DE DASHBOARDS
// =============================================

/**
 * Schema para crear un grupo de dashboards
 * POST /dashboard-groups
 */
export const createGroupSchema = z.object({
    body: z.object({
        name: z
            .string({
                required_error: 'name es requerido'
            })
            .min(1, 'name no puede estar vacío')
            .max(200, 'name no puede exceder 200 caracteres'),
        description: z
            .string()
            .optional()
    })
});

/**
 * Schema para actualizar un grupo de dashboards
 * PATCH /dashboard-groups/:id
 */
export const updateGroupSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del grupo es requerido'
            })
            .min(1, 'ID del grupo no puede estar vacío')
    }),
    body: z.object({
        name: z
            .string()
            .min(1, 'name no puede estar vacío')
            .max(200, 'name no puede exceder 200 caracteres')
            .optional(),
        description: z
            .string()
            .optional(),
        is_active: z
            .boolean()
            .optional()
    })
});

/**
 * Schema para obtener grupos de dashboards con filtros
 * GET /dashboard-groups
 */
export const getGroupsSchema = z.object({
    query: z.object({
        search: z
            .string()
            .max(200, 'search no puede exceder 200 caracteres')
            .optional(),
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
            .refine((val) => val > 0 && val <= 100, {
                message: 'limit debe estar entre 1 y 100'
            })
            .optional()
            .default('20'),
        offset: z
            .string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => val >= 0, {
                message: 'offset debe ser mayor o igual a 0'
            })
            .optional()
            .default('0')
    }).transform((data) => {
        if (data.page !== undefined && data.page >= 1) {
            const limit = data.limit || 20;
            return { ...data, offset: (data.page - 1) * limit };
        }
        return data;
    })
});

/**
 * Schema para obtener un grupo por ID
 * GET /dashboard-groups/:id
 */
export const getGroupByIdSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del grupo es requerido'
            })
            .min(1, 'ID del grupo no puede estar vacío')
    })
});

/**
 * Schema para eliminar un grupo de dashboards
 * DELETE /dashboard-groups/:id
 */
export const deleteGroupSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID del grupo es requerido'
            })
            .min(1, 'ID del grupo no puede estar vacío')
    })
});

// =============================================
// ITEMS DE GRUPO (Dashboard dentro de un grupo)
// =============================================

/**
 * Schema para agregar un dashboard a un grupo
 * POST /dashboard-groups/:groupId/dashboards
 */
export const addGroupItemSchema = z.object({
    params: z.object({
        groupId: z
            .string({
                required_error: 'groupId es requerido'
            })
            .min(1, 'groupId no puede estar vacío')
    }),
    body: z.object({
        dashboard_id: z
            .string({
                required_error: 'dashboard_id es requerido'
            })
            .min(1, 'dashboard_id no puede estar vacío'),
        order_index: z
            .number({ invalid_type_error: 'order_index debe ser un número' })
            .int('order_index debe ser un entero')
            .min(0, 'order_index debe ser mayor o igual a 0')
            .optional()
            .default(0)
    })
});

/**
 * Schema para remover un dashboard de un grupo
 * DELETE /dashboard-groups/:groupId/dashboards/:dashboardId
 */
export const removeGroupItemSchema = z.object({
    params: z.object({
        groupId: z
            .string({
                required_error: 'groupId es requerido'
            })
            .min(1, 'groupId no puede estar vacío'),
        dashboardId: z
            .string({
                required_error: 'dashboardId es requerido'
            })
            .min(1, 'dashboardId no puede estar vacío')
    })
});

// =============================================
// COLABORADORES
// =============================================

/**
 * Schema para agregar un colaborador a un dashboard o grupo
 * POST /dashboards/:id/collaborators
 */
export const addCollaboratorSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID es requerido'
            })
            .min(1, 'ID no puede estar vacío')
    }),
    body: z.object({
        user_id: z
            .string({
                required_error: 'user_id es requerido'
            })
            .min(1, 'user_id no puede estar vacío'),
        role: z
            .enum(collaboratorRoleEnum, {
                errorMap: () => ({ message: `role debe ser uno de: ${collaboratorRoleEnum.join(', ')}` })
            })
    })
});

/**
 * Schema para actualizar el rol de un colaborador
 * PATCH /dashboards/:id/collaborators/:collaboratorId
 */
export const updateCollaboratorSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID es requerido'
            })
            .min(1, 'ID no puede estar vacío'),
        collaboratorId: z
            .string({
                required_error: 'collaboratorId es requerido'
            })
            .min(1, 'collaboratorId no puede estar vacío')
    }),
    body: z.object({
        role: z
            .enum(collaboratorRoleEnum, {
                errorMap: () => ({ message: `role debe ser uno de: ${collaboratorRoleEnum.join(', ')}` })
            })
    })
});

/**
 * Schema para remover un colaborador
 * DELETE /dashboards/:id/collaborators/:collaboratorId
 */
export const removeCollaboratorSchema = z.object({
    params: z.object({
        id: z
            .string({
                required_error: 'ID es requerido'
            })
            .min(1, 'ID no puede estar vacío'),
        collaboratorId: z
            .string({
                required_error: 'collaboratorId es requerido'
            })
            .min(1, 'collaboratorId no puede estar vacío')
    })
});
