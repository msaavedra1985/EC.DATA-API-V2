'use strict';

/**
 * Migración: Crear tabla measurement_type_translations (Traducciones de Tipos de Medición)
 * 
 * Almacena las traducciones de nombres de tipos de medición en múltiples idiomas.
 * Sigue el patrón de internacionalización usado en country_translations.
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear tabla measurement_type_translations
    await queryInterface.createTable('measurement_type_translations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID incremental - clave primaria'
      },
      measurement_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'measurement_types',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a tabla measurement_types'
      },
      lang: {
        type: Sequelize.STRING(5),
        allowNull: false,
        comment: 'Código de idioma (es, en, pt, etc.)'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nombre del tipo de medición en el idioma especificado'
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

    // Índice único compuesto: measurement_type_id + lang
    await queryInterface.addIndex('measurement_type_translations', ['measurement_type_id', 'lang'], {
      unique: true,
      name: 'unique_measurement_type_lang'
    });

    // Índice por lang para búsquedas por idioma
    await queryInterface.addIndex('measurement_type_translations', ['lang'], {
      name: 'measurement_type_translations_lang_idx'
    });

    console.log('✅ Tabla measurement_type_translations creada exitosamente');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('measurement_type_translations');
    console.log('✅ Tabla measurement_type_translations eliminada');
  }
};
