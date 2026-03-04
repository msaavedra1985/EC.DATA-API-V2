'use strict';

/**
 * Migración: Agregar campo 'code' a variables
 * 
 * Agrega un código slug inmutable con prefijo del tipo de medición
 * para que el frontend pueda identificar variables sin depender de IDs numéricos.
 * Formato: {prefijo_tipo}_{nombre_variable} (ej: ee_power, iot_temperature)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('variables', 'code', {
      type: Sequelize.STRING(50),
      allowNull: true,
      unique: true,
      comment: 'Código slug inmutable con prefijo del tipo (ej: ee_power, iot_temperature)'
    });

    await queryInterface.sequelize.query(
      `ALTER TABLE variables ALTER COLUMN code SET NOT NULL`
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('variables', 'code');
  }
};
