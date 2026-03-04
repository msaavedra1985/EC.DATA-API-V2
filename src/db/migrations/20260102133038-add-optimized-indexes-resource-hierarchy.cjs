'use strict';

/**
 * Migración: Agregar índices optimizados para Resource Hierarchy
 * 
 * Esta migración agrega índices compuestos y parciales para optimizar:
 * - Consultas de children_count (subconsulta de conteo de hijos)
 * - Listados de nodos raíz por organización
 * - Consultas de nodos activos
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Índice parcial compuesto para consultas de children_count
      // Optimiza: SELECT COUNT(*) FROM resource_hierarchy WHERE parent_id = ? AND is_active = true AND deleted_at IS NULL
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS resource_hierarchy_children_count_idx 
        ON resource_hierarchy (parent_id) 
        WHERE is_active = true AND deleted_at IS NULL
      `, { transaction });

      // Índice compuesto para listados de nodos raíz ordenados por display_order
      // Optimiza: SELECT * FROM resource_hierarchy WHERE organization_id = ? AND parent_id IS NULL ORDER BY display_order
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS resource_hierarchy_org_root_order_idx 
        ON resource_hierarchy (organization_id, display_order) 
        WHERE parent_id IS NULL AND is_active = true AND deleted_at IS NULL
      `, { transaction });

      // Índice parcial para nodos activos no eliminados (uso general)
      // Optimiza consultas que filtran por is_active y deleted_at frecuentemente
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS resource_hierarchy_active_not_deleted_idx 
        ON resource_hierarchy (organization_id, parent_id) 
        WHERE is_active = true AND deleted_at IS NULL
      `, { transaction });

      await transaction.commit();
      
      console.log('✅ Índices optimizados creados exitosamente');
    } catch (error) {
      await transaction.rollback();
      
      // Si falla CONCURRENTLY por estar en transacción, intentar sin CONCURRENTLY
      console.log('⚠️ Reintentando creación de índices sin CONCURRENTLY...');
      
      // Índice parcial para children_count
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS resource_hierarchy_children_count_idx 
        ON resource_hierarchy (parent_id) 
        WHERE is_active = true AND deleted_at IS NULL
      `);

      // Índice para nodos raíz ordenados
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS resource_hierarchy_org_root_order_idx 
        ON resource_hierarchy (organization_id, display_order) 
        WHERE parent_id IS NULL AND is_active = true AND deleted_at IS NULL
      `);

      // Índice para nodos activos no eliminados
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS resource_hierarchy_active_not_deleted_idx 
        ON resource_hierarchy (organization_id, parent_id) 
        WHERE is_active = true AND deleted_at IS NULL
      `);
      
      console.log('✅ Índices optimizados creados exitosamente (sin CONCURRENTLY)');
    }
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices en orden inverso
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS resource_hierarchy_active_not_deleted_idx
    `);
    
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS resource_hierarchy_org_root_order_idx
    `);
    
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS resource_hierarchy_children_count_idx
    `);
    
    console.log('✅ Índices optimizados eliminados');
  }
};
