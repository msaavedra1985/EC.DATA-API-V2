'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ============================================================
    // Helper to safely add constraints (ignore if already exists)
    // ============================================================
    const safeAddConstraint = async (table, fields, options) => {
      try {
        await queryInterface.addConstraint(table, { fields, ...options });
      } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    };

    // ============================================================
    // 1. TRUNCATE all dashboard-related tables in FK order
    //    (no data to preserve, so we clear everything)
    // ============================================================
    await queryInterface.sequelize.query('TRUNCATE TABLE widget_data_sources CASCADE');
    await queryInterface.sequelize.query('TRUNCATE TABLE widgets CASCADE');
    await queryInterface.sequelize.query('TRUNCATE TABLE dashboard_pages CASCADE');
    await queryInterface.sequelize.query('TRUNCATE TABLE dashboard_collaborators CASCADE');
    await queryInterface.sequelize.query('TRUNCATE TABLE dashboard_group_items CASCADE');
    await queryInterface.sequelize.query('TRUNCATE TABLE dashboard_group_collaborators CASCADE');
    await queryInterface.sequelize.query('TRUNCATE TABLE dashboard_groups CASCADE');
    await queryInterface.sequelize.query('TRUNCATE TABLE dashboards CASCADE');

    // ============================================================
    // 2. Add counter columns to dashboards
    // ============================================================
    await queryInterface.addColumn('dashboards', 'page_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cached count of dashboard pages'
    });

    await queryInterface.addColumn('dashboards', 'widget_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cached count of widgets across all pages'
    });

    // ============================================================
    // 3. Add order_number to dashboard_pages with UNIQUE constraint
    // ============================================================
    await queryInterface.addColumn('dashboard_pages', 'order_number', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Order number for pages within a dashboard (set by app logic)'
    });

    await safeAddConstraint('dashboard_pages', ['dashboard_id', 'order_number'], {
      type: 'unique',
      name: 'dashboard_pages_dashboard_order_number_uk'
    });

    // ============================================================
    // 4. Add order_number to widgets with UNIQUE constraint
    // ============================================================
    await queryInterface.addColumn('widgets', 'order_number', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Order number for widgets within a page (set by app logic)'
    });

    await safeAddConstraint('widgets', ['dashboard_page_id', 'order_number'], {
      type: 'unique',
      name: 'widgets_page_order_number_uk'
    });

    // ============================================================
    // 5. Add order_number to widget_data_sources with UNIQUE constraint
    // ============================================================
    await queryInterface.addColumn('widget_data_sources', 'order_number', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Order number for data sources within a widget (set by app logic)'
    });

    await safeAddConstraint('widget_data_sources', ['widget_id', 'order_number'], {
      type: 'unique',
      name: 'widget_data_sources_widget_order_number_uk'
    });
  },

  async down(queryInterface) {
    // ============================================================
    // Remove constraints and columns in reverse order
    // ============================================================

    // Remove widget_data_sources constraint and column
    await queryInterface.removeConstraint('widget_data_sources', 'widget_data_sources_widget_order_number_uk').catch(() => {});
    await queryInterface.removeColumn('widget_data_sources', 'order_number');

    // Remove widgets constraint and column
    await queryInterface.removeConstraint('widgets', 'widgets_page_order_number_uk').catch(() => {});
    await queryInterface.removeColumn('widgets', 'order_number');

    // Remove dashboard_pages constraint and column
    await queryInterface.removeConstraint('dashboard_pages', 'dashboard_pages_dashboard_order_number_uk').catch(() => {});
    await queryInterface.removeColumn('dashboard_pages', 'order_number');

    // Remove counter columns from dashboards
    await queryInterface.removeColumn('dashboards', 'widget_count');
    await queryInterface.removeColumn('dashboards', 'page_count');
  }
};
