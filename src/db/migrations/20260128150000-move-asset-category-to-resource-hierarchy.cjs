'use strict';

/**
 * Migración: Mover asset_category_id de channels a resource_hierarchy
 * 
 * Los tags se asignan a nodos del árbol (tipo channel), no directamente a la tabla channels.
 * Esto permite filtrar el árbol mostrando solo ramas que contienen canales con cierto tag.
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Remover asset_category_id de channels
    const channelsTableInfo = await queryInterface.describeTable('channels');
    if (channelsTableInfo.asset_category_id) {
      await queryInterface.removeIndex('channels', 'channels_asset_category_id_idx').catch(() => {});
      await queryInterface.removeColumn('channels', 'asset_category_id');
      console.log('✅ Columna asset_category_id removida de channels');
    }

    // 2. Agregar asset_category_id a resource_hierarchy
    const rhTableInfo = await queryInterface.describeTable('resource_hierarchy');
    if (!rhTableInfo.asset_category_id) {
      await queryInterface.addColumn('resource_hierarchy', 'asset_category_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'asset_categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a asset_categories - tag asignado al nodo (principalmente para node_type=channel)'
      });

      // Índice compuesto para filtrado eficiente
      await queryInterface.addIndex('resource_hierarchy', ['node_type', 'asset_category_id'], {
        name: 'resource_hierarchy_node_type_category_idx'
      });

      // Índice simple para JOINs
      await queryInterface.addIndex('resource_hierarchy', ['asset_category_id'], {
        name: 'resource_hierarchy_asset_category_idx'
      });

      console.log('✅ Columna asset_category_id agregada a resource_hierarchy');
    }
  },

  async down(queryInterface, Sequelize) {
    // Revertir: remover de resource_hierarchy y agregar a channels
    const rhTableInfo = await queryInterface.describeTable('resource_hierarchy');
    if (rhTableInfo.asset_category_id) {
      await queryInterface.removeIndex('resource_hierarchy', 'resource_hierarchy_node_type_category_idx').catch(() => {});
      await queryInterface.removeIndex('resource_hierarchy', 'resource_hierarchy_asset_category_idx').catch(() => {});
      await queryInterface.removeColumn('resource_hierarchy', 'asset_category_id');
    }

    const channelsTableInfo = await queryInterface.describeTable('channels');
    if (!channelsTableInfo.asset_category_id) {
      await queryInterface.addColumn('channels', 'asset_category_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'asset_categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      await queryInterface.addIndex('channels', ['asset_category_id'], {
        name: 'channels_asset_category_id_idx'
      });
    }

    console.log('✅ Migración revertida');
  }
};
