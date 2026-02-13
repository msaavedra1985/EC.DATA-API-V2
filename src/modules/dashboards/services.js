// modules/dashboards/services.js
// Lógica de negocio para Dashboards, Pages, Widgets y DataSources

import { v7 as uuidv7 } from 'uuid';
import * as dashboardRepository from './repository.js';
import { cacheDashboardList, getCachedDashboardList, invalidateDashboardCache } from './cache.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import { generatePublicCode } from '../../utils/identifiers.js';
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
  // El owner siempre tiene acceso total
  if (dashboard.owner_id === userId) {
    return { hasAccess: true, role: 'owner' };
  }

  // Si es público y solo se requiere viewer, tiene acceso
  if (dashboard.is_public && requiredRole === 'viewer') {
    return { hasAccess: true, role: 'viewer' };
  }

  // Buscar en colaboradores
  const collaborator = await dashboardRepository.findCollaborator(dashboard.id, userId);

  if (!collaborator) {
    return { hasAccess: false, role: null };
  }

  // Editor implica viewer
  if (requiredRole === 'viewer') {
    return { hasAccess: true, role: collaborator.role };
  }

  // Para editor, el colaborador debe tener rol editor
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
 * @param {Object} query - Parámetros de búsqueda (search, is_public, limit, offset)
 * @param {string} userId - UUID del usuario que consulta
 * @returns {Promise<Object>} - { items, total, limit, offset }
 */
