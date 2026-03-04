'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // --- Agregar columnas nuevas ---
    await queryInterface.addColumn('channels', 'phase_system', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Sistema eléctrico: 0=N/A, 1=monofásico, 3=trifásico'
    });

    await queryInterface.addColumn('channels', 'phase', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Fase que lee el canal: 1, 2 o 3'
    });

    await queryInterface.addColumn('channels', 'process', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Si se procesan los datos del canal'
    });

    // --- Eliminar columnas que no aplican al modelo de punto de medición ---
    await queryInterface.removeIndex('channels', ['channel_type']).catch(() => {});
    await queryInterface.removeColumn('channels', 'channel_type');
    await queryInterface.removeColumn('channels', 'protocol');
    await queryInterface.removeColumn('channels', 'direction');
    await queryInterface.removeColumn('channels', 'endpoint_url');
    await queryInterface.removeColumn('channels', 'config');
    await queryInterface.removeColumn('channels', 'credentials_ref');
    await queryInterface.removeColumn('channels', 'priority');

    // --- Limpiar ENUMs huérfanos ---
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_channels_channel_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_channels_protocol";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_channels_direction";');
  },

  async down(queryInterface, Sequelize) {
    // Restaurar columnas eliminadas
    await queryInterface.addColumn('channels', 'channel_type', {
      type: Sequelize.ENUM('mqtt', 'http', 'websocket', 'coap', 'modbus', 'opcua', 'bacnet', 'lorawan', 'sigfox', 'other'),
      allowNull: false,
      defaultValue: 'other',
      comment: 'Tipo de canal'
    });

    await queryInterface.addColumn('channels', 'protocol', {
      type: Sequelize.ENUM('mqtt', 'http', 'https', 'ws', 'wss', 'coap', 'coaps', 'modbus_tcp', 'modbus_rtu', 'opcua', 'bacnet_ip', 'lorawan', 'sigfox', 'tcp', 'udp', 'other'),
      allowNull: false,
      defaultValue: 'other',
      comment: 'Protocolo de comunicación'
    });

    await queryInterface.addColumn('channels', 'direction', {
      type: Sequelize.ENUM('inbound', 'outbound', 'bidirectional'),
      allowNull: false,
      defaultValue: 'bidirectional',
      comment: 'Dirección de comunicación'
    });

    await queryInterface.addColumn('channels', 'endpoint_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'URL del endpoint de comunicación'
    });

    await queryInterface.addColumn('channels', 'config', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Configuración del canal en formato JSON'
    });

    await queryInterface.addColumn('channels', 'credentials_ref', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Referencia a credenciales almacenadas'
    });

    await queryInterface.addColumn('channels', 'priority', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Prioridad del canal (1-10)'
    });

    await queryInterface.addIndex('channels', ['channel_type']);

    // Eliminar columnas nuevas
    await queryInterface.removeColumn('channels', 'process');
    await queryInterface.removeColumn('channels', 'phase');
    await queryInterface.removeColumn('channels', 'phase_system');
  }
};
