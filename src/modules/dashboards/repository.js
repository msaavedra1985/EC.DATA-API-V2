// modules/dashboards/repository.js
// Capa de acceso a datos para Dashboards

import Dashboard from './models/Dashboard.js';
import DashboardPage from './models/DashboardPage.js';
import Widget from './models/Widget.js';
import WidgetDataSource from './models/WidgetDataSource.js';
import DashboardGroup from './models/DashboardGroup.js';
import DashboardGroupItem from './models/DashboardGroupItem.js';
import DashboardCollaborator from './models/DashboardCollaborator.js';
import DashboardGroupCollaborator from './models/DashboardGroupCollaborator.js';
import Organization from '../organizations/models/Organization.js';
import User from '../auth/models/User.js';
import { Op } from 'sequelize';
import sequelize from '../../db/sql/sequelize.js';

// --- Includes comunes ---

const organizationInclude = {
    model: Organization,
    as: 'organization',
    attributes: ['id', 'publicCode', 'slug', 'name', 'logoUrl']
};

const ownerInclude = {
    model: User,
    as: 'owner',
    attributes: ['id', 'publicCode', 'email', 'firstName', 'lastName']
};

const userInclude = {
    model: User,
    as: 'user',
    attributes: ['id', 'publicCode', 'email', 'firstName', 'lastName']
};

const dataSourceInclude = {
    model: WidgetDataSource,
    as: 'dataSources'
};

const widgetWithDataSourcesInclude = {
    model: Widget,
    as: 'widgets',
    include: [dataSourceInclude]
};

const pageWithWidgetsInclude = {
    model: DashboardPage,
    as: 'pages',
    include: [widgetWithDataSourcesInclude],
    order: [['orderIndex', 'ASC']]
};

const collaboratorWithUserInclude = {
    model: DashboardCollaborator,
    as: 'collaborators',
    include: [userInclude]
};

const groupCollaboratorWithUserInclude = {
    model: DashboardGroupCollaborator,
    as: 'collaborators',
    include: [userInclude]
};

const dashboardListIncludes = [organizationInclude, ownerInclude];

const dashboardFullIncludes = [
    organizationInclude,
    ownerInclude,
    pageWithWidgetsInclude,
    collaboratorWithUserInclude
];

const groupListIncludes = [organizationInclude, ownerInclude];

const groupFullIncludes = [
    organizationInclude,
    ownerInclude,
    {
        model: Dashboard,
        as: 'dashboards',
        attributes: ['id', 'publicCode', 'name', 'description'],
        through: { attributes: ['orderIndex'] }
    },
    groupCollaboratorWithUserInclude
];

// =============================================
// Dashboard CRUD
// =============================================

export const findAllDashboards = async ({
    organizationId,
    ownerId,
    isPublic,
    search,
    limit = 20,
    offset = 0
}) => {
    const where = {};

    if (organizationId !== undefined && organizationId !== null) {
        where.organizationId = organizationId;
    }

    if (ownerId !== undefined && ownerId !== null) {
        where.ownerId = ownerId;
    }

    if (isPublic !== undefined && isPublic !== null) {
        where.isPublic = isPublic;
    }

    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const { count, rows } = await Dashboard.findAndCountAll({
        where,
        include: dashboardListIncludes,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
    });

    return {
        items: rows,
        total: count
    };
};

export const findDashboardByPublicCode = async (publicCode) => {
    return await Dashboard.findOne({
        where: { publicCode },
        include: dashboardFullIncludes
    });
};

export const findDashboardByPublicCodeInternal = async (publicCode) => {
    return await Dashboard.findOne({
        where: { publicCode },
        include: [organizationInclude]
    });
};

export const findDashboardById = async (id) => {
    return await Dashboard.findByPk(id, {
        include: [organizationInclude]
    });
};

export const createDashboard = async (data) => {
    const dashboard = await Dashboard.create(data);
    await dashboard.reload({ include: dashboardListIncludes });
    return dashboard;
};

export const updateDashboard = async (id, data) => {
    const dashboard = await Dashboard.findByPk(id);

    if (!dashboard) {
        return null;
    }

    await dashboard.update(data);
    await dashboard.reload({ include: dashboardListIncludes });
    return dashboard;
};

