'use strict';

/**
 * Migración: Crear tabla asset_categories (Categorías de Activos)
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
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear ENUM para scope
    await queryInterface.sequelize.query(`
      CREATE TYPE asset_category_scope AS ENUM ('organization', 'user');
    `);

    // Crear tabla asset_categories
    await queryInterface.createTable('asset_categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID incremental - clave primaria'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nombre de la categoría (ej: Samsung, Split, Aire Acondicionado)'
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: false,
        defaultValue: '#6B7280',
        comment: 'Color hex para UI (ej: #3B82F6)'
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Nivel de profundidad en la jerarquía (1=raíz, 2, 3...)'
      },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'asset_categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK recursiva - NULL indica categoría raíz'
      },
      path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Materialized path para búsquedas rápidas (ej: /1/5/12/)'
      },
      scope: {
        type: Sequelize.ENUM('organization', 'user'),
        allowNull: false,
        comment: 'Alcance: organization=compartido, user=personal'
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a organizations - requerido si scope=organization'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a users - requerido si scope=user'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la categoría está activa (soft delete)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índice para búsqueda por path (LIKE queries)
    await queryInterface.addIndex('asset_categories', ['path'], {
      name: 'asset_categories_path_idx',
      using: 'btree'
    });

    // Índice para filtrar por scope + organization (tags de org)
    await queryInterface.addIndex('asset_categories', ['scope', 'organization_id'], {
      name: 'asset_categories_scope_org_idx',
      where: { scope: 'organization' }
    });

    // Índice para filtrar por scope + user (tags personales)
    await queryInterface.addIndex('asset_categories', ['scope', 'user_id'], {
      name: 'asset_categories_scope_user_idx',
      where: { scope: 'user' }
    });

    // Índice para parent_id (navegación jerárquica)
    await queryInterface.addIndex('asset_categories', ['parent_id'], {
      name: 'asset_categories_parent_id_idx'
    });

    // Índice para level (filtrado por profundidad)
    await queryInterface.addIndex('asset_categories', ['level'], {
      name: 'asset_categories_level_idx'
    });

    // Índice para is_active
    await queryInterface.addIndex('asset_categories', ['is_active'], {
      name: 'asset_categories_is_active_idx'
    });

    // Constraint: scope=organization requiere organization_id
    await queryInterface.sequelize.query(`
      ALTER TABLE asset_categories 
      ADD CONSTRAINT asset_categories_org_scope_check 
      CHECK (
        (scope = 'organization' AND organization_id IS NOT NULL AND user_id IS NULL) OR
        (scope = 'user' AND user_id IS NOT NULL)
      );
    `);

    console.log('✅ Tabla asset_categories creada exitosamente');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('asset_categories');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS asset_category_scope;');
    console.log('✅ Tabla asset_categories eliminada');
  }
};
