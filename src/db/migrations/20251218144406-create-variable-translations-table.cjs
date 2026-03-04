'use strict';

/**
 * Migración: Crear tabla variable_translations (Traducciones de Variables)
 * 
 * Almacena las traducciones de nombres y descripciones de variables
 * en múltiples idiomas.
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear tabla variable_translations
    await queryInterface.createTable('variable_translations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID incremental - clave primaria'
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
      lang: {
        type: Sequelize.STRING(5),
        allowNull: false,
        comment: 'Código de idioma (es, en, pt, etc.)'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nombre de la variable en el idioma especificado'
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Descripción de la variable en el idioma especificado'
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

    // Índice único compuesto: variable_id + lang
    await queryInterface.addIndex('variable_translations', ['variable_id', 'lang'], {
      unique: true,
      name: 'unique_variable_lang'
    });

    // Índice por lang para búsquedas por idioma
    await queryInterface.addIndex('variable_translations', ['lang'], {
      name: 'variable_translations_lang_idx'
    });

    console.log('✅ Tabla variable_translations creada exitosamente');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('variable_translations');
    console.log('✅ Tabla variable_translations eliminada');
  }
};
