'use strict';

/**
 * Migración: Agregar FK measurement_type_id a tabla channels
 * 
 * Cada canal debe tener asociado un tipo de medición para saber
 * a qué tablas de Cassandra apuntar.
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar columna measurement_type_id a channels
    await queryInterface.addColumn('channels', 'measurement_type_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'measurement_types',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK a measurement_types - tipo de medición del canal'
    });

    // Crear índice para la FK
    await queryInterface.addIndex('channels', ['measurement_type_id'], {
      name: 'channels_measurement_type_id_idx'
    });

    console.log('✅ Campo measurement_type_id agregado a tabla channels');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índice
    await queryInterface.removeIndex('channels', 'channels_measurement_type_id_idx');
    
    // Eliminar columna
    await queryInterface.removeColumn('channels', 'measurement_type_id');

    console.log('✅ Campo measurement_type_id eliminado de tabla channels');
  }
};
