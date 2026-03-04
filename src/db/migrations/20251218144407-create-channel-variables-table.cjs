'use strict';

/**
 * Migración: Crear tabla channel_variables (Relación N:N Canales-Variables)
 * 
 * Define qué variables están activas para cada canal específico.
 * Permite configurar diferentes variables por canal según el tipo de equipo.
 * 
 * Ejemplo: Un canal de termostato puede tener variables 'Temperatura' y 'Humedad',
 * mientras que un canal de totalizador puede tener 'Energía' y 'Potencia'.
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear tabla channel_variables
    await queryInterface.createTable('channel_variables', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID incremental - clave primaria'
      },
      channel_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'channels',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a tabla channels'
      },
      variable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'variables',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a tabla variables'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la variable está activa para este canal'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Orden de visualización específico para este canal (override)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índice único compuesto: channel_id + variable_id
    await queryInterface.addIndex('channel_variables', ['channel_id', 'variable_id'], {
      unique: true,
      name: 'unique_channel_variable'
    });

    // Índice por channel_id para búsquedas por canal
    await queryInterface.addIndex('channel_variables', ['channel_id'], {
      name: 'channel_variables_channel_id_idx'
    });

    // Índice por variable_id para búsquedas por variable
    await queryInterface.addIndex('channel_variables', ['variable_id'], {
      name: 'channel_variables_variable_id_idx'
    });

    // Índice por is_active para filtrado
    await queryInterface.addIndex('channel_variables', ['is_active'], {
      name: 'channel_variables_is_active_idx'
    });

    console.log('✅ Tabla channel_variables creada exitosamente');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('channel_variables');
    console.log('✅ Tabla channel_variables eliminada');
  }
};
