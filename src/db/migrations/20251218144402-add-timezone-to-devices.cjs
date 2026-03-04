'use strict';

/**
 * Migración: Agregar campo timezone a tabla devices
 * 
 * El campo 'timezone' almacena la zona horaria del dispositivo usando
 * el formato IANA (ej: 'America/Lima', 'America/New_York', 'Europe/Madrid').
 * 
 * Es usado por el TelemetryService para:
 * - Convertir timestamps de Cassandra a hora local
 * - Aplicar filtros de horario correctamente
 * - Mostrar datos en la zona horaria del dispositivo
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar columna timezone a la tabla devices
    await queryInterface.addColumn('devices', 'timezone', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'UTC',
      comment: 'Zona horaria del dispositivo en formato IANA (ej: America/Lima, UTC)'
    });

    console.log('✅ Campo timezone agregado a tabla devices');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar columna
    await queryInterface.removeColumn('devices', 'timezone');

    console.log('✅ Campo timezone eliminado de tabla devices');
  }
};
