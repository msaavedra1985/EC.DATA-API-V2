// modules/dashboards/groupServices.js
// Lógica de negocio para Groups, Group Items y Collaborators (Dashboard + Group)

import { v7 as uuidv7 } from 'uuid';
import * as dashboardRepository from './repository.js';
import { cacheGroupList, getCachedGroupList, invalidateGroupCache, invalidateDashboardCache } from './cache.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import { generatePublicCode } from '../../utils/identifiers.js';
import User from '../auth/models/User.js';
import logger from '../../utils/logger.js';

// =============================================
// Helpers internos de acceso
// =============================================

/**
 * Verificar acceso del usuario a un grupo de dashboards
 * @param {Object} group - Modelo Sequelize del grupo
 * @param {string} userId - UUID del usuario
 * @param {string} requiredRole - Rol requerido: 'viewer' | 'editor'
 * @returns {Promise<{hasAccess: boolean, role: string}>}
 */
export const checkGroupAccess = async (group, userId, requiredRole = 'viewer') => {
  if (group.ownerId === userId) {
    return { hasAccess: true, role: 'owner' };
  }

  const collaborator = await dashboardRepository.findGroupCollaborator(group.id, userId);

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
// Group CRUD
// =============================================

/**
 * Listar grupos de dashboards con filtros, paginación y cache
 * @param {string} organizationId - UUID de la organización
 * @param {Object} query - Parámetros de búsqueda (search, limit, offset)
 * @param {string} userId - UUID del usuario que consulta
 * @returns {Promise<Object>} - { items, total, limit, offset }
 */
export const listGroups = async (organizationId, query = {}, userId) => {
  const { search, limit = 20, offset = 0 } = query;

  const cacheKey = JSON.stringify({ organizationId, search, limit, offset });

  const cached = await getCachedGroupList(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await dashboardRepository.findAllGroups({
    organizationId,
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

  await cacheGroupList(cacheKey, response);

  return response;
};

/**
 * Obtener grupo por publicCode con todas las relaciones
 * @param {string} publicCode - Public code del grupo
 * @param {string} userId - UUID del usuario que consulta
 * @returns {Promise<Object>} - Grupo serializado
 */
export const getGroup = async (publicCode, userId) => {
  const group = await dashboardRepository.findGroupByPublicCode(publicCode);

  if (!group) {
    const error = new Error('Grupo de dashboards no encontrado');
    error.status = 404;
    error.code = 'GROUP_NOT_FOUND';
    throw error;
  }

  return group;
};

/**
 * Crear un nuevo grupo de dashboards
 * @param {Object} groupData - Datos del grupo
 * @param {string} userId - UUID del usuario que crea
 * @param {string} organizationId - UUID de la organización
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Grupo creado
 */
export const createGroup = async (groupData, userId, organizationId, ipAddress, userAgent) => {
  const uuid = uuidv7();
  const publicCode = generatePublicCode('DGR', uuid);

  const group = await dashboardRepository.createGroup({
    ...groupData,
    id: uuid,
    publicCode,
    ownerId: userId,
    organizationId
  });

  await logAuditAction({
    entityType: 'dashboard_group',
    entityId: publicCode,
    action: 'created',
    performedBy: userId,
    changes: { new: group },
    metadata: {
      organizationId
    },
    ipAddress,
    userAgent
  });

  await invalidateGroupCache();

  logger.info({ groupId: uuid, userId }, 'Dashboard group created successfully');

  return group;
};

/**
 * Actualizar grupo de dashboards
 * @param {string} publicCode - Public code del grupo
 * @param {Object} updateData - Datos a actualizar
 * @param {string} userId - UUID del usuario que actualiza
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Grupo actualizado
 */
export const updateGroup = async (publicCode, updateData, userId, ipAddress, userAgent) => {
  const groupInternal = await dashboardRepository.findGroupByPublicCodeInternal(publicCode);

  if (!groupInternal) {
    const error = new Error('Grupo de dashboards no encontrado');
    error.status = 404;
    error.code = 'GROUP_NOT_FOUND';
    throw error;
  }

  const access = await checkGroupAccess(groupInternal, userId, 'editor');
  if (!access.hasAccess) {
    const error = new Error('No tienes permisos para editar este grupo');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const oldData = { ...groupInternal.dataValues };

  const updatedGroup = await dashboardRepository.updateGroup(groupInternal.id, updateData);

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
    entityType: 'dashboard_group',
    entityId: publicCode,
    action: 'updated',
    performedBy: userId,
    changes,
    metadata: {
      organizationId: groupInternal.organizationId
    },
    ipAddress,
    userAgent
  });

  await invalidateGroupCache();

  logger.info({ groupId: groupInternal.id, userId }, 'Dashboard group updated successfully');

  return updatedGroup;
};

/**
 * Eliminar grupo de dashboards (soft delete)
 * Solo el owner puede eliminar un grupo
 * @param {string} publicCode - Public code del grupo
 * @param {string} userId - UUID del usuario que elimina
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<void>}
 */
export const deleteGroup = async (publicCode, userId, ipAddress, userAgent) => {
  const groupInternal = await dashboardRepository.findGroupByPublicCodeInternal(publicCode);

  if (!groupInternal) {
    const error = new Error('Grupo de dashboards no encontrado');
    error.status = 404;
    error.code = 'GROUP_NOT_FOUND';
    throw error;
  }

  if (groupInternal.ownerId !== userId) {
    const error = new Error('Solo el propietario puede eliminar este grupo');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  await dashboardRepository.deleteGroup(groupInternal.id);

  await logAuditAction({
    entityType: 'dashboard_group',
    entityId: publicCode,
    action: 'deleted',
    performedBy: userId,
    metadata: {
      organizationId: groupInternal.organizationId,
      groupName: groupInternal.name
    },
    ipAddress,
    userAgent
  });

  await invalidateGroupCache();

  logger.info({ groupId: groupInternal.id, userId }, 'Dashboard group deleted successfully');
};

// =============================================
// Group Items (Dashboard ↔ Group)
// =============================================

/**
 * Agregar un dashboard a un grupo
 * @param {string} groupPublicCode - Public code del grupo
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {number} orderIndex - Índice de orden dentro del grupo
 * @param {string} userId - UUID del usuario que realiza la acción
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Relación creada
 */
export const addDashboardToGroup = async (groupPublicCode, dashboardPublicCode, orderIndex, userId, ipAddress, userAgent) => {
  const group = await dashboardRepository.findGroupByPublicCodeInternal(groupPublicCode);

  if (!group) {
    const error = new Error('Grupo de dashboards no encontrado');
    error.status = 404;
    error.code = 'GROUP_NOT_FOUND';
    throw error;
  }

  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  if (group.organizationId !== dashboard.organizationId) {
    const error = new Error('El dashboard y el grupo deben pertenecer a la misma organización');
    error.status = 400;
    error.code = 'ORGANIZATION_MISMATCH';
    throw error;
  }

  const existing = await dashboardRepository.findGroupItem(group.id, dashboard.id);
  if (existing) {
    const error = new Error('El dashboard ya está en este grupo');
    error.status = 409;
    error.code = 'ALREADY_IN_GROUP';
    throw error;
  }

  const groupItem = await dashboardRepository.addDashboardToGroup({
    id: uuidv7(),
    dashboardGroupId: group.id,
    dashboardId: dashboard.id,
    orderIndex: orderIndex || 0
  });

  await logAuditAction({
    entityType: 'dashboard_group_item',
    entityId: groupItem.id,
    action: 'created',
    performedBy: userId,
    metadata: {
      groupId: group.id,
      groupPublicCode,
      dashboardId: dashboard.id,
      dashboardPublicCode
    },
    ipAddress,
    userAgent
  });

  await invalidateGroupCache();

  logger.info({ groupId: group.id, dashboardId: dashboard.id, userId }, 'Dashboard added to group successfully');

  return groupItem;
};

/**
 * Remover un dashboard de un grupo
 * @param {string} groupPublicCode - Public code del grupo
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {string} userId - UUID del usuario que realiza la acción
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<void>}
 */
export const removeDashboardFromGroup = async (groupPublicCode, dashboardPublicCode, userId, ipAddress, userAgent) => {
  const group = await dashboardRepository.findGroupByPublicCodeInternal(groupPublicCode);

  if (!group) {
    const error = new Error('Grupo de dashboards no encontrado');
    error.status = 404;
    error.code = 'GROUP_NOT_FOUND';
    throw error;
  }

  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  const removed = await dashboardRepository.removeDashboardFromGroup(group.id, dashboard.id);

  if (!removed) {
    const error = new Error('El dashboard no está en este grupo');
    error.status = 404;
    error.code = 'GROUP_ITEM_NOT_FOUND';
    throw error;
  }

  await logAuditAction({
    entityType: 'dashboard_group_item',
    entityId: `${group.id}:${dashboard.id}`,
    action: 'deleted',
    performedBy: userId,
    metadata: {
      groupId: group.id,
      groupPublicCode,
      dashboardId: dashboard.id,
      dashboardPublicCode
    },
    ipAddress,
    userAgent
  });

  await invalidateGroupCache();

  logger.info({ groupId: group.id, dashboardId: dashboard.id, userId }, 'Dashboard removed from group successfully');
};

// =============================================
// Collaborators (Dashboard)
// =============================================

/**
 * Agregar un colaborador a un dashboard
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {string} userPublicCode - Public code del usuario a agregar
 * @param {string} role - Rol del colaborador ('viewer' | 'editor')
 * @param {string} userId - UUID del usuario que realiza la acción
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Colaborador creado
 */
export const addDashboardCollaborator = async (dashboardPublicCode, userPublicCode, role, userId, ipAddress, userAgent) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  const targetUser = await User.findOne({ where: { publicCode: userPublicCode } });

  if (!targetUser) {
    const error = new Error('Usuario no encontrado');
    error.status = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  if (targetUser.id === dashboard.ownerId) {
    const error = new Error('No se puede agregar al propietario como colaborador');
    error.status = 400;
    error.code = 'CANNOT_ADD_OWNER';
    throw error;
  }

  const existing = await dashboardRepository.findCollaborator(dashboard.id, targetUser.id);
  if (existing) {
    const error = new Error('El usuario ya es colaborador de este dashboard');
    error.status = 409;
    error.code = 'ALREADY_COLLABORATOR';
    throw error;
  }

  const collaborator = await dashboardRepository.addCollaborator({
    id: uuidv7(),
    dashboardId: dashboard.id,
    userId: targetUser.id,
    role
  });

  await logAuditAction({
    entityType: 'dashboard_collaborator',
    entityId: collaborator.id,
    action: 'created',
    performedBy: userId,
    metadata: {
      dashboardId: dashboard.id,
      dashboardPublicCode,
      targetUserId: targetUser.id,
      targetUserPublicCode: userPublicCode,
      role
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ dashboardId: dashboard.id, targetUserId: targetUser.id, role, userId }, 'Dashboard collaborator added successfully');

  return collaborator;
};

/**
 * Actualizar el rol de un colaborador de dashboard
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {string} collaboratorId - UUID del colaborador
 * @param {string} role - Nuevo rol ('viewer' | 'editor')
 * @param {string} userId - UUID del usuario que realiza la acción
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Colaborador actualizado
 */
export const updateDashboardCollaborator = async (dashboardPublicCode, collaboratorId, role, userId, ipAddress, userAgent) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  const updatedCollaborator = await dashboardRepository.updateCollaborator(collaboratorId, { role });

  if (!updatedCollaborator) {
    const error = new Error('Colaborador no encontrado');
    error.status = 404;
    error.code = 'COLLABORATOR_NOT_FOUND';
    throw error;
  }

  await logAuditAction({
    entityType: 'dashboard_collaborator',
    entityId: collaboratorId,
    action: 'updated',
    performedBy: userId,
    changes: { role: { new: role } },
    metadata: {
      dashboardId: dashboard.id,
      dashboardPublicCode
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ collaboratorId, dashboardId: dashboard.id, role, userId }, 'Dashboard collaborator updated successfully');

  return updatedCollaborator;
};

/**
 * Remover un colaborador de un dashboard
 * @param {string} dashboardPublicCode - Public code del dashboard
 * @param {string} collaboratorId - UUID del colaborador
 * @param {string} userId - UUID del usuario que realiza la acción
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<void>}
 */
export const removeDashboardCollaborator = async (dashboardPublicCode, collaboratorId, userId, ipAddress, userAgent) => {
  const dashboard = await dashboardRepository.findDashboardByPublicCodeInternal(dashboardPublicCode);

  if (!dashboard) {
    const error = new Error('Dashboard no encontrado');
    error.status = 404;
    error.code = 'DASHBOARD_NOT_FOUND';
    throw error;
  }

  const removed = await dashboardRepository.removeCollaborator(collaboratorId);

  if (!removed) {
    const error = new Error('Colaborador no encontrado');
    error.status = 404;
    error.code = 'COLLABORATOR_NOT_FOUND';
    throw error;
  }

  await logAuditAction({
    entityType: 'dashboard_collaborator',
    entityId: collaboratorId,
    action: 'deleted',
    performedBy: userId,
    metadata: {
      dashboardId: dashboard.id,
      dashboardPublicCode
    },
    ipAddress,
    userAgent
  });

  await invalidateDashboardCache();

  logger.info({ collaboratorId, dashboardId: dashboard.id, userId }, 'Dashboard collaborator removed successfully');
};

// =============================================
// Collaborators (Group)
// =============================================

/**
 * Agregar un colaborador a un grupo de dashboards
 * @param {string} groupPublicCode - Public code del grupo
 * @param {string} userPublicCode - Public code del usuario a agregar
 * @param {string} role - Rol del colaborador ('viewer' | 'editor')
 * @param {string} userId - UUID del usuario que realiza la acción
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Colaborador creado
 */
export const addGroupCollaborator = async (groupPublicCode, userPublicCode, role, userId, ipAddress, userAgent) => {
  const group = await dashboardRepository.findGroupByPublicCodeInternal(groupPublicCode);

  if (!group) {
    const error = new Error('Grupo de dashboards no encontrado');
    error.status = 404;
    error.code = 'GROUP_NOT_FOUND';
    throw error;
  }

  const targetUser = await User.findOne({ where: { publicCode: userPublicCode } });

  if (!targetUser) {
    const error = new Error('Usuario no encontrado');
    error.status = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  if (targetUser.id === group.ownerId) {
    const error = new Error('No se puede agregar al propietario como colaborador');
    error.status = 400;
    error.code = 'CANNOT_ADD_OWNER';
    throw error;
  }

  const existing = await dashboardRepository.findGroupCollaborator(group.id, targetUser.id);
  if (existing) {
    const error = new Error('El usuario ya es colaborador de este grupo');
    error.status = 409;
    error.code = 'ALREADY_COLLABORATOR';
    throw error;
  }

  const collaborator = await dashboardRepository.addGroupCollaborator({
    id: uuidv7(),
    dashboardGroupId: group.id,
    userId: targetUser.id,
    role
  });

  await logAuditAction({
    entityType: 'dashboard_group_collaborator',
    entityId: collaborator.id,
    action: 'created',
    performedBy: userId,
    metadata: {
      groupId: group.id,
      groupPublicCode,
      targetUserId: targetUser.id,
      targetUserPublicCode: userPublicCode,
      role
    },
    ipAddress,
    userAgent
  });

  await invalidateGroupCache();

  logger.info({ groupId: group.id, targetUserId: targetUser.id, role, userId }, 'Group collaborator added successfully');

  return collaborator;
};

/**
 * Actualizar el rol de un colaborador de grupo
 * @param {string} groupPublicCode - Public code del grupo
 * @param {string} collaboratorId - UUID del colaborador
 * @param {string} role - Nuevo rol ('viewer' | 'editor')
 * @param {string} userId - UUID del usuario que realiza la acción
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Colaborador actualizado
 */
export const updateGroupCollaborator = async (groupPublicCode, collaboratorId, role, userId, ipAddress, userAgent) => {
  const group = await dashboardRepository.findGroupByPublicCodeInternal(groupPublicCode);

  if (!group) {
    const error = new Error('Grupo de dashboards no encontrado');
    error.status = 404;
    error.code = 'GROUP_NOT_FOUND';
    throw error;
  }

  const updatedCollaborator = await dashboardRepository.updateGroupCollaborator(collaboratorId, { role });

  if (!updatedCollaborator) {
    const error = new Error('Colaborador no encontrado');
    error.status = 404;
    error.code = 'COLLABORATOR_NOT_FOUND';
    throw error;
  }

  await logAuditAction({
    entityType: 'dashboard_group_collaborator',
    entityId: collaboratorId,
    action: 'updated',
    performedBy: userId,
    changes: { role: { new: role } },
    metadata: {
      groupId: group.id,
      groupPublicCode
    },
    ipAddress,
    userAgent
  });

  await invalidateGroupCache();

  logger.info({ collaboratorId, groupId: group.id, role, userId }, 'Group collaborator updated successfully');

  return updatedCollaborator;
};

/**
 * Remover un colaborador de un grupo
 * @param {string} groupPublicCode - Public code del grupo
 * @param {string} collaboratorId - UUID del colaborador
 * @param {string} userId - UUID del usuario que realiza la acción
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<void>}
 */
export const removeGroupCollaborator = async (groupPublicCode, collaboratorId, userId, ipAddress, userAgent) => {
  const group = await dashboardRepository.findGroupByPublicCodeInternal(groupPublicCode);

  if (!group) {
    const error = new Error('Grupo de dashboards no encontrado');
    error.status = 404;
    error.code = 'GROUP_NOT_FOUND';
    throw error;
  }

  const removed = await dashboardRepository.removeGroupCollaborator(collaboratorId);

  if (!removed) {
    const error = new Error('Colaborador no encontrado');
    error.status = 404;
    error.code = 'COLLABORATOR_NOT_FOUND';
    throw error;
  }

  await logAuditAction({
    entityType: 'dashboard_group_collaborator',
    entityId: collaboratorId,
    action: 'deleted',
    performedBy: userId,
    metadata: {
      groupId: group.id,
      groupPublicCode
    },
    ipAddress,
    userAgent
  });

  await invalidateGroupCache();

  logger.info({ collaboratorId, groupId: group.id, userId }, 'Group collaborator removed successfully');
};
