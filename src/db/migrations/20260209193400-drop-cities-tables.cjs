'use strict';

/**
 * Migración: Eliminar tablas cities y city_translations
 * 
 * Las ciudades ya no se almacenan en DB.
 * Se sirven on-demand desde archivos JSON locales (data/geo/cities/{CC}.json).
 * Los campos de ciudad en otras tablas se guardan como texto plano.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.dropTable('city_translations', { transaction });
      await queryInterface.dropTable('cities', { transaction });
      
      await transaction.commit();
      console.log('Tablas cities y city_translations eliminadas (ciudades se sirven desde JSON)');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.createTable('cities', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        state_code: {
          type: Sequelize.STRING(10),
          allowNull: false,
          references: {
            model: 'states',
            key: 'code'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false
        },
        zip_code: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: true
        },
        longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true
        },
        population: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        timezone: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        is_capital: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
      }, { transaction });

      await queryInterface.addIndex('cities', ['state_code'], { name: 'cities_state_code_idx', transaction });
      await queryInterface.addIndex('cities', ['name'], { name: 'cities_name_idx', transaction });

      await queryInterface.createTable('city_translations', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        city_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'cities',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        lang: {
          type: Sequelize.STRING(5),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false
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
      }, { transaction });

      await queryInterface.addIndex('city_translations', ['city_id', 'lang'], {
        unique: true,
        name: 'unique_city_id_lang',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
