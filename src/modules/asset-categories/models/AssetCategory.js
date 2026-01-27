import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo AssetCategory (Categorías de Activos)
 * 
 * Sistema de tags jerárquicos para clasificar canales.
 * Usa Adjacency List (parent_id) + Materialized Path (path) para consultas rápidas.
 * 
 * Dos alcances de tags:
 * - 'organization': Tags compartidos para toda la organización
 * - 'user': Tags personales de cada usuario
 * 
 * El campo 'level' es numérico para permitir N niveles de profundidad.
 * El campo 'path' almacena la ruta materializada (ej: /1/5/12/) para búsquedas LIKE.
 * 
 * Ejemplo de jerarquía:
 * - Aire Acondicionado (id=1, level=1, path="/1/")
 *   └── Split (id=5, level=2, path="/1/5/")
 *         └── Samsung (id=12, level=3, path="/1/5/12/")
 */
const AssetCategory = sequelize.define('AssetCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID incremental - clave primaria'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Nombre de la categoría (ej: Samsung, Split, Aire Acondicionado)'
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#6B7280',
    comment: 'Color hex para UI (ej: #3B82F6)'
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Nivel de profundidad en la jerarquía (1=raíz, 2, 3...)'
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'asset_categories',
      key: 'id'
    },
    comment: 'FK recursiva - NULL indica categoría raíz'
  },
  path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Materialized path para búsquedas rápidas (ej: /1/5/12/)'
  },
  scope: {
    type: DataTypes.ENUM('organization', 'user'),
    allowNull: false,
    comment: 'Alcance: organization=compartido, user=personal'
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'organizations',
      key: 'id'
    },
    comment: 'FK a organizations - requerido si scope=organization'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'FK a users - requerido si scope=user'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Indica si la categoría está activa (soft delete)'
  }
}, {
  tableName: 'asset_categories',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['path'] },
    { fields: ['parent_id'] },
    { fields: ['level'] },
    { fields: ['is_active'] }
  ]
});

/**
 * Hook afterCreate: Genera el path automáticamente después de crear
 * Se ejecuta después del INSERT porque necesitamos el ID generado
 */
AssetCategory.addHook('afterCreate', async (instance, options) => {
  let newPath;
  let newLevel;

  if (instance.parent_id === null) {
    // Categoría raíz: path = /id/
    newPath = `/${instance.id}/`;
    newLevel = 1;
  } else {
    // Categoría hija: buscar path del padre y concatenar
    const parent = await AssetCategory.findByPk(instance.parent_id, {
      attributes: ['path', 'level'],
      transaction: options.transaction
    });

    if (parent) {
      // Remover el último / del path del padre y agregar el nuevo ID
      const parentPath = parent.path.slice(0, -1);
      newPath = `${parentPath}/${instance.id}/`;
      newLevel = parent.level + 1;
    } else {
      // Si no existe padre (edge case), tratar como raíz
      newPath = `/${instance.id}/`;
      newLevel = 1;
    }
  }

  // Actualizar path y level
  await instance.update({ path: newPath, level: newLevel }, { 
    transaction: options.transaction,
    hooks: false // Evitar recursión
  });
});

/**
 * Hook beforeUpdate: Actualiza path si cambia parent_id
 * Importante: También debe actualizar paths de todos los descendientes
 */
AssetCategory.addHook('beforeUpdate', async (instance, options) => {
  // Solo procesar si cambió parent_id
  if (!instance.changed('parent_id')) return;

  const oldPath = instance.path;
  let newPath;
  let newLevel;

  if (instance.parent_id === null) {
    newPath = `/${instance.id}/`;
    newLevel = 1;
  } else {
    const parent = await AssetCategory.findByPk(instance.parent_id, {
      attributes: ['path', 'level'],
      transaction: options.transaction
    });

    if (parent) {
      const parentPath = parent.path.slice(0, -1);
      newPath = `${parentPath}/${instance.id}/`;
      newLevel = parent.level + 1;
    } else {
      newPath = `/${instance.id}/`;
      newLevel = 1;
    }
  }

  instance.path = newPath;
  instance.level = newLevel;

  // Actualizar paths de todos los descendientes
  if (oldPath && oldPath !== newPath) {
    const descendants = await AssetCategory.findAll({
      where: {
        path: { [Op.like]: `${oldPath}%` },
        id: { [Op.ne]: instance.id }
      },
      transaction: options.transaction
    });

    // Calcular diferencia de nivel
    const levelDiff = newLevel - instance.getDataValue('level');

    for (const descendant of descendants) {
      const updatedPath = descendant.path.replace(oldPath, newPath);
      await descendant.update({ 
        path: updatedPath,
        level: descendant.level + levelDiff
      }, { 
        transaction: options.transaction,
        hooks: false
      });
    }
  }
});

