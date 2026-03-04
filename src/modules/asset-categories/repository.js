import { Op } from 'sequelize';
import AssetCategory from './models/AssetCategory.js';

/**
 * Repository para AssetCategory
 * Maneja todas las operaciones de acceso a datos para categorías de activos
 */

/**
 * Crear una nueva categoría
 * 
 * @param {Object} data - Datos de la categoría
 * @param {string} data.name - Nombre de la categoría
 * @param {string} data.color - Color hex (opcional)
 * @param {number} data.parentId - ID del padre (opcional, null = raíz)
 * @param {string} data.scope - 'organization' o 'user'
 * @param {string} data.organizationId - UUID de la organización (si scope=organization)
 * @param {string} data.userId - UUID del usuario (si scope=user)
 * @param {Object} transaction - Transacción Sequelize (opcional)
 * @returns {Promise<AssetCategory>} Categoría creada
 */
export const createCategory = async (data, transaction = null) => {
  return AssetCategory.create(data, { transaction });
};

/**
 * Obtener categoría por ID
 * 
 * @param {number} id - ID de la categoría
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<AssetCategory|null>}
 */
export const findCategoryById = async (id, options = {}) => {
  return AssetCategory.findByPk(id, {
    include: options.includeParent ? [{
      model: AssetCategory,
      as: 'parent',
      attributes: ['id', 'name', 'color', 'level']
    }] : [],
    ...options
  });
};

/**
 * Obtener categorías de una organización (scope=organization)
 * 
 * @param {string} organizationId - UUID de la organización
 * @param {Object} options - Opciones de filtrado
 * @param {number} options.parentId - Filtrar por padre (null = solo raíces)
 * @param {boolean} options.activeOnly - Solo activas (default: true)
 * @returns {Promise<AssetCategory[]>}
 */
export const findCategoriesByOrganization = async (organizationId, options = {}) => {
  const where = {
    scope: 'organization',
    organizationId: organizationId
  };

  if (options.activeOnly !== false) {
    where.isActive = true;
  }

  // Si se especifica parentId, filtrar por padre
  if (options.parentId !== undefined) {
    where.parentId = options.parentId;
  }

  return AssetCategory.findAll({
    where,
    order: [['level', 'ASC'], ['name', 'ASC']],
    include: options.includeParent ? [{
      model: AssetCategory,
      as: 'parent',
      attributes: ['id', 'name', 'color', 'level']
    }] : []
  });
};

/**
 * Obtener categorías personales de un usuario (scope=user)
 * 
 * @param {string} userId - UUID del usuario
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<AssetCategory[]>}
 */
export const findCategoriesByUser = async (userId, options = {}) => {
  const where = {
    scope: 'user',
    userId: userId
  };

  if (options.activeOnly !== false) {
    where.isActive = true;
  }

  if (options.parentId !== undefined) {
    where.parentId = options.parentId;
  }

  return AssetCategory.findAll({
    where,
    order: [['level', 'ASC'], ['name', 'ASC']],
    include: options.includeParent ? [{
      model: AssetCategory,
      as: 'parent',
      attributes: ['id', 'name', 'color', 'level']
    }] : []
  });
};

/**
 * Obtener todas las categorías visibles para un usuario
 * (incluye categorías de org + personales)
 * 
 * @param {string} organizationId - UUID de la organización
 * @param {string} userId - UUID del usuario
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<AssetCategory[]>}
 */
export const findAllVisibleCategories = async (organizationId, userId, options = {}) => {
  const where = {
    [Op.or]: [
      { scope: 'organization', organizationId: organizationId },
      { scope: 'user', userId: userId }
    ]
  };

  if (options.activeOnly !== false) {
    where.isActive = true;
  }

  return AssetCategory.findAll({
    where,
    order: [['scope', 'ASC'], ['level', 'ASC'], ['name', 'ASC']],
    include: options.includeParent ? [{
      model: AssetCategory,
      as: 'parent',
      attributes: ['id', 'name', 'color', 'level']
    }] : []
  });
};

/**
 * Actualizar una categoría
 * 
 * @param {number} id - ID de la categoría
 * @param {Object} data - Datos a actualizar
 * @param {Object} transaction - Transacción Sequelize (opcional)
 * @returns {Promise<AssetCategory|null>}
 */
export const updateCategory = async (id, data, transaction = null) => {
  const category = await AssetCategory.findByPk(id, { transaction });
  if (!category) return null;

  return category.update(data, { transaction });
};

/**
 * Desactivar una categoría (soft delete)
 * También desactiva todos los descendientes
 * 
 * @param {number} id - ID de la categoría
 * @param {Object} transaction - Transacción Sequelize (opcional)
 * @returns {Promise<{deactivated: number}>}
 */
