'use strict';

/**
 * Migración: Crear tabla measurement_types (Tipos de Medición)
 * 
 * Define los tipos de medición disponibles en el sistema y su mapeo
 * a las tablas de Cassandra.
 * 
 * El campo 'table_prefix' indica qué prefijo usar en Cassandra:
 * - '' (vacío): tablas de energía eléctrica (1m_t_datos, 60m_t_datos, etc.)
 * - 'sim': tablas IoT (sim1m_t_datos, sim60m_t_datos, etc.)
 * - 'btu': tablas BTU (btu1m_t_datos, etc.)
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear tabla measurement_types
    await queryInterface.createTable('measurement_types', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID incremental - clave primaria'
      },
      table_prefix: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '',
        comment: 'Prefijo de tablas en Cassandra (vacío=energía, sim=IoT, btu=BTU)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el tipo de medición está activo'
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

    // Índice por table_prefix para búsquedas rápidas
    await queryInterface.addIndex('measurement_types', ['table_prefix'], {
      name: 'measurement_types_table_prefix_idx'
    });

    // Índice por is_active para filtrado
    await queryInterface.addIndex('measurement_types', ['is_active'], {
      name: 'measurement_types_is_active_idx'
    });

    console.log('✅ Tabla measurement_types creada exitosamente');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('measurement_types');
    console.log('✅ Tabla measurement_types eliminada');
  }
};
