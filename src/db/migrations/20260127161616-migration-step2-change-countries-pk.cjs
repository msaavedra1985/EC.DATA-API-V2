'use strict';

/**
 * Migración Paso 2: Cambiar FKs para usar iso_alpha2 en lugar de id
 * 
 * Este paso:
 * 1. Elimina las FKs antiguas que apuntan a countries.id
 * 2. Hace country_code NOT NULL en tablas dependientes
 * 3. Crea nuevas FKs que apuntan a countries.iso_alpha2
 * 4. Elimina las columnas country_id antiguas
 * 
 * Nota: Mantenemos la columna id en countries pero las relaciones ahora usan iso_alpha2
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Eliminar FK antigua en organizations
      await queryInterface.removeConstraint('organizations', 'organizations_country_id_fkey', { transaction });
      
      // 2. Eliminar FK antigua en sites
      await queryInterface.removeConstraint('sites', 'sites_country_id_fkey', { transaction });
      
      // 3. Eliminar FK antigua en country_translations
      await queryInterface.removeConstraint('country_translations', 'country_translations_country_id_fkey', { transaction });

      // 4. Hacer country_code NOT NULL en organizations
      await queryInterface.changeColumn('organizations', 'country_code', {
        type: Sequelize.STRING(2),
        allowNull: false,
        comment: 'Código ISO 3166-1 alpha-2 del país (ej: AR, US)'
      }, { transaction });

      // 5. Hacer country_code NOT NULL en sites
      await queryInterface.changeColumn('sites', 'country_code', {
        type: Sequelize.STRING(2),
        allowNull: false,
        comment: 'Código ISO 3166-1 alpha-2 del país (ej: AR, US)'
      }, { transaction });

      // 6. Hacer country_code NOT NULL en country_translations
      await queryInterface.changeColumn('country_translations', 'country_code', {
        type: Sequelize.STRING(2),
        allowNull: false,
        comment: 'Código ISO 3166-1 alpha-2 del país (ej: AR, US)'
      }, { transaction });

      // 7. Crear nueva FK en organizations apuntando a countries.iso_alpha2
      await queryInterface.addConstraint('organizations', {
        fields: ['country_code'],
        type: 'foreign key',
        name: 'organizations_country_code_fkey',
        references: {
          table: 'countries',
          field: 'iso_alpha2'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        transaction
      });

      // 8. Crear nueva FK en sites apuntando a countries.iso_alpha2
      await queryInterface.addConstraint('sites', {
        fields: ['country_code'],
        type: 'foreign key',
        name: 'sites_country_code_fkey',
        references: {
          table: 'countries',
          field: 'iso_alpha2'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        transaction
      });

      // 9. Crear nueva FK en country_translations apuntando a countries.iso_alpha2
      await queryInterface.addConstraint('country_translations', {
        fields: ['country_code'],
        type: 'foreign key',
        name: 'country_translations_country_code_fkey',
        references: {
          table: 'countries',
          field: 'iso_alpha2'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        transaction
      });

      // 10. Eliminar columnas country_id antiguas
      await queryInterface.removeColumn('organizations', 'country_id', { transaction });
      await queryInterface.removeColumn('sites', 'country_id', { transaction });
      await queryInterface.removeColumn('country_translations', 'country_id', { transaction });

      // 11. Actualizar índice único en country_translations (country_code + lang)
      await queryInterface.removeIndex('country_translations', 'unique_country_lang', { transaction });
      await queryInterface.addIndex('country_translations', ['country_code', 'lang'], {
        unique: true,
        name: 'unique_country_code_lang',
        transaction
      });

      // 12. Agregar índices para country_code en organizations y sites
      await queryInterface.addIndex('organizations', ['country_code'], {
        name: 'organizations_country_code_idx',
        transaction
      });
      await queryInterface.addIndex('sites', ['country_code'], {
        name: 'sites_country_code_idx',
        transaction
      });

      await transaction.commit();
      console.log('Paso 2 completado: FKs migradas a iso_alpha2, columnas country_id eliminadas');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Revertir: recrear country_id y restaurar FKs antiguas
      
      // 1. Agregar country_id de vuelta
      await queryInterface.addColumn('organizations', 'country_id', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });
      
      await queryInterface.addColumn('sites', 'country_id', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });
      
      await queryInterface.addColumn('country_translations', 'country_id', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });

      // 2. Poblar country_id desde country_code
      await queryInterface.sequelize.query(`
        UPDATE organizations o
        SET country_id = c.id
        FROM countries c
        WHERE o.country_code = c.iso_alpha2
      `, { transaction });

      await queryInterface.sequelize.query(`
        UPDATE sites s
        SET country_id = c.id
        FROM countries c
        WHERE s.country_code = c.iso_alpha2
      `, { transaction });

      await queryInterface.sequelize.query(`
        UPDATE country_translations ct
        SET country_id = c.id
        FROM countries c
        WHERE ct.country_code = c.iso_alpha2
      `, { transaction });

      // 3. Hacer country_id NOT NULL
      await queryInterface.changeColumn('organizations', 'country_id', {
        type: Sequelize.INTEGER,
        allowNull: false
      }, { transaction });

      await queryInterface.changeColumn('sites', 'country_id', {
        type: Sequelize.INTEGER,
        allowNull: false
      }, { transaction });

      await queryInterface.changeColumn('country_translations', 'country_id', {
        type: Sequelize.INTEGER,
        allowNull: false
      }, { transaction });

      // 4. Eliminar nuevas FKs
      await queryInterface.removeConstraint('organizations', 'organizations_country_code_fkey', { transaction });
      await queryInterface.removeConstraint('sites', 'sites_country_code_fkey', { transaction });
      await queryInterface.removeConstraint('country_translations', 'country_translations_country_code_fkey', { transaction });

      // 5. Restaurar FKs antiguas
      await queryInterface.addConstraint('organizations', {
        fields: ['country_id'],
        type: 'foreign key',
        name: 'organizations_country_id_fkey',
        references: { table: 'countries', field: 'id' },
        transaction
      });

      await queryInterface.addConstraint('sites', {
        fields: ['country_id'],
        type: 'foreign key',
        name: 'sites_country_id_fkey',
        references: { table: 'countries', field: 'id' },
        transaction
      });

      await queryInterface.addConstraint('country_translations', {
        fields: ['country_id'],
        type: 'foreign key',
        name: 'country_translations_country_id_fkey',
        references: { table: 'countries', field: 'id' },
        transaction
      });

      // 6. Restaurar índice original
      await queryInterface.removeIndex('country_translations', 'unique_country_code_lang', { transaction });
      await queryInterface.addIndex('country_translations', ['country_id', 'lang'], {
        unique: true,
        name: 'unique_country_lang',
        transaction
      });

      // 7. Eliminar índices nuevos
      await queryInterface.removeIndex('organizations', 'organizations_country_code_idx', { transaction });
      await queryInterface.removeIndex('sites', 'sites_country_code_idx', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
