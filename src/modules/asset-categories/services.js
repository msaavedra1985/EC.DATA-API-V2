import sequelize from '../../db/sql/sequelize.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import * as repository from './repository.js';

/**
 * Servicios para AssetCategory
 * Lógica de negocio para gestión de categorías de activos (tags)
 */

/**
 * Crear una nueva categoría de organización
 * 
 * @param {Object} data - Datos de la categoría
 * @param {string} data.name - Nombre de la categoría
 * @param {string} data.color - Color hex (opcional)
 * @param {number} data.parent_id - ID del padre (opcional)
 * @param {Object} context - Contexto de sesión
 * @param {string} context.organization_id - UUID de la organización
 * @param {string} context.user_id - UUID del usuario que crea
 * @returns {Promise<Object>} Categoría creada
 */
export const createOrganizationCategory = async (data, context) => {
  const transaction = await sequelize.transaction();

  try {
    // Validar que el padre exista y pertenezca a la misma organización
    if (data.parent_id) {
      const parentExists = await repository.categoryBelongsToOrganization(
        data.parent_id,
        context.organization_id
      );
      if (!parentExists) {
        throw new Error('La categoría padre no existe o no pertenece a esta organización');
      }
    }

    const category = await repository.createCategory({
      name: data.name,
      color: data.color || '#6B7280',
      parent_id: data.parent_id || null,
      scope: 'organization',
      organization_id: context.organization_id
    }, transaction);

    // Audit log
    await logAuditAction({
      entityType: 'asset_category',
      entityId: category.id.toString(),
      action: 'created',
      performedBy: context.user_id,
      changes: { name: { old: null, new: category.name } },
      metadata: { scope: 'organization', organization_id: context.organization_id }
    });

    await transaction.commit();

    // Refetch para obtener el path generado
    return repository.findCategoryById(category.id, { includeParent: true });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Crear una nueva categoría personal de usuario
 * 
 * @param {Object} data - Datos de la categoría
 * @param {Object} context - Contexto de sesión
 * @returns {Promise<Object>} Categoría creada
 */
export const createUserCategory = async (data, context) => {
  const transaction = await sequelize.transaction();

  try {
    // Validar que el padre exista y pertenezca al mismo usuario
    if (data.parent_id) {
      const parentExists = await repository.categoryBelongsToUser(
        data.parent_id,
        context.user_id
      );
      if (!parentExists) {
        throw new Error('La categoría padre no existe o no es tuya');
      }
    }

    const category = await repository.createCategory({
      name: data.name,
      color: data.color || '#6B7280',
      parent_id: data.parent_id || null,
      scope: 'user',
      user_id: context.user_id
    }, transaction);

    // Audit log
    await logAuditAction({
      entityType: 'asset_category',
      entityId: category.id.toString(),
      action: 'created',
      performedBy: context.user_id,
      changes: { name: { old: null, new: category.name } },
      metadata: { scope: 'user', user_id: context.user_id }
    });

    await transaction.commit();

    return repository.findCategoryById(category.id, { includeParent: true });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Obtener todas las categorías de una organización
 * 
 * @param {string} organizationId - UUID de la organización
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<Object[]>} Lista de categorías
 */
export const getOrganizationCategories = async (organizationId, options = {}) => {
  const categories = await repository.findCategoriesByOrganization(organizationId, {
    includeParent: true,
    ...options
  });

  return categories.map(serializeCategory);
};

/**
 * Obtener categorías personales de un usuario
 * 
 * @param {string} userId - UUID del usuario
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<Object[]>} Lista de categorías
 */
export const getUserCategories = async (userId, options = {}) => {
  const categories = await repository.findCategoriesByUser(userId, {
    includeParent: true,
    ...options
  });

  return categories.map(serializeCategory);
};

/**
 * Obtener todas las categorías visibles para un usuario
 * (organizacionales + personales)
 * 
 * @param {string} organizationId - UUID de la organización
 * @param {string} userId - UUID del usuario
 * @returns {Promise<Object[]>} Lista de categorías agrupadas
 */
export const getAllVisibleCategories = async (organizationId, userId) => {
  const categories = await repository.findAllVisibleCategories(organizationId, userId, {
    includeParent: true
  });

  return categories.map(serializeCategory);
};

/**
 * Obtener una categoría por ID con validación de acceso
 * 
 * @param {number} categoryId - ID de la categoría
 * @param {Object} context - Contexto de sesión
 * @returns {Promise<Object|null>} Categoría o null
 */
export const getCategoryById = async (categoryId, context) => {
  const hasAccess = await repository.userHasAccessToCategory(
    categoryId,
    context.organization_id,
    context.user_id
  );

  if (!hasAccess) {
    return null;
  }

  const category = await repository.findCategoryById(categoryId, { includeParent: true });
  return category ? serializeCategory(category) : null;
};

/**
 * Obtener el árbol jerárquico de una categoría (ancestros + categoría + descendientes)
 * 
 * @param {number} categoryId - ID de la categoría
 * @param {Object} context - Contexto de sesión
 * @returns {Promise<Object>} Árbol con ancestros, categoría actual y descendientes
 */
export const getCategoryTree = async (categoryId, context) => {
  const hasAccess = await repository.userHasAccessToCategory(
    categoryId,
    context.organization_id,
    context.user_id
  );

  if (!hasAccess) {
    return null;
  }

  const [category, ancestors, descendants] = await Promise.all([
    repository.findCategoryById(categoryId),
    repository.getAncestors(categoryId),
    repository.getDescendants(categoryId)
  ]);

  if (!category) return null;

  return {
    ancestors: ancestors.map(serializeCategory),
    current: serializeCategory(category),
    descendants: descendants.map(serializeCategory),
    breadcrumb: [...ancestors, category].map(c => ({ id: c.id, name: c.name }))
  };
};

/**
 * Actualizar una categoría
 * 
 * @param {number} categoryId - ID de la categoría
 * @param {Object} data - Datos a actualizar
 * @param {Object} context - Contexto de sesión
 * @returns {Promise<Object|null>} Categoría actualizada
 */
export const updateCategory = async (categoryId, data, context) => {
  const transaction = await sequelize.transaction();

  try {
    const category = await repository.findCategoryById(categoryId, { transaction });
    if (!category) {
      await transaction.rollback();
      return null;
    }

    // Validar acceso
    const hasAccess = category.scope === 'organization'
      ? category.organization_id === context.organization_id
      : category.user_id === context.user_id;

    if (!hasAccess) {
      await transaction.rollback();
      return null;
    }

    // Si cambia parent_id, validar que el nuevo padre sea válido
    if (data.parent_id !== undefined && data.parent_id !== category.parent_id) {
      if (data.parent_id !== null) {
        const parentValid = category.scope === 'organization'
          ? await repository.categoryBelongsToOrganization(data.parent_id, context.organization_id)
          : await repository.categoryBelongsToUser(data.parent_id, context.user_id);

        if (!parentValid) {
          throw new Error('La categoría padre no es válida');
        }

        // Evitar ciclos: no permitir que un descendiente sea padre
        const descendantIds = await repository.getCategoryAndDescendantIds(categoryId);
        if (descendantIds.includes(data.parent_id)) {
          throw new Error('No se puede mover una categoría a uno de sus descendientes');
        }
      }
    }

    const oldData = {
      name: category.name,
      color: category.color,
      parent_id: category.parent_id
    };

    const updated = await repository.updateCategory(categoryId, {
      name: data.name !== undefined ? data.name : category.name,
      color: data.color !== undefined ? data.color : category.color,
      parent_id: data.parent_id !== undefined ? data.parent_id : category.parent_id
    }, transaction);

    // Audit log
    const changes = {};
    if (data.name && data.name !== oldData.name) {
      changes.name = { old: oldData.name, new: data.name };
    }
    if (data.color && data.color !== oldData.color) {
      changes.color = { old: oldData.color, new: data.color };
    }
    if (data.parent_id !== undefined && data.parent_id !== oldData.parent_id) {
      changes.parent_id = { old: oldData.parent_id, new: data.parent_id };
    }

    if (Object.keys(changes).length > 0) {
      await logAuditAction({
        entityType: 'asset_category',
        entityId: categoryId.toString(),
        action: 'updated',
        performedBy: context.user_id,
        changes,
        metadata: { scope: category.scope }
      });
    }

    await transaction.commit();

    return repository.findCategoryById(categoryId, { includeParent: true })
      .then(c => c ? serializeCategory(c) : null);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Desactivar una categoría (soft delete)
 * También desactiva todos los descendientes
 * 
 * @param {number} categoryId - ID de la categoría
 * @param {Object} context - Contexto de sesión
 * @returns {Promise<{success: boolean, deactivated: number}>}
 */
export const deactivateCategory = async (categoryId, context) => {
  const category = await repository.findCategoryById(categoryId);
  if (!category) {
    return { success: false, deactivated: 0 };
  }

  // Validar acceso
  const hasAccess = category.scope === 'organization'
    ? category.organization_id === context.organization_id
    : category.user_id === context.user_id;

  if (!hasAccess) {
    return { success: false, deactivated: 0 };
  }

  const transaction = await sequelize.transaction();

  try {
    const result = await repository.deactivateCategory(categoryId, transaction);

    // Audit log
    await logAuditAction({
      entityType: 'asset_category',
      entityId: categoryId.toString(),
      action: 'deleted',
      performedBy: context.user_id,
      changes: { is_active: { old: true, new: false } },
      metadata: { 
        scope: category.scope,
        descendants_deactivated: result.deactivated - 1
      }
    });

    await transaction.commit();

    return { success: true, deactivated: result.deactivated };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Obtener IDs de categoría y todos sus descendientes
 * Útil para filtrar canales por categoría incluyendo subcategorías
 * 
 * @param {number} categoryId - ID de la categoría
 * @returns {Promise<number[]>}
 */
export const getCategoryAndDescendantIds = async (categoryId) => {
  return repository.getCategoryAndDescendantIds(categoryId);
};

/**
 * Serializar categoría para respuesta API
 * Omite campos internos y formatea según convenciones del proyecto
 * 
 * @param {Object} category - Instancia de AssetCategory
 * @returns {Object} Categoría serializada
 */
const serializeCategory = (category) => {
  const data = category.toJSON ? category.toJSON() : category;

  return {
    id: data.id,
    name: data.name,
    color: data.color,
    level: data.level,
    path: data.path,
    parent_id: data.parent_id,
    scope: data.scope,
    is_active: data.is_active,
    parent: data.parent ? {
      id: data.parent.id,
      name: data.parent.name,
      color: data.parent.color,
      level: data.parent.level
    } : null,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

export default {
  createOrganizationCategory,
  createUserCategory,
  getOrganizationCategories,
  getUserCategories,
  getAllVisibleCategories,
  getCategoryById,
  getCategoryTree,
  updateCategory,
  deactivateCategory,
  getCategoryAndDescendantIds
};