export const deleteDashboard = async (id) => {
    const dashboard = await Dashboard.findByPk(id);

    if (!dashboard) {
        return false;
    }

    await dashboard.destroy();
    return true;
};

/**
 * Desmarcar todos los dashboards home de un usuario en una organización
 * y marcar el indicado como home
 */
export const setHomeDashboard = async (dashboardId, userId, organizationId) => {
    return await sequelize.transaction(async (t) => {
        await Dashboard.update(
            { isHome: false },
            {
                where: {
                    ownerId: userId,
                    organizationId: organizationId,
                    isHome: true
                },
                transaction: t
            }
        );

        const dashboard = await Dashboard.findByPk(dashboardId, { transaction: t });
        if (!dashboard) return null;

        await dashboard.update({ isHome: true }, { transaction: t });
        await dashboard.reload({ include: dashboardListIncludes, transaction: t });
        return dashboard;
    });
};

// =============================================
// Page CRUD
// =============================================

export const findPagesByDashboardId = async (dashboardId) => {
    const pages = await DashboardPage.findAll({
        where: { dashboardId },
        include: [widgetWithDataSourcesInclude],
        order: [['orderIndex', 'ASC']]
    });

    return pages;
};

export const findPageById = async (pageId) => {
    return await DashboardPage.findByPk(pageId, {
        include: [widgetWithDataSourcesInclude]
    });
};

export const createPage = async (data) => {
    const page = await DashboardPage.create(data);
    return page;
};

export const updatePage = async (pageId, data) => {
    const page = await DashboardPage.findByPk(pageId);

    if (!page) {
        return null;
    }

    await page.update(data);
    return page;
};

export const deletePage = async (pageId) => {
    const page = await DashboardPage.findByPk(pageId);

    if (!page) {
        return false;
    }

    await page.destroy({ force: true });
    return true;
};

// =============================================
// Widget CRUD
// =============================================

export const findWidgetsByPageId = async (pageId) => {
    const widgets = await Widget.findAll({
        where: { dashboardPageId: pageId },
        include: [dataSourceInclude],
        order: [['orderIndex', 'ASC']]
    });

    return widgets;
};

export const findWidgetById = async (widgetId) => {
    return await Widget.findByPk(widgetId, {
        include: [dataSourceInclude]
    });
};

export const createWidget = async (data) => {
    const widget = await Widget.create(data);
    await widget.reload({ include: [dataSourceInclude] });
    return widget;
};

export const updateWidget = async (widgetId, data) => {
    const widget = await Widget.findByPk(widgetId);

    if (!widget) {
        return null;
    }

    await widget.update(data);
    await widget.reload({ include: [dataSourceInclude] });
    return widget;
};

export const deleteWidget = async (widgetId) => {
    const widget = await Widget.findByPk(widgetId);

    if (!widget) {
        return false;
    }

    await widget.destroy({ force: true });
    return true;
};

// =============================================
// DataSource CRUD
// =============================================

export const findDataSourcesByWidgetId = async (widgetId) => {
    const dataSources = await WidgetDataSource.findAll({
        where: { widgetId },
        order: [['orderIndex', 'ASC']]
    });

    return dataSources;
};

export const createDataSource = async (data) => {
    const dataSource = await WidgetDataSource.create(data);
    return dataSource;
};

export const updateDataSource = async (dataSourceId, data) => {
    const dataSource = await WidgetDataSource.findByPk(dataSourceId);

    if (!dataSource) {
        return null;
    }

    await dataSource.update(data);
    return dataSource;
};

export const deleteDataSource = async (dataSourceId) => {
    const dataSource = await WidgetDataSource.findByPk(dataSourceId);

    if (!dataSource) {
        return false;
    }

    await dataSource.destroy({ force: true });
    return true;
};

// =============================================
// Group CRUD
// =============================================

export const findAllGroups = async ({
    organizationId,
    search,
    limit = 20,
    offset = 0
}) => {
    const where = {};

    if (organizationId !== undefined && organizationId !== null) {
        where.organizationId = organizationId;
    }

    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const { count, rows } = await DashboardGroup.findAndCountAll({
        where,
        include: groupListIncludes,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
    });

    return {
        items: rows,
        total: count
    };
};

