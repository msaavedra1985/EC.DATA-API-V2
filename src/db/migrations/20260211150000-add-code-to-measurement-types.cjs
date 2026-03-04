'use strict';

/**
 * Migración: Agregar campo 'code' a measurement_types
 * 
 * Agrega un código slug inmutable en inglés para que el frontend
 * pueda identificar tipos de medición sin depender de IDs numéricos.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.addColumn('measurement_types', 'code', {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
        comment: 'Código slug inmutable en inglés (ej: electric_energy, iot_control)'
      }, { transaction });

      const codeMap = [
        { id: 1, code: 'electric_energy' },
        { id: 2, code: 'iot_control' },
        { id: 3, code: 'iot' },
        { id: 4, code: 'iot_reading' }
      ];

      for (const { id, code } of codeMap) {
        await queryInterface.sequelize.query(
          `UPDATE measurement_types SET code = :code WHERE id = :id`,
          { replacements: { id, code }, transaction }
        );
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE measurement_types ALTER COLUMN code SET NOT NULL`,
        { transaction }
      );

      await transaction.commit();
      console.log('Campo code agregado a measurement_types con valores poblados');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('measurement_types', 'code');
  }
};