/**
 * Relación recursiva: Una categoría puede tener un padre
 */
AssetCategory.belongsTo(AssetCategory, {
  as: 'parent',
  foreignKey: 'parent_id'
});

/**
 * Relación recursiva: Una categoría puede tener múltiples hijos
 */
AssetCategory.hasMany(AssetCategory, {
  as: 'children',
  foreignKey: 'parent_id'
});

/**
 * Método de instancia: Obtener todos los descendientes
 * Usa el path materializado para búsqueda eficiente O(1)
 * 
 * @returns {Promise<AssetCategory[]>} Lista de categorías descendientes
 */
AssetCategory.prototype.getDescendants = async function() {
  if (!this.path) return [];
  
  return AssetCategory.findAll({
    where: {
      path: { [Op.like]: `${this.path}%` },
      id: { [Op.ne]: this.id },
      is_active: true
    },
    order: [['level', 'ASC'], ['name', 'ASC']]
  });
};

/**
 * Método de instancia: Obtener todos los ancestros
 * Parsea el path para obtener los IDs de ancestros
 * 
 * @returns {Promise<AssetCategory[]>} Lista de categorías ancestras (ordenadas de raíz a padre inmediato)
 */
AssetCategory.prototype.getAncestors = async function() {
  if (!this.path || this.level === 1) return [];
  
  // Parsear path: /1/5/12/ -> [1, 5, 12] -> quitar el último (es el propio)
  const pathIds = this.path
    .split('/')
    .filter(id => id !== '')
    .map(id => parseInt(id, 10))
    .slice(0, -1); // Remover el propio ID

  if (pathIds.length === 0) return [];

  return AssetCategory.findAll({
    where: {
      id: { [Op.in]: pathIds }
    },
    order: [['level', 'ASC']]
  });
};

/**
 * Método de instancia: Obtener hijos directos (un nivel abajo)
 * 
 * @returns {Promise<AssetCategory[]>} Lista de categorías hijas directas
 */
AssetCategory.prototype.getDirectChildren = async function() {
  return AssetCategory.findAll({
    where: {
      parent_id: this.id,
      is_active: true
    },
    order: [['name', 'ASC']]
  });
};

/**
 * Método estático: Obtener árbol completo de categorías
 * Útil para construir menús jerárquicos en el frontend
 * 
 * @param {Object} options - Opciones de filtrado
 * @param {string} options.scope - 'organization' o 'user'
 * @param {string} options.organization_id - ID de organización (si scope=organization)
 * @param {string} options.user_id - ID de usuario (si scope=user)
 * @returns {Promise<AssetCategory[]>} Árbol de categorías
 */
AssetCategory.getTree = async function({ scope, organization_id, user_id }) {
  const where = { is_active: true };

  if (scope === 'organization' && organization_id) {
    where.scope = 'organization';
    where.organization_id = organization_id;
  } else if (scope === 'user' && user_id) {
    where.scope = 'user';
    where.user_id = user_id;
  }

  // Obtener todas las categorías ordenadas por path
  return AssetCategory.findAll({
    where,
    order: [['path', 'ASC']],
    include: [{
      model: AssetCategory,
      as: 'parent',
      attributes: ['id', 'name']
    }]
  });
};

/**
 * Método estático: Buscar canales por categoría incluyendo descendientes
 * Usa el path para incluir todas las subcategorías
 * 
 * @param {number} categoryId - ID de la categoría
 * @returns {Promise<number[]>} IDs de todas las categorías (incluye descendientes)
 */
AssetCategory.getCategoryAndDescendantIds = async function(categoryId) {
  const category = await AssetCategory.findByPk(categoryId, {
    attributes: ['id', 'path']
  });

  if (!category || !category.path) return [categoryId];

  const descendants = await AssetCategory.findAll({
    where: {
      path: { [Op.like]: `${category.path}%` },
      is_active: true
    },
    attributes: ['id']
  });

  return descendants.map(d => d.id);
};

export default AssetCategory;