export const findGroupByPublicCode = async (publicCode) => {
    return await DashboardGroup.findOne({
        where: { publicCode },
        include: groupFullIncludes
    });
};

export const findGroupByPublicCodeInternal = async (publicCode) => {
    return await DashboardGroup.findOne({
        where: { publicCode },
        include: [organizationInclude]
    });
};

export const findGroupById = async (id) => {
    return await DashboardGroup.findByPk(id, {
        include: [organizationInclude]
    });
};

export const createGroup = async (data) => {
    const group = await DashboardGroup.create(data);
    await group.reload({ include: groupListIncludes });
    return group;
};

export const updateGroup = async (id, data) => {
    const group = await DashboardGroup.findByPk(id);

    if (!group) {
        return null;
    }

    await group.update(data);
    await group.reload({ include: groupListIncludes });
    return group;
};

export const deleteGroup = async (id) => {
    const group = await DashboardGroup.findByPk(id);

    if (!group) {
        return false;
    }

    await group.destroy();
    return true;
};

// =============================================
// Group Items
// =============================================

export const addDashboardToGroup = async (data) => {
    return await DashboardGroupItem.create(data);
};

export const removeDashboardFromGroup = async (groupId, dashboardId) => {
    const item = await DashboardGroupItem.findOne({
        where: {
            dashboardGroupId: groupId,
            dashboardId: dashboardId
        }
    });

    if (!item) {
        return false;
    }

    await item.destroy({ force: true });
    return true;
};

export const findGroupItem = async (groupId, dashboardId) => {
    return await DashboardGroupItem.findOne({
        where: {
            dashboardGroupId: groupId,
            dashboardId: dashboardId
        }
    });
};

// =============================================
// Collaborators (Dashboard)
// =============================================

export const findCollaboratorsByDashboardId = async (dashboardId) => {
    const collaborators = await DashboardCollaborator.findAll({
        where: { dashboardId },
        include: [userInclude]
    });

    return collaborators;
};

export const addCollaborator = async (data) => {
    const collaborator = await DashboardCollaborator.create(data);
    await collaborator.reload({ include: [userInclude] });
    return collaborator;
};

export const updateCollaborator = async (collaboratorId, data) => {
    const collaborator = await DashboardCollaborator.findByPk(collaboratorId);

    if (!collaborator) {
        return null;
    }

    await collaborator.update(data);
    await collaborator.reload({ include: [userInclude] });
    return collaborator;
};

export const removeCollaborator = async (collaboratorId) => {
    const collaborator = await DashboardCollaborator.findByPk(collaboratorId);

    if (!collaborator) {
        return false;
    }

    await collaborator.destroy({ force: true });
    return true;
};

export const findCollaborator = async (dashboardId, userId) => {
    return await DashboardCollaborator.findOne({
        where: {
            dashboardId,
            userId
        },
        include: [userInclude]
    });
};

// =============================================
// Collaborators (Group)
// =============================================

export const findGroupCollaboratorsByGroupId = async (groupId) => {
    const collaborators = await DashboardGroupCollaborator.findAll({
        where: { dashboardGroupId: groupId },
        include: [userInclude]
    });

    return collaborators;
};

export const addGroupCollaborator = async (data) => {
    const collaborator = await DashboardGroupCollaborator.create(data);
    await collaborator.reload({ include: [userInclude] });
    return collaborator;
};

export const updateGroupCollaborator = async (collaboratorId, data) => {
    const collaborator = await DashboardGroupCollaborator.findByPk(collaboratorId);

    if (!collaborator) {
        return null;
    }

    await collaborator.update(data);
    await collaborator.reload({ include: [userInclude] });
    return collaborator;
};

export const removeGroupCollaborator = async (collaboratorId) => {
    const collaborator = await DashboardGroupCollaborator.findByPk(collaboratorId);

    if (!collaborator) {
        return false;
    }

    await collaborator.destroy({ force: true });
    return true;
};

export const findGroupCollaborator = async (groupId, userId) => {
    return await DashboardGroupCollaborator.findOne({
        where: {
            dashboardGroupId: groupId,
            userId
        },
        include: [userInclude]
    });
};
