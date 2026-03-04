'use strict';

// Migración: Agregar campo mqtt_key a la tabla variables
// Mapea la key exacta como llega en el payload MQTT para cada variable
// Necesario porque column_name.toUpperCase() no siempre coincide (ej: fp → PF en MQTT)

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('variables', 'mqtt_key', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: 'Key exacta como llega en el payload MQTT (ej: PF, E, P). NULL si no aplica para realtime'
    });

    // Popular mqtt_key para variables eléctricas con is_realtime=true
    const mqttKeys = [
      { id: 3, mqttKey: 'P' },
      { id: 5, mqttKey: 'PF' },
      { id: 7, mqttKey: 'V' },
      { id: 8, mqttKey: 'I' },
      { id: 9, mqttKey: 'S' },
      { id: 10, mqttKey: 'U' },
      { id: 13, mqttKey: 'D' },
      { id: 16, mqttKey: 'Q' },
      { id: 19, mqttKey: 'F' },
    ];

    for (const { id, mqttKey } of mqttKeys) {
      await queryInterface.sequelize.query(
        `UPDATE variables SET mqtt_key = '${mqttKey}' WHERE id = ${id} AND is_realtime = true`
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('variables', 'mqtt_key');
  }
};
