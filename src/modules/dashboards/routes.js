// modules/dashboards/routes.js
// Rutas REST para el módulo de Dashboards, Pages, Widgets, DataSources, Groups y Collaborators

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import * as dashboardServices from './services.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import {
    toPublicDashboardDto,
    toPublicDashboardListDto,
    toPublicPageDto,
    toPublicWidgetDto,
    toPublicDataSourceDto,
    toPublicGroupDto,
    toPublicGroupDtoList,
    toPublicCollaboratorDto,
    toPublicGroupCollaboratorDto
} from './helpers/serializers.js';
import logger from '../../utils/logger.js';
import {
    createDashboardSchema, updateDashboardSchema, getDashboardsSchema, getDashboardByIdSchema, deleteDashboardSchema,
    createPageSchema, updatePageSchema, deletePageSchema,
    createWidgetSchema, updateWidgetSchema, deleteWidgetSchema,
    createDataSourceSchema, updateDataSourceSchema, deleteDataSourceSchema,
    createGroupSchema, updateGroupSchema, getGroupsSchema, getGroupByIdSchema, deleteGroupSchema,
    addGroupItemSchema, removeGroupItemSchema,
    addCollaboratorSchema, updateCollaboratorSchema, removeCollaboratorSchema
} from './dtos/index.js';

const router = express.Router();
const groupRouter = express.Router();
const dashboardLogger = logger.child({ component: 'dashboards' });

// =============================================
// RUTAS DE DASHBOARDS
// =============================================

/**
 * @swagger
 * /api/v1/dashboards:
 *   get:
 *     summary: Listar dashboards con paginación y filtros
 *     description: Obtiene lista de dashboards de la organización activa con filtros opcionales
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Lista de dashboards obtenida exitosamente
 *       401:
 *         description: No autenticado
 */
