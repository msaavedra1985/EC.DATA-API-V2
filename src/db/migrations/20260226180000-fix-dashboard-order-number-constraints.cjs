'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Los unique constraints originales no excluyen registros con soft delete (deleted_at IS NOT NULL).
    // Al hacer soft delete de un widget y crear otro con el mismo order_number, la DB rechaza el INSERT.
    // Solución: reemplazar constraints por partial unique indexes que excluyan soft-deleted rows.

    // 1. Eliminar constraints originales
    await queryInterface.removeConstraint('dashboard_pages', 'dashboard_pages_dashboard_order_number_uk').catch(() => {});
    await queryInterface.removeConstraint('widgets', 'widgets_page_order_number_uk').catch(() => {});
    await queryInterface.removeConstraint('widget_data_sources', 'widget_data_sources_widget_order_number_uk').catch(() => {});

    // 2. Crear partial unique indexes (solo aplican donde deleted_at IS NULL)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX dashboard_pages_dashboard_order_number_uk
      ON dashboard_pages (dashboard_id, order_number)
      WHERE deleted_at IS NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX widgets_page_order_number_uk
      ON widgets (dashboard_page_id, order_number)
      WHERE deleted_at IS NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX widget_data_sources_widget_order_number_uk
      ON widget_data_sources (widget_id, order_number)
      WHERE deleted_at IS NULL
    `);
  },

  async down(queryInterface) {
    // Revertir: eliminar partial indexes y recrear constraints originales

    await queryInterface.sequelize.query('DROP INDEX IF EXISTS dashboard_pages_dashboard_order_number_uk');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS widgets_page_order_number_uk');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS widget_data_sources_widget_order_number_uk');

    await queryInterface.addConstraint('dashboard_pages', {
      fields: ['dashboard_id', 'order_number'],
      type: 'unique',
      name: 'dashboard_pages_dashboard_order_number_uk'
    });

    await queryInterface.addConstraint('widgets', {
      fields: ['dashboard_page_id', 'order_number'],
      type: 'unique',
      name: 'widgets_page_order_number_uk'
    });

    await queryInterface.addConstraint('widget_data_sources', {
      fields: ['widget_id', 'order_number'],
      type: 'unique',
      name: 'widget_data_sources_widget_order_number_uk'
    });
  }
};
