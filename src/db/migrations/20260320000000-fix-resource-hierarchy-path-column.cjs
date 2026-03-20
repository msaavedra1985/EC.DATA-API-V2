'use strict';

/**
 * Migración correctiva: Asegurar columna path ltree en resource_hierarchy
 *
 * Problema: el trigger update_resource_hierarchy_path() fallaba con
 * "record new has no field path" porque la columna path ltree no existía
 * en la tabla, indicando que la migración original se ejecutó de forma incompleta.
 *
 * Esta migración:
 * 1. Verifica si la columna path existe; si no, la añade.
 * 2. Verifica si el índice GiST existe; si no, lo crea.
 * 3. Recrea (CREATE OR REPLACE) la función generate_resource_path y el trigger.
 * 4. Rellena path en los registros existentes.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    // 1. Asegurar extensión ltree
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS ltree;
    `);
    console.log('✅ Extensión ltree verificada');

    // 2. Añadir columna path si no existe
    const tableDescription = await queryInterface.describeTable('resource_hierarchy');
    if (!tableDescription.path) {
      await queryInterface.sequelize.query(`
        ALTER TABLE resource_hierarchy ADD COLUMN path ltree;
      `);
      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN resource_hierarchy.path IS
          'Path materializado como ltree para queries rápidas de ancestros/descendientes. Formato: n<UUID sin guiones>.n<UUID sin guiones>';
      `);
      console.log('✅ Columna path ltree añadida');
    } else {
      console.log('ℹ️  Columna path ya existe, se omite ALTER TABLE');
    }

    // 3. Crear índice GiST si no existe
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'resource_hierarchy'
            AND indexname = 'resource_hierarchy_path_gist_idx'
        ) THEN
          CREATE INDEX resource_hierarchy_path_gist_idx
            ON resource_hierarchy USING GIST (path);
          RAISE NOTICE 'Índice GiST creado';
        ELSE
          RAISE NOTICE 'Índice GiST ya existe';
        END IF;
      END $$;
    `);
    console.log('✅ Índice GiST verificado/creado');

    // 4. Recrear función generate_resource_path (CREATE OR REPLACE)
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION generate_resource_path(node_id UUID)
      RETURNS ltree AS $$
      DECLARE
        result ltree;
        current_id UUID;
        current_path TEXT;
        node_label TEXT;
      BEGIN
        current_path := '';
        current_id := node_id;

        -- Recorrer hacia arriba hasta la raíz
        WHILE current_id IS NOT NULL LOOP
          -- Formato: n<UUID completo sin guiones> (32 chars, garantiza unicidad)
          node_label := 'n' || replace(current_id::text, '-', '');
          current_path := node_label ||
                          CASE WHEN current_path = '' THEN '' ELSE '.' || current_path END;

          SELECT parent_id INTO current_id
          FROM resource_hierarchy
          WHERE id = current_id;
        END LOOP;

        RETURN current_path::ltree;
      END;
      $$ LANGUAGE plpgsql;

      COMMENT ON FUNCTION generate_resource_path(UUID) IS
        'Genera el path ltree completo para un nodo recorriendo sus ancestros. Usa UUID completo (32 chars) para unicidad absoluta.';
    `);
    console.log('✅ Función generate_resource_path recreada (CREATE OR REPLACE)');

    // 5. Recrear función trigger y trigger (DROP + CREATE para el trigger)
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS resource_hierarchy_path_trigger ON resource_hierarchy;
    `);

    await queryInterface.sequelize.query(`
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

          UPDATE resource_hierarchy
          SET path = new_path || subpath(path, nlevel(old_path)),
              depth = nlevel(new_path || subpath(path, nlevel(old_path))) - 1
          WHERE path <@ old_path AND id != NEW.id;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      COMMENT ON FUNCTION update_resource_hierarchy_path() IS
        'Trigger que mantiene sincronizado el path ltree y depth cuando un nodo se crea o mueve';
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER resource_hierarchy_path_trigger
      BEFORE INSERT OR UPDATE ON resource_hierarchy
      FOR EACH ROW
      EXECUTE FUNCTION update_resource_hierarchy_path();
    `);
    console.log('✅ Trigger resource_hierarchy_path_trigger recreado');

    // 6. Poblar path en registros existentes que tengan path NULL
    await queryInterface.sequelize.query(`
      UPDATE resource_hierarchy
      SET path = generate_resource_path(id)
      WHERE path IS NULL;
    `);
    console.log('✅ Path poblado en registros existentes (donde era NULL)');

    console.log('✅ Migración correctiva completada exitosamente');
  },

  async down(queryInterface) {
    // Revertir: eliminar trigger, función y columna path
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS resource_hierarchy_path_trigger ON resource_hierarchy;
      DROP FUNCTION IF EXISTS update_resource_hierarchy_path();
      DROP FUNCTION IF EXISTS generate_resource_path(UUID);
    `);

    // Eliminar índice GiST
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS resource_hierarchy_path_gist_idx;
    `);

    // Eliminar columna path (solo si existe)
    const tableDescription = await queryInterface.describeTable('resource_hierarchy');
    if (tableDescription.path) {
      await queryInterface.sequelize.query(`
        ALTER TABLE resource_hierarchy DROP COLUMN path;
      `);
      console.log('✅ Columna path eliminada');
    }

    console.log('✅ Migración correctiva revertida');
  }
};
