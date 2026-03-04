'use strict';

/**
 * Migración Paso 4: Crear tablas cities y city_translations
 * 
 * - cities: PK = id (serial autoincrement) - no hay estándar ISO para ciudades
 * - city_translations: PK compuesta (city_id, lang)
 * 
 * Nota: Estas tablas se crean vacías. Las ciudades se cargan on-demand via Google Maps u otro servicio.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Crear tabla cities
      await queryInterface.createTable('cities', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          comment: 'ID autoincremental - no existe estándar ISO para ciudades'
        },
        state_code: {
          type: Sequelize.STRING(10),
          allowNull: false,
          references: {
            model: 'states',
            key: 'code'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          comment: 'FK a states.code (ej: AR-B)'
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false,
          comment: 'Nombre de la ciudad (nombre principal/oficial)'
        },
        zip_code: {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: 'Código postal principal'
        },
        latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: true,
          comment: 'Latitud GPS'
        },
        longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true,
          comment: 'Longitud GPS'
        },
        population: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Población estimada'
        },
        timezone: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Zona horaria (ej: America/Argentina/Buenos_Aires)'
        },
        is_capital: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Si es capital del estado/provincia'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Indica si la ciudad está activa'
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
      }, { 
        transaction,
        comment: 'Ciudades - cargadas on-demand, no pre-pobladas'
      });

      // 2. Agregar índices a cities
      await queryInterface.addIndex('cities', ['state_code'], {
        name: 'cities_state_code_idx',
        transaction
      });
      await queryInterface.addIndex('cities', ['name'], {
        name: 'cities_name_idx',
        transaction
      });
      await queryInterface.addIndex('cities', ['zip_code'], {
        name: 'cities_zip_code_idx',
        transaction
      });
      await queryInterface.addIndex('cities', ['is_active'], {
        name: 'cities_is_active_idx',
        transaction
      });
      await queryInterface.addIndex('cities', ['latitude', 'longitude'], {
        name: 'cities_coordinates_idx',
        transaction
      });

      // 3. Crear tabla city_translations
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
          onDelete: 'CASCADE',
          comment: 'FK a cities.id'
        },
        lang: {
          type: Sequelize.STRING(5),
          allowNull: false,
          comment: 'Código de idioma (es, en, pt)'
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false,
          comment: 'Nombre de la ciudad en el idioma'
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
      }, { 
        transaction,
        comment: 'Traducciones de nombres de ciudades'
      });

      // 4. Agregar índice único (city_id + lang)
      await queryInterface.addIndex('city_translations', ['city_id', 'lang'], {
        unique: true,
        name: 'unique_city_id_lang',
        transaction
      });
      await queryInterface.addIndex('city_translations', ['lang'], {
        name: 'city_translations_lang_idx',
        transaction
      });

      await transaction.commit();
      console.log('Paso 4 completado: tablas cities y city_translations creadas (vacías para carga on-demand)');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.dropTable('city_translations', { transaction });
      await queryInterface.dropTable('cities', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
