// modules/dashboards/services.js
// Lógica de negocio para Dashboards, Pages, Widgets y DataSources

import { v7 as uuidv7 } from 'uuid';
import * as dashboardRepository from './repository.js';
import { cacheDashboardList, getCachedDashboardList, invalidateDashboardCache } from './cache.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import { generatePublicCode } from '../../utils/identifiers.js';
import { resolveDateRange } from '../../utils/dateUtils.js';
import { search as telemetrySearch } from '../telemetry/services/telemetryService.js';
import logger from '../../utils/logger.js';

export {
  listGroups, getGroup, createGroup, updateGroup, deleteGroup,
  addDashboardToGroup, removeDashboardFromGroup,
  addDashboardCollaborator, updateDashboardCollaborator, removeDashboardCollaborator,
  addGroupCollaborator, updateGroupCollaborator, removeGroupCollaborator
} from './groupServices.js';

// =============================================
// Helpers internos de acceso
// =============================================

/**
 * Verificar acceso del usuario a un dashboard
 * @param {Object} dashboard - Modelo Sequelize del dashboard
 * @param {string} userId - UUID del usuario
 * @param {string} requiredRole - Rol requerido: 'viewer' | 'editor'
 * @returns {Promise<{hasAccess: boolean, role: string}>}
 */
const checkDashboardAccess = async (dashboard, userId, requiredRole = 'viewer') => {
  if (dashboard.ownerId === userId) {
    return { hasAccess: true, role: 'owner' };
  }

  if (dashboard.isPublic && requiredRole === 'viewer') {
    return { hasAccess: true, role: 'viewer' };
  }

  const collaborator = await dashboardRepository.findCollaborator(dashboard.id, userId);

  if (!collaborator) {
    return { hasAccess: false, role: null };
  }

  if (requiredRole === 'viewer') {
    return { hasAccess: true, role: collaborator.role };
  }

  if (requiredRole === 'editor' && collaborator.role === 'editor') {
    return { hasAccess: true, role: 'editor' };
  }

  return { hasAccess: false, role: collaborator.role };
};

// =============================================
// Dashboard CRUD
// =============================================

/**
 * Listar dashboards con filtros, paginación y cache
 * @param {string} organizationId - UUID de la organización
 * @param {Object} query - Parámetros de búsqueda (search, isPublic, limit, offset)
 * @param {string} userId - UUID del usuario que consulta
 * @returns {Promise<Object>} - { items, total, limit, offset }
 */