export const deactivateCategory = async (id, transaction = null) => {
  const category = await AssetCategory.findByPk(id, { transaction });
  if (!category) return { deactivated: 0 };

  // Desactivar la categoría y todos sus descendientes usando el path
  const [deactivated] = await AssetCategory.update(
    { isActive: false },
    {
      where: {
        path: { [Op.like]: `${category.path}%` }
      },
      transaction
    }
  );

  return { deactivated };
};

/**
 * Reactivar una categoría
 * 
 * @param {number} id - ID de la categoría
 * @param {Object} transaction - Transacción Sequelize (opcional)
 * @returns {Promise<AssetCategory|null>}
 */
export const reactivateCategory = async (id, transaction = null) => {
  return updateCategory(id, { isActive: true }, transaction);
};

/**
 * Obtener descendientes de una categoría
 * Usa el path materializado para búsqueda eficiente
 * 
 * @param {number} categoryId - ID de la categoría
 * @returns {Promise<AssetCategory[]>}
 */
export const getDescendants = async (categoryId) => {
  const category = await AssetCategory.findByPk(categoryId, {
    attributes: ['id', 'path']
  });

  if (!category || !category.path) return [];

  return AssetCategory.findAll({
    where: {
      path: { [Op.like]: `${category.path}%` },
      id: { [Op.ne]: categoryId },
      isActive: true
    },
    order: [['level', 'ASC'], ['name', 'ASC']]
  });
};

/**
 * Obtener ancestros de una categoría
 * Parsea el path para obtener los IDs
 * 
 * @param {number} categoryId - ID de la categoría
 * @returns {Promise<AssetCategory[]>}
 */
export const getAncestors = async (categoryId) => {
  const category = await AssetCategory.findByPk(categoryId, {
    attributes: ['id', 'path', 'level']
  });

  if (!category || !category.path || category.level === 1) return [];

  // Parsear path: /1/5/12/ -> [1, 5] (sin el último que es el propio)
  const pathIds = category.path
    .split('/')
    .filter(id => id !== '')
    .map(id => parseInt(id, 10))
    .slice(0, -1);

  if (pathIds.length === 0) return [];

  return AssetCategory.findAll({
    where: { id: { [Op.in]: pathIds } },
    order: [['level', 'ASC']]
  });
};

/**
 * Obtener IDs de una categoría y todos sus descendientes
 * Útil para filtrar canales por categoría incluyendo subcategorías
 * 
 * @param {number} categoryId - ID de la categoría
 * @returns {Promise<number[]>}
 */
export const getCategoryAndDescendantIds = async (categoryId) => {
  const category = await AssetCategory.findByPk(categoryId, {
    attributes: ['id', 'path']
  });

  if (!category || !category.path) return [categoryId];

  const descendants = await AssetCategory.findAll({
    where: {
      path: { [Op.like]: `${category.path}%` },
      isActive: true
    },
    attributes: ['id']
  });

  return descendants.map(d => d.id);
};

/**
 * Verificar si una categoría pertenece a una organización
 * 
 * @param {number} categoryId - ID de la categoría
 * @param {string} organizationId - UUID de la organización
 * @returns {Promise<boolean>}
 */
export const categoryBelongsToOrganization = async (categoryId, organizationId) => {
  const category = await AssetCategory.findOne({
    where: {
      id: categoryId,
      scope: 'organization',
      organizationId: organizationId
    }
  });
  return !!category;
};

/**
 * Verificar si una categoría pertenece a un usuario
 * 
 * @param {number} categoryId - ID de la categoría
 * @param {string} userId - UUID del usuario
 * @returns {Promise<boolean>}
 */
export const categoryBelongsToUser = async (categoryId, userId) => {
  const category = await AssetCategory.findOne({
    where: {
      id: categoryId,
      scope: 'user',
      userId: userId
    }
  });
  return !!category;
};

/**
 * Verificar si el usuario tiene acceso a una categoría
 * (ya sea porque es de su org o porque es personal)
 * 
 * @param {number} categoryId - ID de la categoría
 * @param {string} organizationId - UUID de la organización
 * @param {string} userId - UUID del usuario
 * @returns {Promise<boolean>}
 */
export const userHasAccessToCategory = async (categoryId, organizationId, userId) => {
  const category = await AssetCategory.findOne({
    where: {
      id: categoryId,
      [Op.or]: [
        { scope: 'organization', organizationId: organizationId },
        { scope: 'user', userId: userId }
      ]
    }
  });
  return !!category;
};

export default {
  createCategory,
  findCategoryById,
  findCategoriesByOrganization,
  findCategoriesByUser,
  findAllVisibleCategories,
  updateCategory,
  deactivateCategory,
  reactivateCategory,
  getDescendants,
  getAncestors,
  getCategoryAndDescendantIds,
  categoryBelongsToOrganization,
  categoryBelongsToUser,
  userHasAccessToCategory
};
