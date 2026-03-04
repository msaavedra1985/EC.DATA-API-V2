'use strict';

/**
 * Migración: Cambiar reference_id de UUID a VARCHAR(100)
 * 
 * Motivo: El campo reference_id debe almacenar public_codes (ej: CHN-5LYJX-4)
 * en lugar de UUIDs internos, siguiendo la política de seguridad de no exponer
 * identificadores internos en la API.
 * 
 * Cambios:
 * 1. Eliminar índice existente
 * 2. Cambiar tipo de columna de UUID a VARCHAR(100)
 * 3. Recrear índice con nuevo tipo
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Eliminar índice existente (si existe)
      await queryInterface.removeIndex(
        'resource_hierarchy',
        'resource_hierarchy_reference_id_idx',
        { transaction }
      ).catch(() => {
        // Ignorar si el índice no existe
        console.log('Índice resource_hierarchy_reference_id_idx no existe, continuando...');
      });
      
      // 2. Cambiar tipo de columna de UUID a VARCHAR(100)
      // Usamos USING para convertir valores existentes a texto
      await queryInterface.sequelize.query(`
        ALTER TABLE resource_hierarchy 
        ALTER COLUMN reference_id TYPE VARCHAR(100) 
        USING reference_id::text;
      `, { transaction });
      
      // 3. Agregar comentario actualizado
      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN resource_hierarchy.reference_id IS 
        'Public code del recurso referenciado (site, channel, etc). Formato: XXX-YYYYY-Z';
      `, { transaction });
      
      // 4. Recrear índice parcial para reference_id no nulos
      await queryInterface.addIndex('resource_hierarchy', ['reference_id'], {
        name: 'resource_hierarchy_reference_id_idx',
        where: { reference_id: { [Sequelize.Op.ne]: null } },
        transaction
      });
      
      await transaction.commit();
      console.log('✅ Migración completada: reference_id cambiado a VARCHAR(100)');
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Eliminar índice
      await queryInterface.removeIndex(
        'resource_hierarchy',
        'resource_hierarchy_reference_id_idx',
        { transaction }
      ).catch(() => {});
      
      // 2. Limpiar valores que no sean UUID válidos antes de revertir
      // Esto es necesario porque VARCHAR puede contener valores no-UUID
      await queryInterface.sequelize.query(`
        UPDATE resource_hierarchy 
        SET reference_id = NULL 
        WHERE reference_id IS NOT NULL 
          AND reference_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      `, { transaction });
      
      // 3. Revertir a UUID
      await queryInterface.sequelize.query(`
        ALTER TABLE resource_hierarchy 
        ALTER COLUMN reference_id TYPE UUID 
        USING reference_id::uuid;
      `, { transaction });
      
      // 4. Recrear índice
      await queryInterface.addIndex('resource_hierarchy', ['reference_id'], {
        name: 'resource_hierarchy_reference_id_idx',
        where: { reference_id: { [Sequelize.Op.ne]: null } },
        transaction
      });
      
      await transaction.commit();
      console.log('✅ Rollback completado: reference_id revertido a UUID');
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