export const listDashboards = async (organizationId, query = {}, userId) => {
  const { search, is_public, limit = 20, offset = 0 } = query;

  // Generar cache key basada en organización + filtros
  const cacheKey = JSON.stringify({ organizationId, search, is_public, limit, offset });

  // Intentar obtener del cache
  const cached = await getCachedDashboardList(cacheKey);
  if (cached) {
    return cached;
  }

  // Obtener de BD
  const result = await dashboardRepository.findAllDashboards({
    organizationId,
    isPublic: is_public,
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

  // Cachear resultado
  await cacheDashboardList(cacheKey, response);

  return response;
};

/**
 * Obtener dashboard por public_code con todas las relaciones
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
  // Generar identificadores
  const uuid = uuidv7();
  const publicCode = generatePublicCode('DSH', uuid);

  // Crear dashboard
  const dashboard = await dashboardRepository.createDashboard({
    ...dashboardData,
    id: uuid,
    public_code: publicCode,
    owner_id: userId,
    organization_id: organizationId
  });

  // Audit log
  await logAuditAction({
    entityType: 'dashboard',
    entityId: publicCode,
    action: 'created',
    performedBy: userId,
    changes: { new: dashboard },
    metadata: {
      organization_id: organizationId
    },
    ipAddress,
    userAgent
  });

  // Invalidar cache
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
  // Obtener dashboard actual
  const dashboardInternal = await dashboardRepository.findDashboardByPublicCodeInternal(publicCode);

  if (!dashboardInternal) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  // Verificar que el usuario tiene acceso de edición
  const access = await checkDashboardAccess(dashboardInternal, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Guardar estado anterior para audit
  const oldData = { ...dashboardInternal.dataValues };

  // Actualizar dashboard
  const updatedDashboard = await dashboardRepository.updateDashboard(dashboardInternal.id, updateData);

  // Construir cambios para auditoría
  const changes = {};
  Object.keys(updateData).forEach(key => {
    if (oldData[key] !== updateData[key]) {
      changes[key] = {
        old: oldData[key],
        new: updateData[key]
      };
    }
  });

  // Audit log
  await logAuditAction({
    entityType: 'dashboard',
    entityId: publicCode,
    action: 'updated',
    performedBy: userId,
    changes,
    metadata: {
      organization_id: dashboardInternal.organization_id
    },
    ipAddress,
    userAgent
  });

  // Invalidar cache
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
  // Obtener dashboard actual
  const dashboardInternal = await dashboardRepository.findDashboardByPublicCodeInternal(publicCode);

  if (!dashboardInternal) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  // Solo el owner puede eliminar
  if (dashboardInternal.owner_id !== userId) {
    const error = new Error('Solo el propietario puede eliminar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Soft delete via repository
  await dashboardRepository.deleteDashboard(dashboardInternal.id);

  // Audit log
  await logAuditAction({
    entityType: 'dashboard',
    entityId: publicCode,
    action: 'deleted',
    performedBy: userId,
    metadata: {
      organization_id: dashboardInternal.organization_id,
      dashboard_name: dashboardInternal.name
    },
    ipAddress,
    userAgent
  });

  // Invalidar cache
  await invalidateDashboardCache();

  logger.info({ dashboardId: dashboardInternal.id, userId }, 'Dashboard deleted successfully');
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

  // Verificar acceso de edición
  const access = await checkDashboardAccess(dashboard, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Generar UUID
  const uuid = uuidv7();

  // Crear página
  const page = await dashboardRepository.createPage({
    ...pageData,
    id: uuid,
    dashboard_id: dashboard.id
  });

  // Audit log
  await logAuditAction({
    entityType: 'dashboard_page',
    entityId: uuid,
    action: 'created',
    performedBy: userId,
    changes: { new: page },
    metadata: {
      dashboard_id: dashboard.id,
      dashboard_public_code: dashboardPublicCode
    },
    ipAddress,
    userAgent
  });

  // Invalidar cache
  await invalidateDashboardCache();

  logger.info({ pageId: uuid, dashboardId: dashboard.id, userId }, 'Dashboard page created successfully');

  return page;
};

/**
 * Actualizar una página de un dashboard
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {string} pageId - UUID de la página
 * @param {Object} pageData - Datos a actualizar
 * @param {string} userId - UUID del usuario que actualiza
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Página actualizada
 */
export const updatePage = async (dashboardPublicCode, pageId, pageData, userId, ipAddress, userAgent) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  // Verificar acceso de edición
  const access = await checkDashboardAccess(dashboard, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Buscar página y verificar que pertenece al dashboard
  const page = await dashboardRepository.findPageById(pageId);

  if (!page) {
    const error = new Error('Página no encontrada');
    error.status = 404;
    error.code = 'PAGE_NOT_FOUND';
    throw error;
  }

  if (page.dashboard_id !== dashboard.id) {
    const error = new Error('La página no pertenece al dashboard especificado');
    error.status = 400;
    error.code = 'PAGE_DASHBOARD_MISMATCH';
    throw error;
  }

  // Guardar estado anterior para audit
  const oldData = { ...page.dataValues };

  // Actualizar página
  const updatedPage = await dashboardRepository.updatePage(pageId, pageData);

  // Construir cambios para auditoría
  const changes = {};
  Object.keys(pageData).forEach(key => {
    if (oldData[key] !== pageData[key]) {
      changes[key] = {
        old: oldData[key],
        new: pageData[key]
      };
    }
  });

  // Audit log
  await logAuditAction({
    entityType: 'dashboard_page',
    entityId: pageId,
    action: 'updated',
    performedBy: userId,
    changes,
    metadata: {
      dashboard_id: dashboard.id,
      dashboard_public_code: dashboardPublicCode
    },
    ipAddress,
    userAgent
  });

  // Invalidar cache
  await invalidateDashboardCache();

  logger.info({ pageId, dashboardId: dashboard.id, userId }, 'Dashboard page updated successfully');

  return updatedPage;
};

/**
 * Eliminar una página de un dashboard
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {string} pageId - UUID de la página
 * @param {string} userId - UUID del usuario que elimina
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<void>}
 */
export const deletePage = async (dashboardPublicCode, pageId, userId, ipAddress, userAgent) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  // Verificar acceso de edición
  const access = await checkDashboardAccess(dashboard, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Buscar página y verificar que pertenece al dashboard
  const page = await dashboardRepository.findPageById(pageId);

  if (!page) {
    const error = new Error('Página no encontrada');
    error.status = 404;
    error.code = 'PAGE_NOT_FOUND';
    throw error;
  }

  if (page.dashboard_id !== dashboard.id) {
    const error = new Error('La página no pertenece al dashboard especificado');
    error.status = 400;
    error.code = 'PAGE_DASHBOARD_MISMATCH';
    throw error;
  }

  // Eliminar página
  await dashboardRepository.deletePage(pageId);

  // Audit log
  await logAuditAction({
    entityType: 'dashboard_page',
    entityId: pageId,
    action: 'deleted',
    performedBy: userId,
    metadata: {
      dashboard_id: dashboard.id,
      dashboard_public_code: dashboardPublicCode,
      page_name: page.name
    },
    ipAddress,
    userAgent
  });

  // Invalidar cache
  await invalidateDashboardCache();

  logger.info({ pageId, dashboardId: dashboard.id, userId }, 'Dashboard page deleted successfully');
};

// =============================================
// Widget CRUD
// =============================================

/**
 * Crear un nuevo widget en una página
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {string} pageId - UUID de la página
 * @param {Object} widgetData - Datos del widget
 * @param {string} userId - UUID del usuario que crea
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Widget creado
 */
export const createWidget = async (dashboardPublicCode, pageId, widgetData, userId, ipAddress, userAgent) => {
  // Validar dashboard
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  // Verificar acceso de edición
  const access = await checkDashboardAccess(dashboard, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este dashboard');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Validar que la página pertenece al dashboard
  const page = await dashboardRepository.findPageById(pageId);

  if (!page) {
    const error = new Error('Página no encontrada');
    error.status = 404;
    error.code = 'PAGE_NOT_FOUND';
    throw error;
  }

  if (page.dashboard_id !== dashboard.id) {
    const error = new Error('La página no pertenece al dashboard especificado');
    error.status = 400;
    error.code = 'PAGE_DASHBOARD_MISMATCH';
    throw error;
  }

  // Generar UUID
  const uuid = uuidv7();

  // Crear widget
  const widget = await dashboardRepository.createWidget({
    ...widgetData,
    id: uuid,
    dashboard_page_id: pageId
  });

  // Audit log
  await logAuditAction({
    entityType: 'widget',
    entityId: uuid,
    action: 'created',
    performedBy: userId,
    changes: { new: widget },
    metadata: {
      dashboard_id: dashboard.id,
      dashboard_public_code: dashboardPublicCode,
      page_id: pageId
    },
    ipAddress,
    userAgent
  });

  // Invalidar cache
  await invalidateDashboardCache();

  logger.info({ widgetId: uuid, pageId, dashboardId: dashboard.id, userId }, 'Widget created successfully');

  return widget;
};

/**
 * Actualizar un widget
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {string} pageId - UUID de la página
 * @param {string} widgetId - UUID del widget
 * @param {Object} widgetData - Datos a actualizar
 * @param {string} userId - UUID del usuario que actualiza
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Widget actualizado
 */
export const updateWidget = async (dashboardPublicCode, pageId, widgetId, widgetData, userId, ipAddress, userAgent) => {
  // Validar cadena: dashboard → page → widget
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

  const page = await dashboardRepository.findPageById(pageId);

  if (!page) {
    const error = new Error('Página no encontrada');
    error.status = 404;
    error.code = 'PAGE_NOT_FOUND';
    throw error;
  }

  if (page.dashboard_id !== dashboard.id) {
    const error = new Error('La página no pertenece al dashboard especificado');
    error.status = 400;
    error.code = 'PAGE_DASHBOARD_MISMATCH';
    throw error;
  }

  const widget = await dashboardRepository.findWidgetById(widgetId);

  if (!widget) {
    const error = new Error('Widget no encontrado');
    error.status = 404;
    error.code = 'WIDGET_NOT_FOUND';
    throw error;
  }

  if (widget.dashboard_page_id !== pageId) {
    const error = new Error('El widget no pertenece a la página especificada');
    error.status = 400;
    error.code = 'WIDGET_PAGE_MISMATCH';
    throw error;
  }

  // Guardar estado anterior para audit
  const oldData = { ...widget.dataValues };

  // Actualizar widget
  const updatedWidget = await dashboardRepository.updateWidget(widgetId, widgetData);

  // Construir cambios para auditoría
  const changes = {};
  Object.keys(widgetData).forEach(key => {
    if (oldData[key] !== widgetData[key]) {
      changes[key] = {
        old: oldData[key],
        new: widgetData[key]
      };
    }
  });

  // Audit log
  await logAuditAction({
    entityType: 'widget',
    entityId: widgetId,
    action: 'updated',
    performedBy: userId,
    changes,
    metadata: {
      dashboard_id: dashboard.id,
      dashboard_public_code: dashboardPublicCode,
      page_id: pageId
    },
    ipAddress,
    userAgent
  });

  // Invalidar cache
  await invalidateDashboardCache();

  logger.info({ widgetId, pageId, dashboardId: dashboard.id, userId }, 'Widget updated successfully');

  return updatedWidget;
};

/**
 * Eliminar un widget
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {string} pageId - UUID de la página
 * @param {string} widgetId - UUID del widget
 * @param {string} userId - UUID del usuario que elimina
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<void>}
 */
export const deleteWidget = async (dashboardPublicCode, pageId, widgetId, userId, ipAddress, userAgent) => {
  // Validar cadena: dashboard → page → widget
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

  const page = await dashboardRepository.findPageById(pageId);

  if (!page) {
    const error = new Error('Página no encontrada');
    error.status = 404;
    error.code = 'PAGE_NOT_FOUND';
    throw error;
  }

  if (page.dashboard_id !== dashboard.id) {
    const error = new Error('La página no pertenece al dashboard especificado');
    error.status = 400;
    error.code = 'PAGE_DASHBOARD_MISMATCH';
    throw error;
  }

  const widget = await dashboardRepository.findWidgetById(widgetId);

  if (!widget) {
    const error = new Error('Widget no encontrado');
    error.status = 404;
    error.code = 'WIDGET_NOT_FOUND';
    throw error;
  }

  if (widget.dashboard_page_id !== pageId) {
    const error = new Error('El widget no pertenece a la página especificada');
    error.status = 400;
    error.code = 'WIDGET_PAGE_MISMATCH';
    throw error;
  }

  // Eliminar widget
  await dashboardRepository.deleteWidget(widgetId);

  // Audit log
  await logAuditAction({
    entityType: 'widget',
    entityId: widgetId,
    action: 'deleted',
    performedBy: userId,
    metadata: {
      dashboard_id: dashboard.id,
      dashboard_public_code: dashboardPublicCode,
      page_id: pageId,
      widget_title: widget.title
    },
    ipAddress,
    userAgent
  });

  // Invalidar cache
  await invalidateDashboardCache();

  logger.info({ widgetId, pageId, dashboardId: dashboard.id, userId }, 'Widget deleted successfully');
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
  // Validar que el widget existe
  const widget = await dashboardRepository.findWidgetById(widgetId);

  if (!widget) {
    const error = new Error('Widget no encontrado');
    error.status = 404;
    error.code = 'WIDGET_NOT_FOUND';
    throw error;
  }

  // Generar UUID
  const uuid = uuidv7();

  // Crear data source
  const dataSource = await dashboardRepository.createDataSource({
    ...dataSourceData,
    id: uuid,
    widget_id: widgetId
  });

  // Audit log
  await logAuditAction({
    entityType: 'widget_data_source',
    entityId: uuid,
    action: 'created',
    performedBy: userId,
    changes: { new: dataSource },
    metadata: {
      widget_id: widgetId
    },
    ipAddress,
    userAgent
  });

  // Invalidar cache
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
  // Validar que el widget existe
  const widget = await dashboardRepository.findWidgetById(widgetId);

  if (!widget) {
    const error = new Error('Widget no encontrado');
    error.status = 404;
    error.code = 'WIDGET_NOT_FOUND';
    throw error;
  }

  // Buscar data source y verificar que pertenece al widget
  const dataSources = await dashboardRepository.findDataSourcesByWidgetId(widgetId);
  const existingDs = dataSources.find(ds => ds.id === dataSourceId);

  if (!existingDs) {
    const error = new Error('Fuente de datos no encontrada o no pertenece al widget');
    error.status = 404;
    error.code = 'DATA_SOURCE_NOT_FOUND';
    throw error;
  }

  // Actualizar data source
  const updatedDataSource = await dashboardRepository.updateDataSource(dataSourceId, data);

  // Audit log
  await logAuditAction({
    entityType: 'widget_data_source',
    entityId: dataSourceId,
    action: 'updated',
    performedBy: userId,
    changes: { new: data },
    metadata: {
      widget_id: widgetId
    },
    ipAddress,
    userAgent
  });

  // Invalidar cache
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
  // Validar que el widget existe
  const widget = await dashboardRepository.findWidgetById(widgetId);

  if (!widget) {
    const error = new Error('Widget no encontrado');
    error.status = 404;
    error.code = 'WIDGET_NOT_FOUND';
    throw error;
  }

  // Verificar que el data source pertenece al widget
  const dataSources = await dashboardRepository.findDataSourcesByWidgetId(widgetId);
  const existingDs = dataSources.find(ds => ds.id === dataSourceId);

  if (!existingDs) {
    const error = new Error('Fuente de datos no encontrada o no pertenece al widget');
    error.status = 404;
    error.code = 'DATA_SOURCE_NOT_FOUND';
    throw error;
  }

  // Eliminar data source
  await dashboardRepository.deleteDataSource(dataSourceId);

  // Audit log
  await logAuditAction({
    entityType: 'widget_data_source',
    entityId: dataSourceId,
    action: 'deleted',
    performedBy: userId,
    metadata: {
      widget_id: widgetId
    },
    ipAddress,
    userAgent
  });

  // Invalidar cache
  await invalidateDashboardCache();

  logger.info({ dataSourceId, widgetId, userId }, 'Widget data source deleted successfully');
};
