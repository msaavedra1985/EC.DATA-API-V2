'use strict';

/**
 * Migración: Crear tabla organization_countries
 * 
 * Relación muchos-a-muchos entre organizaciones y países.
 * Reemplaza la columna country_code en organizations.
 * Migra datos existentes marcándolos como is_primary=true.
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Crear tabla organization_countries
      await queryInterface.createTable('organization_countries', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          comment: 'UUID - clave primaria'
        },
        organization_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'organizations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'FK a organizations.id'
        },
        country_code: {
          type: Sequelize.STRING(2),
          allowNull: false,
          references: { model: 'countries', key: 'iso_alpha2' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          comment: 'FK a countries.iso_alpha2 - código ISO del país'
        },
        is_primary: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Indica si es el país principal de la organización'
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

      // 2. Constraint único (organization_id, country_code)
      await queryInterface.addConstraint('organization_countries', {
        fields: ['organization_id', 'country_code'],
        type: 'unique',
        name: 'organization_countries_org_country_unique',
        transaction
      });

      // 3. Índices
      await queryInterface.addIndex('organization_countries', ['organization_id'], {
        name: 'organization_countries_organization_id_idx',
        transaction
      });

      await queryInterface.addIndex('organization_countries', ['country_code'], {
        name: 'organization_countries_country_code_idx',
        transaction
      });

      // 4. Migrar datos existentes de organizations.country_code
      await queryInterface.sequelize.query(`
        INSERT INTO organization_countries (organization_id, country_code, is_primary, created_at, updated_at)
        SELECT id, country_code, true, NOW(), NOW()
        FROM organizations
        WHERE country_code IS NOT NULL AND deleted_at IS NULL
      `, { transaction });

      // 5. Eliminar columna country_code de organizations
      await queryInterface.removeColumn('organizations', 'country_code', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Recrear columna country_code en organizations (nullable temporalmente)
      await queryInterface.addColumn('organizations', 'country_code', {
        type: Sequelize.STRING(2),
        allowNull: true,
        references: { model: 'countries', key: 'iso_alpha2' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a countries.iso_alpha2 - código ISO del país'
      }, { transaction });

      // 2. Migrar datos de vuelta (usar el país primario)
      await queryInterface.sequelize.query(`
        UPDATE organizations o
        SET country_code = oc.country_code
        FROM organization_countries oc
        WHERE oc.organization_id = o.id AND oc.is_primary = true
      `, { transaction });

      // 3. Para organizaciones sin país primario, usar el primero disponible
      await queryInterface.sequelize.query(`
        UPDATE organizations o
        SET country_code = (
          SELECT oc.country_code FROM organization_countries oc
          WHERE oc.organization_id = o.id
          LIMIT 1
        )
        WHERE o.country_code IS NULL
        AND EXISTS (SELECT 1 FROM organization_countries oc WHERE oc.organization_id = o.id)
      `, { transaction });

      // 4. Hacer la columna NOT NULL
      await queryInterface.changeColumn('organizations', 'country_code', {
        type: Sequelize.STRING(2),
        allowNull: false,
        references: { model: 'countries', key: 'iso_alpha2' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      }, { transaction });

      // 5. Agregar índice en country_code
      await queryInterface.addIndex('organizations', ['country_code'], {
        name: 'organizations_country_code',
        transaction
      });

      // 6. Eliminar tabla organization_countries
      await queryInterface.dropTable('organization_countries', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
