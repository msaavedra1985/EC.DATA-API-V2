'use strict';

/**
 * Migración: Agregar campos extendidos a la tabla Sites
 * 
 * Agrega 8 campos nuevos para información de edificio y contacto:
 * - building_type: tipo de edificio (ENUM)
 * - area_m2: área en metros cuadrados
 * - floors: número de pisos
 * - operating_hours: horarios de operación
 * - image_url: URL de imagen del sitio
 * - contact_name: nombre del contacto
 * - contact_phone: teléfono del contacto
 * - contact_email: email del contacto
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear tipo ENUM para building_type
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_sites_building_type') THEN
          CREATE TYPE enum_sites_building_type AS ENUM (
            'office', 'warehouse', 'factory', 'retail', 
            'hospital', 'school', 'datacenter', 'hotel', 
            'restaurant', 'residential', 'mixed', 'other'
          );
        END IF;
      END $$;
    `);

    // Agregar columnas a la tabla sites
    await queryInterface.addColumn('sites', 'building_type', {
      type: 'enum_sites_building_type',
      allowNull: true,
      comment: 'Tipo de edificio'
    });

    await queryInterface.addColumn('sites', 'area_m2', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Área en metros cuadrados'
    });

    await queryInterface.addColumn('sites', 'floors', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Número de pisos del edificio'
    });

    await queryInterface.addColumn('sites', 'operating_hours', {
      type: Sequelize.STRING(200),
      allowNull: true,
      comment: 'Horarios de operación (ej: Lun-Vie 9:00-18:00)'
    });

    await queryInterface.addColumn('sites', 'image_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'URL de imagen del sitio'
    });

    await queryInterface.addColumn('sites', 'contact_name', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Nombre del contacto principal'
    });

    await queryInterface.addColumn('sites', 'contact_phone', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Teléfono del contacto'
    });

    await queryInterface.addColumn('sites', 'contact_email', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Email del contacto'
    });
  },

  async down(queryInterface, Sequelize) {
    // Eliminar columnas en orden inverso
    await queryInterface.removeColumn('sites', 'contact_email');
    await queryInterface.removeColumn('sites', 'contact_phone');
    await queryInterface.removeColumn('sites', 'contact_name');
    await queryInterface.removeColumn('sites', 'image_url');
    await queryInterface.removeColumn('sites', 'operating_hours');
    await queryInterface.removeColumn('sites', 'floors');
    await queryInterface.removeColumn('sites', 'area_m2');
    await queryInterface.removeColumn('sites', 'building_type');

    // Eliminar tipo ENUM
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_sites_building_type;
    `);
  }
};
