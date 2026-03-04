'use strict';

/**
 * Migración: Crear tabla user_resource_access
 * 
 * Define qué usuarios tienen acceso a qué nodos de la jerarquía de recursos.
 * Soporta herencia de permisos a descendientes mediante el flag include_descendants.
 * 
 * Casos de uso:
 * - Usuario con acceso a "Zona Norte" ve todos los sites y canales debajo
 * - Usuario con acceso solo a un site específico no ve otros
 * - Admins tienen acceso implícito a todo (no necesitan registros aquí)
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear ENUM para tipo de acceso
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE resource_access_type AS ENUM (
          'view',
          'edit',
          'admin'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ ENUM resource_access_type creado');

    // Crear tabla user_resource_access
    await queryInterface.createTable('user_resource_access', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a users - usuario que recibe el acceso'
      },
      resource_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'resource_hierarchy',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a resource_hierarchy - nodo al que se otorga acceso'
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a organizations - denormalizado para queries rápidas'
      },
      access_type: {
        type: 'resource_access_type',
        allowNull: false,
        defaultValue: 'view',
        comment: 'Nivel de acceso: view (solo lectura), edit (modificar datos), admin (gestionar permisos)'
      },
      include_descendants: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Si true, el acceso se hereda a todos los nodos descendientes'
      },
      granted_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a users - usuario que otorgó este acceso'
      },
      granted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Fecha en que se otorgó el acceso'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Fecha de expiración del acceso (null = permanente)'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notas o razón del otorgamiento de acceso'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Permite desactivar el acceso sin eliminar el registro'
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
    console.log('✅ Tabla user_resource_access creada');

    // Índice único: un usuario no puede tener duplicados de acceso al mismo nodo
    await queryInterface.addIndex('user_resource_access', ['user_id', 'resource_node_id'], {
      name: 'user_resource_access_unique_idx',
      unique: true
    });

    // Índice por user_id para buscar todos los accesos de un usuario
    await queryInterface.addIndex('user_resource_access', ['user_id'], {
      name: 'user_resource_access_user_id_idx'
    });

    // Índice por resource_node_id para buscar todos los usuarios con acceso a un nodo
    await queryInterface.addIndex('user_resource_access', ['resource_node_id'], {
      name: 'user_resource_access_resource_node_id_idx'
    });

    // Índice por organization_id para filtrar por organización
    await queryInterface.addIndex('user_resource_access', ['organization_id'], {
      name: 'user_resource_access_organization_id_idx'
    });

    // Índice compuesto para verificación rápida de permisos
    await queryInterface.addIndex('user_resource_access', ['user_id', 'organization_id', 'is_active'], {
      name: 'user_resource_access_user_org_active_idx'
    });

    // Índice por expires_at para limpiar accesos expirados
    await queryInterface.addIndex('user_resource_access', ['expires_at'], {
      name: 'user_resource_access_expires_at_idx',
      where: { expires_at: { [Sequelize.Op.ne]: null } }
    });

    // Índice por is_active
    await queryInterface.addIndex('user_resource_access', ['is_active'], {
      name: 'user_resource_access_is_active_idx'
    });

    console.log('✅ Índices creados');

    // Función para verificar si un usuario tiene acceso a un nodo (incluyendo herencia)
    await queryInterface.sequelize.query(`
      -- Función para verificar acceso a un nodo considerando herencia
      CREATE OR REPLACE FUNCTION check_resource_access(
        p_user_id UUID,
        p_node_id UUID,
        p_required_access resource_access_type DEFAULT 'view'
      )
      RETURNS BOOLEAN AS $$
      DECLARE
        node_path ltree;
        has_access BOOLEAN;
      BEGIN
        -- Obtener el path del nodo objetivo
        SELECT path INTO node_path
        FROM resource_hierarchy
        WHERE id = p_node_id AND deleted_at IS NULL;
        
        IF node_path IS NULL THEN
          RETURN FALSE;
        END IF;
        
        -- Verificar si el usuario tiene acceso directo o heredado
        SELECT EXISTS (
          SELECT 1 
          FROM user_resource_access ura
          JOIN resource_hierarchy rh ON ura.resource_node_id = rh.id
          WHERE ura.user_id = p_user_id
            AND ura.is_active = true
            AND (ura.expires_at IS NULL OR ura.expires_at > CURRENT_TIMESTAMP)
            AND (
              -- Acceso directo al nodo
              ura.resource_node_id = p_node_id
              OR
              -- Acceso heredado desde un ancestro
              (ura.include_descendants = true AND node_path <@ rh.path)
            )
            AND (
              -- Verificar nivel de acceso suficiente
              ura.access_type = 'admin'
              OR (p_required_access = 'edit' AND ura.access_type IN ('edit', 'admin'))
              OR (p_required_access = 'view' AND ura.access_type IN ('view', 'edit', 'admin'))
            )
        ) INTO has_access;
        
        RETURN has_access;
      END;
      $$ LANGUAGE plpgsql;

      COMMENT ON FUNCTION check_resource_access(UUID, UUID, resource_access_type) IS 
        'Verifica si un usuario tiene acceso a un nodo, considerando herencia desde ancestros';
    `);
    console.log('✅ Función check_resource_access creada');

    // Función para obtener todos los nodos accesibles por un usuario
    await queryInterface.sequelize.query(`
      -- Función para obtener IDs de todos los nodos accesibles
      CREATE OR REPLACE FUNCTION get_accessible_resource_ids(
        p_user_id UUID,
        p_organization_id UUID,
        p_access_type resource_access_type DEFAULT 'view'
      )
      RETURNS TABLE(node_id UUID) AS $$
      BEGIN
        RETURN QUERY
        SELECT DISTINCT rh.id
        FROM resource_hierarchy rh
        WHERE rh.organization_id = p_organization_id
          AND rh.deleted_at IS NULL
          AND rh.is_active = true
          AND (
            -- El nodo tiene acceso directo
            EXISTS (
              SELECT 1 FROM user_resource_access ura
              WHERE ura.user_id = p_user_id
                AND ura.resource_node_id = rh.id
                AND ura.is_active = true
                AND (ura.expires_at IS NULL OR ura.expires_at > CURRENT_TIMESTAMP)
                AND (
                  ura.access_type = 'admin'
                  OR (p_access_type = 'edit' AND ura.access_type IN ('edit', 'admin'))
                  OR (p_access_type = 'view')
                )
            )
            OR
            -- El nodo hereda acceso de un ancestro
            EXISTS (
              SELECT 1 
              FROM user_resource_access ura
              JOIN resource_hierarchy ancestor ON ura.resource_node_id = ancestor.id
              WHERE ura.user_id = p_user_id
                AND ura.include_descendants = true
                AND ura.is_active = true
                AND (ura.expires_at IS NULL OR ura.expires_at > CURRENT_TIMESTAMP)
                AND rh.path <@ ancestor.path
                AND (
                  ura.access_type = 'admin'
                  OR (p_access_type = 'edit' AND ura.access_type IN ('edit', 'admin'))
                  OR (p_access_type = 'view')
                )
            )
          );
      END;
      $$ LANGUAGE plpgsql;

      COMMENT ON FUNCTION get_accessible_resource_ids(UUID, UUID, resource_access_type) IS 
        'Retorna todos los IDs de nodos a los que un usuario tiene acceso en una organización';
    `);
    console.log('✅ Función get_accessible_resource_ids creada');

    console.log('✅ Migración completada exitosamente');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar funciones
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS get_accessible_resource_ids(UUID, UUID, resource_access_type);
      DROP FUNCTION IF EXISTS check_resource_access(UUID, UUID, resource_access_type);
    `);

    // Eliminar tabla
    await queryInterface.dropTable('user_resource_access');

    // Eliminar ENUM
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS resource_access_type;
    `);

    console.log('✅ Migración revertida');
  }
};
