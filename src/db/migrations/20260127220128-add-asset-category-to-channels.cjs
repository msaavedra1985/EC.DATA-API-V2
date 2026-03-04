'use strict';

/**
 * Migración: Agregar asset_category_id a channels
 * 
 * Permite clasificar canales con categorías jerárquicas (tags).
 * Un canal puede tener un solo tag asignado, pero el tag representa
 * toda la cadena jerárquica (ej: Samsung -> Split -> Aire Acondicionado).
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar columna asset_category_id a channels
    await queryInterface.addColumn('channels', 'asset_category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'asset_categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK a asset_categories - categoría/tag asignado al canal'
    });

    // Índice para búsqueda de canales por categoría
    await queryInterface.addIndex('channels', ['asset_category_id'], {
      name: 'channels_asset_category_id_idx'
    });

    console.log('✅ Columna asset_category_id agregada a channels');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('channels', 'channels_asset_category_id_idx');
    await queryInterface.removeColumn('channels', 'asset_category_id');
    console.log('✅ Columna asset_category_id eliminada de channels');
  }
};
