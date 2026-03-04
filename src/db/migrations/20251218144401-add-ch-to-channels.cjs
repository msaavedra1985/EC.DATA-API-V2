'use strict';

/**
 * Migración: Agregar campo ch (número físico de canal) a tabla channels
 * 
 * El campo 'ch' representa el número de canal físico que se usa en Cassandra
 * para identificar el canal en las tablas de mediciones.
 * Es diferente al 'id' (UUID) que es la clave primaria en PostgreSQL.
 * 
 * Ejemplo: Un canal puede tener id=UUID, human_id=44109, pero ch=2
 * En Cassandra, las queries usan ch=2 junto con el UUID del device.
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar columna ch a la tabla channels
    await queryInterface.addColumn('channels', 'ch', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Número de canal físico usado en Cassandra para identificar mediciones'
    });

    // Crear índice para búsquedas por ch dentro de un device
    await queryInterface.addIndex('channels', ['device_id', 'ch'], {
      unique: true,
      name: 'channels_device_ch_unique',
      where: {
        deleted_at: null,
        ch: { [Sequelize.Op.ne]: null }
      }
    });

    console.log('✅ Campo ch agregado a tabla channels');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índice
    await queryInterface.removeIndex('channels', 'channels_device_ch_unique');
    
    // Eliminar columna
    await queryInterface.removeColumn('channels', 'ch');

    console.log('✅ Campo ch eliminado de tabla channels');
  }
};
