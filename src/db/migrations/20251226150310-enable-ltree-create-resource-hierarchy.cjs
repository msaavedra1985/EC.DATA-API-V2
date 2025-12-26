'use strict';

/**
 * Migración: Habilitar extensión ltree y crear tabla resource_hierarchy
 * 
 * Esta tabla implementa una jerarquía de recursos (carpetas, sites, canales)
 * para cada organización usando el patrón híbrido parent_id + ltree path.
 * 
 * Beneficios de ltree:
 * - Queries ultra-rápidas para ancestros/descendientes con operadores nativos
 * - Índices GiST optimizados para árboles
 * - Sin límite de profundidad
 * 
 * Ejemplos de operadores ltree:
 * - path <@ 'org1.folder1' -> todos los descendientes de folder1
 * - path @> 'org1.folder1.site1' -> todos los ancestros de site1
 * - path ~ 'org1.*{1}' -> hijos directos de org1
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Habilitar extensión ltree (necesaria para el tipo de dato ltree)
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS ltree;
    `);
    console.log('✅ Extensión ltree habilitada');

    // Crear ENUM para tipo de nodo
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE resource_node_type AS ENUM (
          'folder',
          'site', 
          'channel'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ ENUM resource_node_type creado');

    // Crear tabla resource_hierarchy
    await queryInterface.createTable('resource_hierarchy', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
      },
      human_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        unique: true,
        comment: 'ID incremental global para uso interno/soporte'
      },
      public_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: RES-7K9D2-X) - previene enumeración'
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a organizations - cada org tiene su propia jerarquía aislada'
      },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'resource_hierarchy',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK self-reference - nodo padre (null para nodos raíz)'
      },
      node_type: {
        type: 'resource_node_type',
        allowNull: false,
        comment: 'Tipo de nodo: folder, site, channel'
      },
      reference_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'FK opcional al recurso real (site_id, channel_id). Null para carpetas.'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Nombre visible del nodo en la jerarquía'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Descripción opcional del nodo'
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Icono para mostrar en el árbol (ej: folder, building, sensor)'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Orden de visualización entre hermanos (menor = primero)'
      },
      depth: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Profundidad en el árbol (0 = raíz). Calculado automáticamente.'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadatos adicionales del nodo (configuración, permisos especiales, etc.)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el nodo está activo'
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
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Fecha de soft delete'
      }
    });
    console.log('✅ Tabla resource_hierarchy creada');

    // Agregar columna ltree path (requiere SQL raw porque Sequelize no soporta ltree)
    await queryInterface.sequelize.query(`
      ALTER TABLE resource_hierarchy 
      ADD COLUMN path ltree;
      
      COMMENT ON COLUMN resource_hierarchy.path IS 
        'Path materializado como ltree para queries rápidas de ancestros/descendientes. Formato: org_<uuid>.node_<uuid>.node_<uuid>';
    `);
    console.log('✅ Columna path ltree agregada');

    // Crear índices
    // Índice GiST para ltree (esencial para performance)
    await queryInterface.sequelize.query(`
      CREATE INDEX resource_hierarchy_path_gist_idx 
      ON resource_hierarchy USING GIST (path);
    `);
    console.log('✅ Índice GiST para ltree creado');

    // Índice compuesto organization_id + path para queries filtradas por org
    await queryInterface.sequelize.query(`
      CREATE INDEX resource_hierarchy_org_path_idx 
      ON resource_hierarchy (organization_id, path);
    `);

    // Índice por parent_id para navegación directa padre-hijo
    await queryInterface.addIndex('resource_hierarchy', ['parent_id'], {
      name: 'resource_hierarchy_parent_id_idx'
    });

    // Índice por organization_id
    await queryInterface.addIndex('resource_hierarchy', ['organization_id'], {
      name: 'resource_hierarchy_organization_id_idx'
    });

    // Índice por node_type para filtrar por tipo
    await queryInterface.addIndex('resource_hierarchy', ['node_type'], {
      name: 'resource_hierarchy_node_type_idx'
    });

    // Índice por reference_id para buscar nodos por recurso vinculado
    await queryInterface.addIndex('resource_hierarchy', ['reference_id'], {
      name: 'resource_hierarchy_reference_id_idx',
      where: { reference_id: { [Sequelize.Op.ne]: null } }
    });

    // Índice compuesto para buscar por nombre dentro de una org
    await queryInterface.addIndex('resource_hierarchy', ['organization_id', 'name'], {
      name: 'resource_hierarchy_org_name_idx'
    });

    // Índice por is_active
    await queryInterface.addIndex('resource_hierarchy', ['is_active'], {
      name: 'resource_hierarchy_is_active_idx'
    });

    // Índice por display_order para ordenamiento
    await queryInterface.addIndex('resource_hierarchy', ['parent_id', 'display_order'], {
      name: 'resource_hierarchy_parent_order_idx'
    });

    // Índice único: dentro de una org, no puede haber dos nodos con el mismo nombre bajo el mismo padre
    await queryInterface.addIndex('resource_hierarchy', ['organization_id', 'parent_id', 'name'], {
      name: 'resource_hierarchy_unique_name_per_parent_idx',
      unique: true,
      where: { deleted_at: null }
    });

    console.log('✅ Todos los índices creados');

    // Crear función para actualizar automáticamente el path ltree
    await queryInterface.sequelize.query(`
      -- Función para generar path ltree desde un nodo
      CREATE OR REPLACE FUNCTION generate_resource_path(node_id UUID)
      RETURNS ltree AS $$
      DECLARE
        result ltree;
        current_id UUID;
        current_path TEXT;
      BEGIN
        current_path := '';
        current_id := node_id;
        
        -- Recorrer hacia arriba hasta la raíz
        WHILE current_id IS NOT NULL LOOP
          -- Agregar al inicio del path (formato: n_<primeros 8 chars del uuid>)
          current_path := 'n' || replace(left(current_id::text, 8), '-', '') || 
                          CASE WHEN current_path = '' THEN '' ELSE '.' || current_path END;
          
          -- Obtener el parent
          SELECT parent_id INTO current_id 
          FROM resource_hierarchy 
          WHERE id = current_id;
        END LOOP;
        
        RETURN current_path::ltree;
      END;
      $$ LANGUAGE plpgsql;

      COMMENT ON FUNCTION generate_resource_path(UUID) IS 
        'Genera el path ltree completo para un nodo recorriendo sus ancestros';
    `);
    console.log('✅ Función generate_resource_path creada');

    // Crear trigger para mantener el path actualizado
    await queryInterface.sequelize.query(`
      -- Función trigger para actualizar paths
      CREATE OR REPLACE FUNCTION update_resource_hierarchy_path()
      RETURNS TRIGGER AS $$
      DECLARE
        old_path ltree;
        new_path ltree;
      BEGIN
        -- Generar nuevo path para el nodo
        NEW.path := generate_resource_path(NEW.id);
        
        -- Calcular depth
        IF NEW.parent_id IS NULL THEN
          NEW.depth := 0;
        ELSE
          SELECT depth + 1 INTO NEW.depth
          FROM resource_hierarchy
          WHERE id = NEW.parent_id;
        END IF;
        
        -- Si es UPDATE y cambió el parent, actualizar paths de todos los descendientes
        IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
          old_path := OLD.path;
          new_path := NEW.path;
          
          -- Actualizar todos los descendientes
          UPDATE resource_hierarchy
          SET path = new_path || subpath(path, nlevel(old_path)),
              depth = nlevel(new_path || subpath(path, nlevel(old_path))) - 1
          WHERE path <@ old_path AND id != NEW.id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Crear trigger BEFORE INSERT OR UPDATE
      CREATE TRIGGER resource_hierarchy_path_trigger
      BEFORE INSERT OR UPDATE ON resource_hierarchy
      FOR EACH ROW
      EXECUTE FUNCTION update_resource_hierarchy_path();

      COMMENT ON FUNCTION update_resource_hierarchy_path() IS 
        'Trigger que mantiene sincronizado el path ltree y depth cuando un nodo se crea o mueve';
    `);
    console.log('✅ Trigger para actualización automática de paths creado');

    console.log('✅ Migración completada exitosamente');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar trigger y funciones
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS resource_hierarchy_path_trigger ON resource_hierarchy;
      DROP FUNCTION IF EXISTS update_resource_hierarchy_path();
      DROP FUNCTION IF EXISTS generate_resource_path(UUID);
    `);

    // Eliminar tabla
    await queryInterface.dropTable('resource_hierarchy');

    // Eliminar ENUM
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS resource_node_type;
    `);

    // Nota: No eliminamos la extensión ltree porque puede estar siendo usada por otros

    console.log('✅ Migración revertida');
  }
};
