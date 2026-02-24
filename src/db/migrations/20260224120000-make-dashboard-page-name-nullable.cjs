'use strict';

// Migración: Hacer que dashboard_pages.name sea nullable
// Razón: Al crear un dashboard, se crea automáticamente la página 1 sin nombre.
// Si el dashboard tiene una sola página, el frontend no muestra el navegador de páginas.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('dashboard_pages', 'name', {
      type: Sequelize.STRING(200),
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE dashboard_pages SET name = 'Página ' || order_number WHERE name IS NULL`
    );

    await queryInterface.changeColumn('dashboard_pages', 'name', {
      type: Sequelize.STRING(200),
      allowNull: false
    });
  }
};
