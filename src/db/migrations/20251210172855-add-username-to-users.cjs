'use strict';

/**
 * Migración: Agregar campo username a la tabla users
 * 
 * El username se genera automáticamente para usuarios existentes:
 * - Primera letra del nombre + apellido completo (lowercase)
 * - Ejemplo: "Nahuel Basael" -> "nbasael"
 * 
 * El campo es único y se usa para login híbrido (email, public_code o username)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Agregar columna username (nullable primero para poder actualizar datos)
      await queryInterface.addColumn('users', 'username', {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: false,
        comment: 'Nombre de usuario único para login (formato: primera letra nombre + apellido)'
      }, { transaction });

      // 2. Actualizar usuarios existentes con username generado
      // Formato: primera letra del first_name + last_name completo (lowercase, sin espacios ni caracteres especiales)
      await queryInterface.sequelize.query(`
        UPDATE users 
        SET username = LOWER(
          CONCAT(
            SUBSTRING(REGEXP_REPLACE(first_name, '[^a-zA-Z]', '', 'g'), 1, 1),
            REGEXP_REPLACE(last_name, '[^a-zA-Z]', '', 'g')
          )
        )
        WHERE deleted_at IS NULL
      `, { transaction });

      // 3. Manejar duplicados agregando sufijo numérico
      await queryInterface.sequelize.query(`
        WITH duplicates AS (
          SELECT id, username,
            ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
          FROM users
          WHERE deleted_at IS NULL
        )
        UPDATE users u
        SET username = CONCAT(d.username, d.rn)
        FROM duplicates d
        WHERE u.id = d.id AND d.rn > 1
      `, { transaction });

      // 4. Hacer la columna NOT NULL
      await queryInterface.changeColumn('users', 'username', {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Nombre de usuario único para login (formato: primera letra nombre + apellido)'
      }, { transaction });

      // 5. Agregar índice único parcial (solo para usuarios no eliminados)
      await queryInterface.addIndex('users', ['username'], {
        unique: true,
        name: 'users_username_unique',
        where: { deleted_at: null },
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Eliminar índice único
      await queryInterface.removeIndex('users', 'users_username_unique', { transaction });
      
      // Eliminar columna
      await queryInterface.removeColumn('users', 'username', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
