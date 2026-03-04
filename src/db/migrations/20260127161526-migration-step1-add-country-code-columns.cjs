'use strict';

/**
 * Migración Paso 1: Agregar columna country_code a tablas dependientes
 * 
 * Este es el primer paso de la migración a natural keys para países.
 * Agrega columna country_code (VARCHAR 2) y la pobla con el iso_alpha2 correspondiente.
 * 
 * Tablas afectadas:
 * - organizations
 * - sites  
 * - country_translations
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Agregar columna country_code a organizations
      await queryInterface.addColumn('organizations', 'country_code', {
        type: Sequelize.STRING(2),
        allowNull: true,
        comment: 'Código ISO 3166-1 alpha-2 del país (ej: AR, US)'
      }, { transaction });

      // 2. Agregar columna country_code a sites
      await queryInterface.addColumn('sites', 'country_code', {
        type: Sequelize.STRING(2),
        allowNull: true,
        comment: 'Código ISO 3166-1 alpha-2 del país (ej: AR, US)'
      }, { transaction });

      // 3. Agregar columna country_code a country_translations
      await queryInterface.addColumn('country_translations', 'country_code', {
        type: Sequelize.STRING(2),
        allowNull: true,
        comment: 'Código ISO 3166-1 alpha-2 del país (ej: AR, US)'
      }, { transaction });

      // 4. Poblar country_code en organizations desde countries.iso_alpha2
      await queryInterface.sequelize.query(`
        UPDATE organizations o
        SET country_code = c.iso_alpha2
        FROM countries c
        WHERE o.country_id = c.id
      `, { transaction });

      // 5. Poblar country_code en sites desde countries.iso_alpha2
      await queryInterface.sequelize.query(`
        UPDATE sites s
        SET country_code = c.iso_alpha2
        FROM countries c
        WHERE s.country_id = c.id
      `, { transaction });

      // 6. Poblar country_code en country_translations desde countries.iso_alpha2
      await queryInterface.sequelize.query(`
        UPDATE country_translations ct
        SET country_code = c.iso_alpha2
        FROM countries c
        WHERE ct.country_id = c.id
      `, { transaction });

      // 7. Verificar que todos los registros tienen country_code
      const [orgsWithNull] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM organizations WHERE country_code IS NULL AND deleted_at IS NULL`,
        { transaction }
      );
      const [sitesWithNull] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM sites WHERE country_code IS NULL AND deleted_at IS NULL`,
        { transaction }
      );
      const [translationsWithNull] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM country_translations WHERE country_code IS NULL`,
        { transaction }
      );

      if (parseInt(orgsWithNull[0].count) > 0 || 
          parseInt(sitesWithNull[0].count) > 0 || 
          parseInt(translationsWithNull[0].count) > 0) {
        throw new Error(`Hay registros sin country_code: orgs=${orgsWithNull[0].count}, sites=${sitesWithNull[0].count}, translations=${translationsWithNull[0].count}`);
      }

      await transaction.commit();
      console.log('Paso 1 completado: country_code agregado y poblado en organizations, sites, country_translations');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.removeColumn('country_translations', 'country_code', { transaction });
      await queryInterface.removeColumn('sites', 'country_code', { transaction });
      await queryInterface.removeColumn('organizations', 'country_code', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