export const listDashboards = async (organizationId, query = {}, userId) => {
  const { search, isPublic, limit = 20, offset = 0 } = query;

  const cacheKey = JSON.stringify({ organizationId, search, isPublic, limit, offset });

  const cached = await getCachedDashboardList(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await dashboardRepository.findAllDashboards({
    organizationId,
    isPublic,
    search,
    limit,
    offset
  });

  const response = {
    items: result.items,
    total: result.total,
    limit: parseInt(limit),
    offset: parseInt(offset)
  };

  await cacheDashboardList(cacheKey, response);

  return response;
};

/**
 * Obtener dashboard por publicCode con todas las relaciones
 * @param {string} publicCode - Public code del dashboard
 * @param {string} userId - UUID del usuario que consulta
 * @returns {Promise<Object>} - Dashboard serializado
 */
export const getDashboard = async (publicCode, userId) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCode(publicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  return dashboard;
};

/**
 * Crear un nuevo dashboard
 * @param {Object} dashboardData - Datos del dashboard
 * @param {string} userId - UUID del usuario que crea
 * @param {string} organizationId - UUID de la organización
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Dashboard creado
 */
export const createDashboard = async (dashboardData, userId, organizationId, ipAddress, userAgent) => {
  const uuid = uuidv7();
  const publicCode = generatePublicCode('DSH', uuid);

  const pageUuid = uuidv7();

  const dashboard = await dashboardRepository.createDashboardWithFirstPage({
    ...dashboardData,
    id: uuid,
    publicCode,
    ownerId: userId,
    organizationId,
    pageCount: 1
  }, {
    id: pageUuid,
    orderNumber: 1,
    orderIndex: 0,
    name: null
  });

  await logAuditAction({
    entityType: 'dashboard',
    entityId: publicCode,
    action: 'created',
    performedBy: userId,
    changes: { new: dashboard },
    metadata: {
      organizationId
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ dashboardId: uuid, userId }, 'Dashboard created successfully');

  return dashboard;
};

/**
 * Actualizar dashboard existente
 * @param {string} publicCode - Public code del dashboard
 * @param {Object} updateData - Datos a actualizar
 * @param {string} userId - UUID del usuario que actualiza
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Dashboard actualizado
 */
export const updateDashboard = async (publicCode, updateData, userId, ipAddress, userAgent) => {
  const dashboardInternal = await dashboardRepository.findDashboardByPublicCodeInternal(publicCode);

  if (!dashboardInternal) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  const access = await checkDashboardAccess(dashboardInternal, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const oldData = { ...dashboardInternal.dataValues };

  const updatedDashboard = await dashboardRepository.updateDashboard(dashboardInternal.id, updateData);

  const changes = {};
  Object.keys(updateData).forEach(key => {
    if (oldData[key] !== updateData[key]) {
      changes[key] = {
        old: oldData[key],
        new: updateData[key]
      };
    }
  });

  await logAuditAction({
    entityType: 'dashboard',
    entityId: publicCode,
    action: 'updated',
    performedBy: userId,
    changes,
    metadata: {
      organizationId: dashboardInternal.organizationId
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ dashboardId: dashboardInternal.id, userId }, 'Dashboard updated successfully');

  return updatedDashboard;
};

/**
 * Eliminar dashboard (soft delete)
 * Solo el owner puede eliminar un dashboard
 * @param {string} publicCode - Public code del dashboard
 * @param {string} userId - UUID del usuario que elimina
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<void>}
 */
export const deleteDashboard = async (publicCode, userId, ipAddress, userAgent) => {
  const dashboardInternal = await dashboardRepository.findDashboardByPublicCodeInternal(publicCode);

  if (!dashboardInternal) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  if (dashboardInternal.ownerId !== userId) {
    const error = new Error('Solo el propietario puede eliminar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  await dashboardRepository.deleteDashboard(dashboardInternal.id);

  await logAuditAction({
    entityType: 'dashboard',
    entityId: publicCode,
    action: 'deleted',
    performedBy: userId,
    metadata: {
      organizationId: dashboardInternal.organizationId,
      dashboardName: dashboardInternal.name
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ dashboardId: dashboardInternal.id, userId }, 'Dashboard deleted successfully');
};

/**
 * Marcar un dashboard como "home" para el usuario en la organización
 * Solo puede haber 1 home por usuario+org. El owner del dashboard es quien lo setea.
 * @param {string} publicCode - Public code del dashboard
 * @param {string} userId - UUID del usuario
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Dashboard actualizado
 */
export const setHomeDashboard = async (publicCode, userId, ipAddress, userAgent) => {
  const dashboardInternal = await dashboardRepository.findDashboardByPublicCodeInternal(publicCode);

  if (!dashboardInternal) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  if (dashboardInternal.ownerId !== userId) {
    const error = new Error('Solo el propietario puede marcar este dashboard como home');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const result = await dashboardRepository.setHomeDashboard(
    dashboardInternal.id,
    userId,
    dashboardInternal.organizationId
  );

  await logAuditAction({
    entityType: 'dashboard',
    entityId: publicCode,
    action: 'set_home',
    performedBy: userId,
    changes: { isHome: { old: false, new: true } },
    metadata: {
      organizationId: dashboardInternal.organizationId
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ dashboardId: dashboardInternal.id, userId }, 'Dashboard set as home');

  return result;
};

// =============================================
// Page CRUD
// =============================================

/**
 * Listar páginas de un dashboard
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {string} userId - UUID del usuario que consulta
 * @returns {Promise<Object[]>} - Lista de páginas
 */
export const listPages = async (dashboardPublicCode, userId) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  return await dashboardRepository.findPagesByDashboardId(dashboard.id);
};

/**
 * Crear una nueva página en un dashboard
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {Object} pageData - Datos de la página
 * @param {string} userId - UUID del usuario que crea
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Página creada
 */
export const createPage = async (dashboardPublicCode, pageData, userId, ipAddress, userAgent) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  const access = await checkDashboardAccess(dashboard, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const uuid = uuidv7();

  const page = await dashboardRepository.createPage({
    ...pageData,
    id: uuid,
    dashboardId: dashboard.id
  });

  await logAuditAction({
    entityType: 'dashboard_page',
    entityId: uuid,
    action: 'created',
    performedBy: userId,
    changes: { new: page },
    metadata: {
      dashboardId: dashboard.id,
      dashboardPublicCode
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ pageId: uuid, dashboardId: dashboard.id, userId }, 'Dashboard page created successfully');

  return page;
};

/**
 * Actualizar una página de un dashboard
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {number} pageOrderNumber - Número de orden de la página
 * @param {Object} pageData - Datos a actualizar
 * @param {string} userId - UUID del usuario que actualiza
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Página actualizada
 */
export const updatePage = async (dashboardPublicCode, pageOrderNumber, pageData, userId, ipAddress, userAgent) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  const access = await checkDashboardAccess(dashboard, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const page = await dashboardRepository.findPageByOrderNumber(dashboard.id, pageOrderNumber);

  if (!page) {
    const error = new Error('Página no encontrada');
    error.status = 404;
    error.code = 'PAGE_NOT_FOUND';
    throw error;
  }

  const oldData = { ...page.dataValues };

  const updatedPage = await dashboardRepository.updatePage(page.id, pageData);

  const changes = {};
  Object.keys(pageData).forEach(key => {
    if (oldData[key] !== pageData[key]) {
      changes[key] = {
        old: oldData[key],
        new: pageData[key]
      };
    }
  });

  await logAuditAction({
    entityType: 'dashboard_page',
    entityId: page.id,
    action: 'updated',
    performedBy: userId,
    changes,
    metadata: {
      dashboardId: dashboard.id,
      dashboardPublicCode,
      pageOrderNumber
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ pageId: page.id, dashboardId: dashboard.id, userId }, 'Dashboard page updated successfully');

  return updatedPage;
};

/**
 * Eliminar una página de un dashboard
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {number} pageOrderNumber - Número de orden de la página
 * @param {string} userId - UUID del usuario que elimina
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<void>}
 */
export const deletePage = async (dashboardPublicCode, pageOrderNumber, userId, ipAddress, userAgent) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  const access = await checkDashboardAccess(dashboard, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const page = await dashboardRepository.findPageByOrderNumber(dashboard.id, pageOrderNumber);

  if (!page) {
    const error = new Error('Página no encontrada');
    error.status = 404;
    error.code = 'PAGE_NOT_FOUND';
    throw error;
  }

  await dashboardRepository.deletePage(page.id);

  await logAuditAction({
    entityType: 'dashboard_page',
    entityId: page.id,
    action: 'deleted',
    performedBy: userId,
    metadata: {
      dashboardId: dashboard.id,
      dashboardPublicCode,
      pageName: page.name
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ pageId: page.id, dashboardId: dashboard.id, userId }, 'Dashboard page deleted successfully');
};

// =============================================
// Widget CRUD
// =============================================

/**
 * Crear un nuevo widget en una página
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {number} pageOrderNumber - Número de orden de la página
 * @param {Object} widgetData - Datos del widget
 * @param {string} userId - UUID del usuario que crea
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Widget creado
 */
export const createWidget = async (dashboardPublicCode, pageOrderNumber, widgetData, userId, ipAddress, userAgent) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  const access = await checkDashboardAccess(dashboard, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const page = await dashboardRepository.findPageByOrderNumber(dashboard.id, pageOrderNumber);

  if (!page) {
    const error = new Error('Página no encontrada');
    error.status = 404;
    error.code = 'PAGE_NOT_FOUND';
    throw error;
  }

  const uuid = uuidv7();

  const { dataSources: inlineDataSources, ...widgetFields } = widgetData;

  const hasDataSources = inlineDataSources && inlineDataSources.length > 0;

  let widget;

  if (hasDataSources) {
    const dsWithIds = inlineDataSources.map(ds => ({
      ...ds,
      id: uuidv7()
    }));
    widget = await dashboardRepository.createWidgetWithDataSources({
      ...widgetFields,
      id: uuid,
      dashboardPageId: page.id
    }, dsWithIds);
  } else {
    widget = await dashboardRepository.createWidget({
      ...widgetFields,
      id: uuid,
      dashboardPageId: page.id
    });
  }

  await logAuditAction({
    entityType: 'widget',
    entityId: uuid,
    action: 'created',
    performedBy: userId,
    changes: { new: widget },
    metadata: {
      dashboardId: dashboard.id,
      dashboardPublicCode,
      pageId: page.id,
      pageOrderNumber,
      dataSourceCount: hasDataSources ? inlineDataSources.length : 0
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ widgetId: uuid, pageOrderNumber, dashboardId: dashboard.id, userId }, 'Widget created successfully');

  return widget;
};

/**
 * Actualizar un widget
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {number} pageOrderNumber - Número de orden de la página
 * @param {number} widgetOrderNumber - Número de orden del widget
 * @param {Object} widgetData - Datos a actualizar
 * @param {string} userId - UUID del usuario que actualiza
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Widget actualizado
 */
export const updateWidget = async (dashboardPublicCode, pageOrderNumber, widgetOrderNumber, widgetData, userId, ipAddress, userAgent) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  const access = await checkDashboardAccess(dashboard, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const page = await dashboardRepository.findPageByOrderNumber(dashboard.id, pageOrderNumber);

  if (!page) {
    const error = new Error('Página no encontrada');
    error.status = 404;
    error.code = 'PAGE_NOT_FOUND';
    throw error;
  }

  const widget = await dashboardRepository.findWidgetByOrderNumber(page.id, widgetOrderNumber);

  if (!widget) {
    const error = new Error('Widget no encontrado');
    error.status = 404;
    error.code = 'WIDGET_NOT_FOUND';
    throw error;
  }

  const oldData = { ...widget.dataValues };

  const { dataSources: inlineDataSources, ...widgetFields } = widgetData;

  let updatedWidget;

  if (Object.keys(widgetFields).length > 0) {
    updatedWidget = await dashboardRepository.updateWidget(widget.id, widgetFields);
  } else {
    updatedWidget = widget;
  }

  if (inlineDataSources !== undefined) {
    const dsWithIds = inlineDataSources.map(ds => ({
      ...ds,
      id: uuidv7()
    }));
    updatedWidget = await dashboardRepository.replaceWidgetDataSources(widget.id, dsWithIds);
  }

  const changes = {};
  Object.keys(widgetFields).forEach(key => {
    if (oldData[key] !== widgetFields[key]) {
      changes[key] = {
        old: oldData[key],
        new: widgetFields[key]
      };
    }
  });

  if (inlineDataSources !== undefined) {
    changes.dataSources = {
      old: `${(oldData.dataSources || []).length} data sources`,
      new: `${inlineDataSources.length} data sources`
    };
  }

  await logAuditAction({
    entityType: 'widget',
    entityId: widget.id,
    action: 'updated',
    performedBy: userId,
    changes,
    metadata: {
      dashboardId: dashboard.id,
      dashboardPublicCode,
      pageOrderNumber,
      widgetOrderNumber
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ widgetId: widget.id, pageOrderNumber, dashboardId: dashboard.id, userId }, 'Widget updated successfully');

  return updatedWidget;
};

/**
 * Eliminar un widget
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {number} pageOrderNumber - Número de orden de la página
 * @param {number} widgetOrderNumber - Número de orden del widget
 * @param {string} userId - UUID del usuario que elimina
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<void>}
 */
export const deleteWidget = async (dashboardPublicCode, pageOrderNumber, widgetOrderNumber, userId, ipAddress, userAgent) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  const access = await checkDashboardAccess(dashboard, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const page = await dashboardRepository.findPageByOrderNumber(dashboard.id, pageOrderNumber);

  if (!page) {
    const error = new Error('Página no encontrada');
    error.status = 404;
    error.code = 'PAGE_NOT_FOUND';
    throw error;
  }

  const widget = await dashboardRepository.findWidgetByOrderNumber(page.id, widgetOrderNumber);

  if (!widget) {
    const error = new Error('Widget no encontrado');
    error.status = 404;
    error.code = 'WIDGET_NOT_FOUND';
    throw error;
  }

  await dashboardRepository.deleteWidget(widget.id);

  await logAuditAction({
    entityType: 'widget',
    entityId: widget.id,
    action: 'deleted',
    performedBy: userId,
    metadata: {
      dashboardId: dashboard.id,
      dashboardPublicCode,
      pageOrderNumber,
      widgetOrderNumber,
      widgetTitle: widget.title
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ widgetId: widget.id, pageOrderNumber, dashboardId: dashboard.id, userId }, 'Widget deleted successfully');
};

// =============================================
// DataSource CRUD
// =============================================

/**
 * Crear una nueva fuente de datos para un widget
 * @param {string} widgetId - UUID del widget
 * @param {Object} dataSourceData - Datos de la fuente
 * @param {string} userId - UUID del usuario que crea
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - DataSource creado
 */
export const createDataSource = async (widgetId, dataSourceData, userId, ipAddress, userAgent) => {
  const widget = await dashboardRepository.findWidgetById(widgetId);

  if (!widget) {
    const error = new Error('Widget no encontrado');
    error.status = 404;
    error.code = 'WIDGET_NOT_FOUND';
    throw error;
  }

  const uuid = uuidv7();

  const dataSource = await dashboardRepository.createDataSource({
    ...dataSourceData,
    id: uuid,
    widgetId
  });

  await logAuditAction({
    entityType: 'widget_data_source',
    entityId: uuid,
    action: 'created',
    performedBy: userId,
    changes: { new: dataSource },
    metadata: {
      widgetId
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ dataSourceId: uuid, widgetId, userId }, 'Widget data source created successfully');

  return dataSource;
};

/**
 * Actualizar una fuente de datos
 * @param {string} widgetId - UUID del widget
 * @param {string} dataSourceId - UUID de la fuente de datos
 * @param {Object} data - Datos a actualizar
 * @param {string} userId - UUID del usuario que actualiza
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - DataSource actualizado
 */
export const updateDataSource = async (widgetId, dataSourceId, data, userId, ipAddress, userAgent) => {
  const widget = await dashboardRepository.findWidgetById(widgetId);

  if (!widget) {
    const error = new Error('Widget no encontrado');
    error.status = 404;
    error.code = 'WIDGET_NOT_FOUND';
    throw error;
  }

  const dataSources = await dashboardRepository.findDataSourcesByWidgetId(widgetId);
  const existingDs = dataSources.find(ds => ds.id === dataSourceId);

  if (!existingDs) {
    const error = new Error('Fuente de datos no encontrada o no pertenece al widget');
    error.status = 404;
    error.code = 'DATA_SOURCE_NOT_FOUND';
    throw error;
  }

  const updatedDataSource = await dashboardRepository.updateDataSource(dataSourceId, data);

  await logAuditAction({
    entityType: 'widget_data_source',
    entityId: dataSourceId,
    action: 'updated',
    performedBy: userId,
    changes: { new: data },
    metadata: {
      widgetId
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ dataSourceId, widgetId, userId }, 'Widget data source updated successfully');

  return updatedDataSource;
};

/**
 * Eliminar una fuente de datos
 * @param {string} widgetId - UUID del widget
 * @param {string} dataSourceId - UUID de la fuente de datos
 * @param {string} userId - UUID del usuario que elimina
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<void>}
 */
export const deleteDataSource = async (widgetId, dataSourceId, userId, ipAddress, userAgent) => {
  const widget = await dashboardRepository.findWidgetById(widgetId);

  if (!widget) {
    const error = new Error('Widget no encontrado');
    error.status = 404;
    error.code = 'WIDGET_NOT_FOUND';
    throw error;
  }

  const dataSources = await dashboardRepository.findDataSourcesByWidgetId(widgetId);
  const existingDs = dataSources.find(ds => ds.id === dataSourceId);

  if (!existingDs) {
    const error = new Error('Fuente de datos no encontrada o no pertenece al widget');
    error.status = 404;
    error.code = 'DATA_SOURCE_NOT_FOUND';
    throw error;
  }

  await dashboardRepository.deleteDataSource(dataSourceId);

  await logAuditAction({
    entityType: 'widget_data_source',
    entityId: dataSourceId,
    action: 'deleted',
    performedBy: userId,
    metadata: {
      widgetId
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ dataSourceId, widgetId, userId }, 'Widget data source deleted successfully');
};

// =============================================
// Widget Type Analytics
// =============================================

export const getWidgetTypeUsage = async (organizationId) => {
  return await dashboardRepository.countWidgetTypeUsage(organizationId);
};

// =============================================
// Widget Data (Obtener datos de telemetría)
// =============================================

/**
 * Obtener datos de un widget consultando telemetría para cada dataSource
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {number} pageOrderNumber - Número de orden de la página
 * @param {number} widgetOrderNumber - Número de orden del widget
 * @param {Object} overrides - Overrides opcionales sobre dataConfig del widget
 * @param {string} userId - UUID del usuario
 * @returns {Promise<Object>} - Widget info + series de datos por dataSource
 */
export const getWidgetData = async (dashboardPublicCode, pageOrderNumber, widgetOrderNumber, overrides, userId) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  const access = await checkDashboardAccess(dashboard, userId, 'viewer');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para ver este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const page = await dashboardRepository.findPageByOrderNumber(dashboard.id, pageOrderNumber);

  if (!page) {
    const error = new Error('Página no encontrada');
    error.status = 404;
    error.code = 'PAGE_NOT_FOUND';
    throw error;
  }

  const widget = await dashboardRepository.findWidgetByOrderNumber(page.id, widgetOrderNumber);

  if (!widget) {
    const error = new Error('Widget no encontrado');
    error.status = 404;
    error.code = 'WIDGET_NOT_FOUND';
    throw error;
  }

  const savedConfig = widget.dataConfig || {};
  const mergedConfig = { ...savedConfig, ...overrides };

  const { dateRange, from: customFrom, to: customTo, resolution, tz, variables } = mergedConfig;

  if (!dateRange) {
    const error = new Error('No se encontró dateRange en la configuración del widget ni en los overrides');
    error.status = 400;
    error.code = 'MISSING_DATE_RANGE';
    throw error;
  }

  const resolvedDates = resolveDateRange(dateRange, { tz, from: customFrom, to: customTo });

  const dataSources = widget.dataSources || [];

  if (dataSources.length === 0) {
    return {
      widget: {
        type: widget.type,
        title: widget.title,
        dataConfig: mergedConfig
      },
      resolvedDates,
      series: []
    };
  }

  const seriesPromises = dataSources.map(async (ds) => {
    const dsPlain = ds.toJSON ? ds.toJSON() : ds;
    const base = {
      orderNumber: dsPlain.orderNumber,
      label: dsPlain.label,
      entityType: dsPlain.entityType,
      entityId: dsPlain.entityId
    };

    if (dsPlain.entityType !== 'channel') {
      return {
        ...base,
        success: false,
        error: `entityType "${dsPlain.entityType}" no soportado aún — solo "channel" está implementado`
      };
    }

    try {
      const searchParams = {
        identifier: dsPlain.entityId,
        from: resolvedDates.from,
        to: resolvedDates.to,
        resolution: resolution || '1m',
        tz: tz || undefined,
        variables: variables || (dsPlain.seriesConfig?.variables) || null,
        filters: {}
      };

      const result = await telemetrySearch(searchParams);

      return {
        ...base,
        success: true,
        metadata: result.metadata,
        variables: result.variables,
        data: result.data
      };
    } catch (err) {
      logger.warn({ dataSourceId: dsPlain.id, entityId: dsPlain.entityId, error: err.message }, 'Error al consultar telemetría para dataSource');
      return {
        ...base,
        success: false,
        error: err.message
      };
    }
  });

  const series = await Promise.all(seriesPromises);

  return {
    widget: {
      type: widget.type,
      title: widget.title,
      dataConfig: mergedConfig
    },
    resolvedDates,
    series
  };
};
