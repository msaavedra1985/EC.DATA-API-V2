'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar columnas de layout y configuración al dashboard
    // Requeridas por el frontend para el CreateDashboardDialog
    await queryInterface.addColumn('dashboards', 'size', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'FREE',
      comment: 'Resolución del canvas: FREE, HD (1920x1080), VERTICAL (1080x1920), CUSTOM'
    });

    await queryInterface.addColumn('dashboards', 'positioning', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'AUTO',
      comment: 'Modo de posicionamiento de widgets: AUTO (grid), FLOAT (libre)'
    });

    await queryInterface.addColumn('dashboards', 'custom_width', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Ancho personalizado en px (solo cuando size=CUSTOM, rango 800-3840)'
    });

    await queryInterface.addColumn('dashboards', 'custom_height', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Alto personalizado en px (solo cuando size=CUSTOM, rango 600-2160)'
    });

    await queryInterface.addColumn('dashboards', 'is_home', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si este dashboard es el home del usuario en la organización'
    });

    await queryInterface.addColumn('dashboards', 'settings', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: '{}',
      comment: 'Configuración extensible del dashboard (forceK, backgroundImage, etc.)'
    });

    await queryInterface.addColumn('dashboards', 'template_id', {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'Referencia a template usado para crear el dashboard (sin FK por ahora)'
    });

    // Índice compuesto para buscar el home dashboard de un usuario en una org
    try {
      await queryInterface.addIndex('dashboards', ['owner_id', 'organization_id', 'is_home'], {
        name: 'dashboards_owner_org_is_home_idx',
        where: { is_home: true, deleted_at: null }
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }

    // Índice para filtrar por size
    try {
      await queryInterface.addIndex('dashboards', ['size'], {
        name: 'dashboards_size_idx'
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('dashboards', 'dashboards_size_idx').catch(() => {});
    await queryInterface.removeIndex('dashboards', 'dashboards_owner_org_is_home_idx').catch(() => {});
    await queryInterface.removeColumn('dashboards', 'template_id');
    await queryInterface.removeColumn('dashboards', 'settings');
    await queryInterface.removeColumn('dashboards', 'is_home');
    await queryInterface.removeColumn('dashboards', 'custom_height');
    await queryInterface.removeColumn('dashboards', 'custom_width');
    await queryInterface.removeColumn('dashboards', 'positioning');
    await queryInterface.removeColumn('dashboards', 'size');
  }
};
