'use strict';

/**
 * Migración: Modificar restricción UNIQUE de channels para permitir CH duplicado en energía
 * 
 * En mediciones de energía eléctrica trifásica, un mismo CH puede tener múltiples canales
 * representando las fases R, S, T. Esta migración modifica la restricción para excluir
 * los canales de energía (measurement_type_id = 1) de la validación de unicidad de CH.
 * 
 * Restricción original:
 *   UNIQUE (device_id, ch) WHERE deleted_at IS NULL AND ch IS NOT NULL
 * 
 * Nueva restricción:
 *   UNIQUE (device_id, ch) WHERE deleted_at IS NULL AND ch IS NOT NULL AND measurement_type_id != 1
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Eliminar la restricción única existente
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS channels_device_ch_unique;
    `);
    
    // Crear nueva restricción parcial que excluye energía eléctrica (measurement_type_id = 1)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX channels_device_ch_unique 
      ON channels (device_id, ch) 
      WHERE deleted_at IS NULL 
        AND ch IS NOT NULL 
        AND measurement_type_id != 1;
    `);
    
    console.log('✓ Restricción channels_device_ch_unique modificada para permitir CH duplicado en energía');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar la restricción modificada
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS channels_device_ch_unique;
    `);
    
    // Restaurar la restricción original
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX channels_device_ch_unique 
      ON channels (device_id, ch) 
      WHERE deleted_at IS NULL 
        AND ch IS NOT NULL;
    `);
    
    console.log('✓ Restricción channels_device_ch_unique restaurada a versión original');
  }
};
