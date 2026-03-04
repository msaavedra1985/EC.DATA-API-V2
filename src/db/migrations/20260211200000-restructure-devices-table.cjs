'use strict';

/**
 * Migración: Reestructurar tabla devices para integrar catálogos de equipos
 * 
 * Agrega:
 * - 7 FKs a tablas de catálogo: device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id
 * - Columnas MQTT: topic
 * - Columnas ubicación: location_name, physical_location, electrical_location, latitude, longitude, city
 * - Columnas comerciales: installation_date, warranty_months, expiration_date
 * 
 * Elimina:
 * - Columna enum device_type (reemplazada por device_type_id FK)
 * - Columna location_hint (reemplazada por location_name, physical_location, electrical_location)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // --- FKs a catálogos (todos nullable para no romper datos existentes) ---
    await queryInterface.addColumn('devices', 'device_type_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'device_types', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK a device_types - tipo de equipo (catálogo)'
    });

    await queryInterface.addColumn('devices', 'brand_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'device_brands', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK a device_brands - marca del equipo'
    });

    await queryInterface.addColumn('devices', 'model_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'device_models', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK a device_models - modelo del equipo'
    });

    await queryInterface.addColumn('devices', 'server_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'device_servers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK a device_servers - servidor de comunicación'
    });

    await queryInterface.addColumn('devices', 'network_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'device_networks', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK a device_networks - tipo de red'
    });

    await queryInterface.addColumn('devices', 'license_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'device_licenses', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK a device_licenses - tipo de licencia'
    });

    await queryInterface.addColumn('devices', 'validity_period_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'device_validity_periods', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK a device_validity_periods - período de vigencia'
    });

    // --- Columna MQTT ---
    await queryInterface.addColumn('devices', 'topic', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Topic MQTT del equipo (ej: ecdata/ups/eaton-001)'
    });

    // --- Columnas de ubicación ---
    await queryInterface.addColumn('devices', 'location_name', {
      type: Sequelize.STRING(200),
      allowNull: true,
      comment: 'Nombre de ubicación (ej: Edificio Principal)'
    });

    await queryInterface.addColumn('devices', 'physical_location', {
      type: Sequelize.STRING(200),
      allowNull: true,
      comment: 'Ubicación física (ej: Piso 3, Sala de servidores)'
    });

    await queryInterface.addColumn('devices', 'electrical_location', {
      type: Sequelize.STRING(200),
      allowNull: true,
      comment: 'Ubicación eléctrica (ej: Tablero principal TGD)'
    });

    await queryInterface.addColumn('devices', 'latitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true,
      comment: 'Latitud GPS del equipo'
    });

    await queryInterface.addColumn('devices', 'longitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true,
      comment: 'Longitud GPS del equipo'
    });

    await queryInterface.addColumn('devices', 'city', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Ciudad donde se encuentra el equipo'
    });

    // --- Columnas comerciales ---
    await queryInterface.addColumn('devices', 'installation_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Fecha de instalación del equipo'
    });

    await queryInterface.addColumn('devices', 'warranty_months', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Meses de garantía del equipo'
    });

    await queryInterface.addColumn('devices', 'expiration_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Fecha de expiración de la licencia/servicio'
    });

    // --- Eliminar columnas obsoletas ---
    await queryInterface.removeColumn('devices', 'device_type');
    await queryInterface.removeColumn('devices', 'location_hint');

    // --- Índices para las nuevas FKs ---
    await queryInterface.addIndex('devices', ['device_type_id'], { name: 'devices_device_type_id_idx' });
    await queryInterface.addIndex('devices', ['brand_id'], { name: 'devices_brand_id_idx' });
    await queryInterface.addIndex('devices', ['model_id'], { name: 'devices_model_id_idx' });
    await queryInterface.addIndex('devices', ['server_id'], { name: 'devices_server_id_idx' });
    await queryInterface.addIndex('devices', ['network_id'], { name: 'devices_network_id_idx' });
    await queryInterface.addIndex('devices', ['license_id'], { name: 'devices_license_id_idx' });
    await queryInterface.addIndex('devices', ['validity_period_id'], { name: 'devices_validity_period_id_idx' });
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices
    await queryInterface.removeIndex('devices', 'devices_device_type_id_idx');
    await queryInterface.removeIndex('devices', 'devices_brand_id_idx');
    await queryInterface.removeIndex('devices', 'devices_model_id_idx');
    await queryInterface.removeIndex('devices', 'devices_server_id_idx');
    await queryInterface.removeIndex('devices', 'devices_network_id_idx');
    await queryInterface.removeIndex('devices', 'devices_license_id_idx');
    await queryInterface.removeIndex('devices', 'devices_validity_period_id_idx');

    // Eliminar columnas nuevas
    await queryInterface.removeColumn('devices', 'expiration_date');
    await queryInterface.removeColumn('devices', 'warranty_months');
    await queryInterface.removeColumn('devices', 'installation_date');
    await queryInterface.removeColumn('devices', 'city');
    await queryInterface.removeColumn('devices', 'longitude');
    await queryInterface.removeColumn('devices', 'latitude');
    await queryInterface.removeColumn('devices', 'electrical_location');
    await queryInterface.removeColumn('devices', 'physical_location');
    await queryInterface.removeColumn('devices', 'location_name');
    await queryInterface.removeColumn('devices', 'topic');
    await queryInterface.removeColumn('devices', 'validity_period_id');
    await queryInterface.removeColumn('devices', 'license_id');
    await queryInterface.removeColumn('devices', 'network_id');
    await queryInterface.removeColumn('devices', 'server_id');
    await queryInterface.removeColumn('devices', 'model_id');
    await queryInterface.removeColumn('devices', 'brand_id');
    await queryInterface.removeColumn('devices', 'device_type_id');

    // Restaurar columnas eliminadas
    await queryInterface.addColumn('devices', 'device_type', {
      type: Sequelize.ENUM('sensor', 'gateway', 'controller', 'edge', 'virtual', 'other'),
      allowNull: false,
      defaultValue: 'other',
      comment: 'Tipo de dispositivo'
    });

    await queryInterface.addColumn('devices', 'location_hint', {
      type: Sequelize.STRING(200),
      allowNull: true,
      comment: 'Pista de ubicación física'
    });
  }
};
