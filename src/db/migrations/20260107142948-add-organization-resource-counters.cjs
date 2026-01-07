'use strict';

/**
 * Migración: Crear tabla organization_resource_counters
 * 
 * Esta tabla almacena contadores de human_id por organización para
 * evitar el costoso SELECT MAX(human_id) en cada inserción.
 * 
 * También agrega índice para acelerar validación de reference_id duplicados.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear tabla de contadores por organización
    await queryInterface.createTable('organization_resource_counters', {
      organization_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a organizations - cada org tiene su contador'
      },
      last_value: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Último human_id asignado en esta organización'
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

    console.log('✅ Tabla organization_resource_counters creada');

    // Crear índice parcial único para validación de reference_id duplicados
    // Esto acelera la búsqueda de nodos por reference_id dentro de una org
    await queryInterface.addIndex('resource_hierarchy', 
      ['organization_id', 'reference_id'], 
      {
        name: 'resource_hierarchy_org_reference_unique_idx',
        unique: true,
        where: {
          reference_id: { [Sequelize.Op.ne]: null },
          deleted_at: null
        }
      }
    );

    console.log('✅ Índice único para (organization_id, reference_id) creado');

    // Inicializar contadores para organizaciones existentes basándose en
    // el máximo human_id actual de cada organización
    await queryInterface.sequelize.query(`
      INSERT INTO organization_resource_counters (organization_id, last_value, created_at, updated_at)
      SELECT 
        organization_id, 
        COALESCE(MAX(human_id), 0) as last_value,
        NOW(),
        NOW()
      FROM resource_hierarchy
      WHERE deleted_at IS NULL
      GROUP BY organization_id
      ON CONFLICT (organization_id) DO NOTHING
    `);

    console.log('✅ Contadores inicializados para organizaciones existentes');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índice
    await queryInterface.removeIndex('resource_hierarchy', 'resource_hierarchy_org_reference_unique_idx');
    console.log('✅ Índice resource_hierarchy_org_reference_unique_idx eliminado');

    // Eliminar tabla de contadores
    await queryInterface.dropTable('organization_resource_counters');
    console.log('✅ Tabla organization_resource_counters eliminada');
  }
};
