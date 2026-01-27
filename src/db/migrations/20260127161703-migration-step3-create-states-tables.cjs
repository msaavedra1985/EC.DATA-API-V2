'use strict';

/**
 * Migración Paso 3: Crear tablas states y state_translations
 * 
 * - states: PK = code (ej: AR-B, US-CA)
 * - state_translations: PK compuesta (state_code, lang)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Crear tabla states
      await queryInterface.createTable('states', {
        code: {
          type: Sequelize.STRING(10),
          primaryKey: true,
          allowNull: false,
          comment: 'Código único del estado: country_iso2 + "-" + state_code (ej: AR-B, US-CA)'
        },
        country_code: {
          type: Sequelize.STRING(2),
          allowNull: false,
          references: {
            model: 'countries',
            key: 'iso_alpha2'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          comment: 'FK a countries.iso_alpha2'
        },
        state_code: {
          type: Sequelize.STRING(10),
          allowNull: false,
          comment: 'Código del estado dentro del país (ej: B para Buenos Aires, CA para California)'
        },
        type: {
          type: Sequelize.ENUM('state', 'province', 'department', 'region', 'territory', 'district', 'other'),
          allowNull: true,
          comment: 'Tipo de división administrativa'
        },
        latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: true,
          comment: 'Latitud del centroide'
        },
        longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true,
          comment: 'Longitud del centroide'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Indica si el estado está activo'
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
        comment: 'Estados/Provincias con PK natural (country_code + state_code)'
      });

      // 2. Agregar índices a states
      await queryInterface.addIndex('states', ['country_code'], {
        name: 'states_country_code_idx',
        transaction
      });
      await queryInterface.addIndex('states', ['is_active'], {
        name: 'states_is_active_idx',
        transaction
      });

      // 3. Crear tabla state_translations
      await queryInterface.createTable('state_translations', {
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
          onDelete: 'CASCADE',
          comment: 'FK a states.code'
        },
        lang: {
          type: Sequelize.STRING(5),
          allowNull: false,
          comment: 'Código de idioma (es, en, pt)'
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false,
          comment: 'Nombre del estado en el idioma'
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
        comment: 'Traducciones de nombres de estados'
      });

      // 4. Agregar índice único (state_code + lang)
      await queryInterface.addIndex('state_translations', ['state_code', 'lang'], {
        unique: true,
        name: 'unique_state_code_lang',
        transaction
      });
      await queryInterface.addIndex('state_translations', ['lang'], {
        name: 'state_translations_lang_idx',
        transaction
      });

      await transaction.commit();
      console.log('Paso 3 completado: tablas states y state_translations creadas');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.dropTable('state_translations', { transaction });
      await queryInterface.dropTable('states', { transaction });
      
      // Eliminar ENUM type
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_states_type"`,
        { transaction }
      );
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