router.get('/', authenticate, enforceActiveOrganization, validate(getDashboardsSchema), async (req, res, next) => {
    try {
        const orgId = req.organizationContext.id;
        const { includeWidgets, ...queryParams } = req.query;
        const result = await dashboardServices.listDashboards(orgId, { ...queryParams, includeWidgets }, req.user.userId);

        const serializer = includeWidgets ? toPublicDashboardDto : toPublicDashboardListDto;
        return successResponse(res, result.items.map(serializer), 200, {
            total: result.total,
            limit: result.limit,
            offset: result.offset
        });
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/dashboards/{id}:
 *   get:
 *     summary: Obtener un dashboard por publicCode
 *     description: Obtiene los detalles de un dashboard específico con todas sus relaciones
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard obtenido exitosamente
 *       404:
 *         description: Dashboard no encontrado
 *       401:
 *         description: No autenticado
 */
router.get('/:id', authenticate, enforceActiveOrganization, validate(getDashboardByIdSchema), async (req, res, next) => {
    try {
        const dashboard = await dashboardServices.getDashboard(req.params.id, req.user.userId);

        return successResponse(res, toPublicDashboardDto(dashboard));
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/dashboards:
 *   post:
 *     summary: Crear un nuevo dashboard
 *     description: Crea un dashboard perteneciente a la organización activa. Solo system-admin y org-admin pueden crear.
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Dashboard creado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 */
router.post('/', authenticate, enforceActiveOrganization, requireRole(['system-admin', 'org-admin']), validate(createDashboardSchema), async (req, res, next) => {
    try {
        const result = await dashboardServices.createDashboard(
            req.body,
            req.user.userId,
            req.organizationContext.id,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, toPublicDashboardDto(result), 201);
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/dashboards/{id}:
 *   patch:
 *     summary: Actualizar un dashboard
 *     description: Actualiza los datos de un dashboard existente
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Dashboard no encontrado
 */
router.patch('/:id', authenticate, enforceActiveOrganization, validate(updateDashboardSchema), async (req, res, next) => {
    try {
        const result = await dashboardServices.updateDashboard(
            req.params.id,
            req.body,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, toPublicDashboardDto(result));
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/dashboards/{id}/home:
 *   put:
 *     summary: Marcar dashboard como home
 *     description: Marca un dashboard como el "home" del usuario en la organización. Solo puede haber uno por usuario+org.
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del dashboard
 *     responses:
 *       200:
 *         description: Dashboard marcado como home exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos (solo el owner)
 *       404:
 *         description: Dashboard no encontrado
 */
router.put('/:id/home', authenticate, enforceActiveOrganization, async (req, res, next) => {
    try {
        const result = await dashboardServices.setHomeDashboard(
            req.params.id,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, result);
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/dashboards/{id}:
 *   delete:
 *     summary: Eliminar un dashboard (soft delete)
 *     description: Elimina lógicamente un dashboard. Solo el propietario puede eliminar.
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard eliminado exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Dashboard no encontrado
 */
router.delete('/:id', authenticate, enforceActiveOrganization, requireRole(['system-admin', 'org-admin']), validate(deleteDashboardSchema), async (req, res, next) => {
    try {
        await dashboardServices.deleteDashboard(
            req.params.id,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, { message: 'Dashboard eliminado exitosamente' });
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// =============================================
// RUTAS DE PÁGINAS (anidadas bajo dashboards)
// =============================================

// Listar páginas de un dashboard
router.get('/:dashboardId/pages', authenticate, enforceActiveOrganization, async (req, res, next) => {
    try {
        const pages = await dashboardServices.listPages(req.params.dashboardId, req.user.userId);

        return successResponse(res, pages.map(toPublicPageDto));
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Crear una página en un dashboard
router.post('/:dashboardId/pages', authenticate, enforceActiveOrganization, validate(createPageSchema), async (req, res, next) => {
    try {
        const page = await dashboardServices.createPage(
            req.params.dashboardId,
            req.body,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, toPublicPageDto(page), 201);
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Actualizar una página
router.patch('/:dashboardId/pages/:pageId', authenticate, enforceActiveOrganization, validate(updatePageSchema), async (req, res, next) => {
    try {
        const page = await dashboardServices.updatePage(
            req.params.dashboardId,
            req.params.pageId,
            req.body,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, toPublicPageDto(page));
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Eliminar una página
router.delete('/:dashboardId/pages/:pageId', authenticate, enforceActiveOrganization, validate(deletePageSchema), async (req, res, next) => {
    try {
        await dashboardServices.deletePage(
            req.params.dashboardId,
            req.params.pageId,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, { message: 'Página eliminada exitosamente' });
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// =============================================
// RUTAS DE WIDGETS (anidadas bajo páginas)
// =============================================

// Crear un widget en una página
router.post('/:dashboardId/pages/:pageId/widgets', authenticate, enforceActiveOrganization, validate(createWidgetSchema), async (req, res, next) => {
    try {
        const widget = await dashboardServices.createWidget(
            req.params.dashboardId,
            req.params.pageId,
            req.body,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, toPublicWidgetDto(widget), 201);
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Actualizar un widget
router.patch('/:dashboardId/pages/:pageId/widgets/:widgetId', authenticate, enforceActiveOrganization, validate(updateWidgetSchema), async (req, res, next) => {
    try {
        const widget = await dashboardServices.updateWidget(
            req.params.dashboardId,
            req.params.pageId,
            req.params.widgetId,
            req.body,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, toPublicWidgetDto(widget));
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Eliminar un widget
router.delete('/:dashboardId/pages/:pageId/widgets/:widgetId', authenticate, enforceActiveOrganization, validate(deleteWidgetSchema), async (req, res, next) => {
    try {
        await dashboardServices.deleteWidget(
            req.params.dashboardId,
            req.params.pageId,
            req.params.widgetId,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, { message: 'Widget eliminado exitosamente' });
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// =============================================
// RUTAS DE DATA SOURCES (fuentes de datos de widgets)
// =============================================

// Crear una fuente de datos para un widget
router.post('/widgets/:widgetId/data-sources', authenticate, enforceActiveOrganization, validate(createDataSourceSchema), async (req, res, next) => {
    try {
        const dataSource = await dashboardServices.createDataSource(
            req.params.widgetId,
            req.body,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, toPublicDataSourceDto(dataSource), 201);
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Actualizar una fuente de datos
router.patch('/widgets/:widgetId/data-sources/:dataSourceId', authenticate, enforceActiveOrganization, validate(updateDataSourceSchema), async (req, res, next) => {
    try {
        const dataSource = await dashboardServices.updateDataSource(
            req.params.widgetId,
            req.params.dataSourceId,
            req.body,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, toPublicDataSourceDto(dataSource));
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Eliminar una fuente de datos
router.delete('/widgets/:widgetId/data-sources/:dataSourceId', authenticate, enforceActiveOrganization, validate(deleteDataSourceSchema), async (req, res, next) => {
    try {
        await dashboardServices.deleteDataSource(
            req.params.widgetId,
            req.params.dataSourceId,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, { message: 'Fuente de datos eliminada exitosamente' });
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// =============================================
// RUTAS DE COLABORADORES DE DASHBOARD
// =============================================

// Listar colaboradores de un dashboard
router.get('/:id/collaborators', authenticate, enforceActiveOrganization, async (req, res, next) => {
    try {
        const dashboard = await dashboardServices.getDashboard(req.params.id, req.user.userId);
        const collaborators = dashboard.collaborators || [];

        return successResponse(res, collaborators.map(toPublicCollaboratorDto));
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Agregar un colaborador a un dashboard
router.post('/:id/collaborators', authenticate, enforceActiveOrganization, validate(addCollaboratorSchema), async (req, res, next) => {
    try {
        const collaborator = await dashboardServices.addDashboardCollaborator(
            req.params.id,
            req.body.userId,
            req.body.role,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, collaborator, 201);
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Actualizar el rol de un colaborador
router.patch('/:id/collaborators/:collaboratorId', authenticate, enforceActiveOrganization, validate(updateCollaboratorSchema), async (req, res, next) => {
    try {
        const collaborator = await dashboardServices.updateDashboardCollaborator(
            req.params.id,
            req.params.collaboratorId,
            req.body.role,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, collaborator);
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Remover un colaborador de un dashboard
router.delete('/:id/collaborators/:collaboratorId', authenticate, enforceActiveOrganization, validate(removeCollaboratorSchema), async (req, res, next) => {
    try {
        await dashboardServices.removeDashboardCollaborator(
            req.params.id,
            req.params.collaboratorId,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, { message: 'Colaborador removido exitosamente' });
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// =============================================
// RUTAS DE GRUPOS DE DASHBOARDS (groupRouter)
// Montado en /api/v1/dashboard-groups
// =============================================

/**
 * @swagger
 * /api/v1/dashboard-groups:
 *   get:
 *     summary: Listar grupos de dashboards con paginación y filtros
 *     tags: [Dashboard Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de grupos obtenida exitosamente
 *       401:
 *         description: No autenticado
 */
groupRouter.get('/', authenticate, enforceActiveOrganization, validate(getGroupsSchema), async (req, res, next) => {
    try {
        const orgId = req.organizationContext.id;
        const result = await dashboardServices.listGroups(orgId, req.query, req.user.userId);

        return successResponse(res, toPublicGroupDtoList(result.items), 200, {
            total: result.total,
            limit: result.limit,
            offset: result.offset
        });
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/dashboard-groups/{id}:
 *   get:
 *     summary: Obtener un grupo de dashboards por publicCode
 *     tags: [Dashboard Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Grupo obtenido exitosamente
 *       404:
 *         description: Grupo no encontrado
 */
groupRouter.get('/:id', authenticate, enforceActiveOrganization, validate(getGroupByIdSchema), async (req, res, next) => {
    try {
        const group = await dashboardServices.getGroup(req.params.id, req.user.userId);

        return successResponse(res, toPublicGroupDto(group));
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/dashboard-groups:
 *   post:
 *     summary: Crear un nuevo grupo de dashboards
 *     tags: [Dashboard Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Grupo creado exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 */
groupRouter.post('/', authenticate, enforceActiveOrganization, requireRole(['system-admin', 'org-admin']), validate(createGroupSchema), async (req, res, next) => {
    try {
        const result = await dashboardServices.createGroup(
            req.body,
            req.user.userId,
            req.organizationContext.id,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, toPublicGroupDto(result), 201);
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/dashboard-groups/{id}:
 *   patch:
 *     summary: Actualizar un grupo de dashboards
 *     tags: [Dashboard Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Grupo actualizado exitosamente
 *       404:
 *         description: Grupo no encontrado
 */
groupRouter.patch('/:id', authenticate, enforceActiveOrganization, validate(updateGroupSchema), async (req, res, next) => {
    try {
        const result = await dashboardServices.updateGroup(
            req.params.id,
            req.body,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, toPublicGroupDto(result));
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/dashboard-groups/{id}:
 *   delete:
 *     summary: Eliminar un grupo de dashboards (soft delete)
 *     tags: [Dashboard Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Grupo eliminado exitosamente
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Grupo no encontrado
 */
groupRouter.delete('/:id', authenticate, enforceActiveOrganization, requireRole(['system-admin', 'org-admin']), validate(deleteGroupSchema), async (req, res, next) => {
    try {
        await dashboardServices.deleteGroup(
            req.params.id,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, { message: 'Grupo de dashboards eliminado exitosamente' });
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// --- Items de grupo (agregar/remover dashboards) ---

// Agregar un dashboard a un grupo
groupRouter.post('/:groupId/dashboards', authenticate, enforceActiveOrganization, validate(addGroupItemSchema), async (req, res, next) => {
    try {
        const result = await dashboardServices.addDashboardToGroup(
            req.params.groupId,
            req.body.dashboardId,
            req.body.orderIndex,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, result, 201);
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Remover un dashboard de un grupo
groupRouter.delete('/:groupId/dashboards/:dashboardId', authenticate, enforceActiveOrganization, validate(removeGroupItemSchema), async (req, res, next) => {
    try {
        await dashboardServices.removeDashboardFromGroup(
            req.params.groupId,
            req.params.dashboardId,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, { message: 'Dashboard removido del grupo exitosamente' });
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// --- Colaboradores de grupo ---

// Listar colaboradores de un grupo
groupRouter.get('/:id/collaborators', authenticate, enforceActiveOrganization, async (req, res, next) => {
    try {
        const group = await dashboardServices.getGroup(req.params.id, req.user.userId);
        const collaborators = group.collaborators || [];

        return successResponse(res, collaborators.map(toPublicGroupCollaboratorDto));
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Agregar un colaborador a un grupo
groupRouter.post('/:id/collaborators', authenticate, enforceActiveOrganization, validate(addCollaboratorSchema), async (req, res, next) => {
    try {
        const collaborator = await dashboardServices.addGroupCollaborator(
            req.params.id,
            req.body.userId,
            req.body.role,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, collaborator, 201);
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Actualizar el rol de un colaborador de grupo
groupRouter.patch('/:id/collaborators/:collaboratorId', authenticate, enforceActiveOrganization, validate(updateCollaboratorSchema), async (req, res, next) => {
    try {
        const collaborator = await dashboardServices.updateGroupCollaborator(
            req.params.id,
            req.params.collaboratorId,
            req.body.role,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, collaborator);
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

// Remover un colaborador de un grupo
groupRouter.delete('/:id/collaborators/:collaboratorId', authenticate, enforceActiveOrganization, validate(removeCollaboratorSchema), async (req, res, next) => {
    try {
        await dashboardServices.removeGroupCollaborator(
            req.params.id,
            req.params.collaboratorId,
            req.user.userId,
            req.ip,
            req.headers['user-agent']
        );

        return successResponse(res, { message: 'Colaborador removido del grupo exitosamente' });
    } catch (error) {
        if (error.status) {
            return errorResponse(res, {
                message: error.message,
                status: error.status,
                code: error.code
            });
        }
        next(error);
    }
});

export { router as dashboardRouter, groupRouter };
