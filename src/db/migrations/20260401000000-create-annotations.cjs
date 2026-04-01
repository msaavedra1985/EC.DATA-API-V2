'use strict';

/**
 * Migración: Crear tabla annotations
 *
 * Soporte para anotaciones sobre puntos o rangos de tiempo en canales de telemetría.
 * Las anotaciones pueden ser point-in-time (fromTs === toTs) o range (fromTs < toTs).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const q = queryInterface.sequelize;

        // Crear ENUMs con manejo de duplicados
        await q.query(`
            DO $$ BEGIN
                CREATE TYPE annotation_category AS ENUM ('observation', 'incident', 'maintenance', 'alert_auto');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);

        await q.query(`
            DO $$ BEGIN
                CREATE TYPE annotation_visibility AS ENUM ('public', 'private');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);

        await q.query(`
            CREATE TABLE IF NOT EXISTS annotations (
                id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                channel_id   UUID NOT NULL REFERENCES channels(id) ON UPDATE CASCADE ON DELETE CASCADE,
                from_ts      BIGINT NOT NULL,
                to_ts        BIGINT NOT NULL,
                text         TEXT NOT NULL,
                category     annotation_category NOT NULL DEFAULT 'observation',
                visibility   annotation_visibility NOT NULL DEFAULT 'public',
                author_id    UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        await q.query(`
            CREATE INDEX IF NOT EXISTS annotations_channel_id_idx
                ON annotations (channel_id);
            CREATE INDEX IF NOT EXISTS annotations_author_id_idx
                ON annotations (author_id);
            CREATE INDEX IF NOT EXISTS annotations_channel_range_idx
                ON annotations (channel_id, from_ts, to_ts);
        `);
    },

    async down(queryInterface, Sequelize) {
        const q = queryInterface.sequelize;

        await q.query(`DROP TABLE IF EXISTS annotations;`);
        await q.query(`DROP TYPE IF EXISTS annotation_category;`);
        await q.query(`DROP TYPE IF EXISTS annotation_visibility;`);
    }
};
