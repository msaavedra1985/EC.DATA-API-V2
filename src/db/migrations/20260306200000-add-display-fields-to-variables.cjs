'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar campos de visualización a la tabla variables
    await queryInterface.addColumn('variables', 'decimal_places', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 2,
      comment: 'Cantidad de decimales para formatear el valor en UI'
    });

    await queryInterface.addColumn('variables', 'icon', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: 'Nombre del ícono para representar la variable (lucide, heroicons, etc.)'
    });

    await queryInterface.addColumn('variables', 'color', {
      type: Sequelize.STRING(7),
      allowNull: true,
      defaultValue: null,
      comment: 'Color hex para la variable en gráficos y UI (ej: #3B82F6)'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('variables', 'decimal_places');
    await queryInterface.removeColumn('variables', 'icon');
    await queryInterface.removeColumn('variables', 'color');
  }
};
