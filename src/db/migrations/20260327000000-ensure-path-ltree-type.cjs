'use strict';

/**
 * Migración idempotente para garantizar que la columna `path`
 * en `resource_hierarchy` sea de tipo `ltree` y no `text`.
 *
 * En producción la columna pudo quedar como `text` por el historial
 * de migraciones previas. Esta migración hace el ALTER solo si
 * la columna aún es `text`, para que sea segura de re-ejecutar.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface) {
        const q = queryInterface.sequelize;

        await q.query(`
            DO $$
            DECLARE
                col_type text;
            BEGIN
                SELECT data_type INTO col_type
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'resource_hierarchy'
                  AND column_name = 'path';

                IF col_type = 'text' THEN
                    ALTER TABLE resource_hierarchy
                        ALTER COLUMN path TYPE ltree USING path::ltree;
                END IF;
            END $$;
        `);
    },

    async down() {
        // No revertimos: hacer el camino inverso (ltree -> text) podría romper
        // índices, triggers y otras dependencias de la columna en la BD.
    }
};
