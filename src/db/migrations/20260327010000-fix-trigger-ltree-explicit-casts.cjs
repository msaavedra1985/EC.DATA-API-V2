'use strict';

/**
 * Migración que re-crea el trigger `update_resource_hierarchy_path` con:
 *
 * 1. Casts explícitos ::ltree en todas las operaciones sobre la columna `path`
 *    para evitar el error `operator does not exist: text <@ ltree`.
 *
 * 2. Cálculo de path usando NEW.parent_id (no el valor obsoleto de la tabla)
 *    para que la ruta generada refleje correctamente el nuevo padre al mover un nodo.
 *
 * 3. Protección contra recursión: solo recalcula path/depth cuando cambia parent_id
 *    (o en INSERT), evitando que la actualización en cascada de descendientes
 *    sobreescriba los valores correctos ya escritos por el trigger del padre.
 *
 * 4. Revierte la columna `path` a tipo TEXT si estuviera como ltree (migración
 *    previa 20260327000000), ya que el Sequelize ORM envía valores de tipo text
 *    y el trigger siempre recalcula el valor correcto.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface) {
        const q = queryInterface.sequelize;

        await q.query(`
            DO $$
            DECLARE col_type text;
            BEGIN
                SELECT data_type INTO col_type
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'resource_hierarchy'
                  AND column_name = 'path';
                IF col_type != 'text' THEN
                    ALTER TABLE resource_hierarchy
                        ALTER COLUMN path TYPE text USING path::text;
                END IF;
            END $$;
        `);

        await q.query(`
            CREATE OR REPLACE FUNCTION update_resource_hierarchy_path()
            RETURNS TRIGGER AS $$
            DECLARE
                old_path ltree;
                new_path ltree;
                parent_path ltree;
                node_label text;
            BEGIN
                IF TG_OP = 'INSERT' OR OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
                    node_label := 'n' || replace(NEW.id::text, '-', '');
                    IF NEW.parent_id IS NULL THEN
                        new_path := node_label::ltree;
                        NEW.depth := 0;
                    ELSE
                        SELECT path::ltree, depth + 1 INTO parent_path, NEW.depth
                        FROM resource_hierarchy
                        WHERE id = NEW.parent_id;
                        new_path := parent_path || node_label::ltree;
                    END IF;
                    NEW.path := new_path::text;

                    IF TG_OP = 'UPDATE' THEN
                        old_path := OLD.path::ltree;
                        UPDATE resource_hierarchy
                        SET path = (new_path || subpath(path::ltree, nlevel(old_path)))::text,
                            depth = nlevel(new_path || subpath(path::ltree, nlevel(old_path))) - 1
                        WHERE path::ltree <@ old_path AND id != NEW.id;
                    END IF;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS resource_hierarchy_path_trigger ON resource_hierarchy;
            CREATE TRIGGER resource_hierarchy_path_trigger
            BEFORE INSERT OR UPDATE ON resource_hierarchy
            FOR EACH ROW
            EXECUTE FUNCTION update_resource_hierarchy_path();
        `);
    },

    async down(queryInterface) {
        const q = queryInterface.sequelize;

        await q.query(`
            CREATE OR REPLACE FUNCTION update_resource_hierarchy_path()
            RETURNS TRIGGER AS $$
            DECLARE
                old_path ltree;
                new_path ltree;
            BEGIN
                NEW.path := generate_resource_path(NEW.id);
                IF NEW.parent_id IS NULL THEN
                    NEW.depth := 0;
                ELSE
                    SELECT depth + 1 INTO NEW.depth
                    FROM resource_hierarchy
                    WHERE id = NEW.parent_id;
                END IF;
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

            DROP TRIGGER IF EXISTS resource_hierarchy_path_trigger ON resource_hierarchy;
            CREATE TRIGGER resource_hierarchy_path_trigger
            BEFORE INSERT OR UPDATE ON resource_hierarchy
            FOR EACH ROW
            EXECUTE FUNCTION update_resource_hierarchy_path();
        `);
    }
};
