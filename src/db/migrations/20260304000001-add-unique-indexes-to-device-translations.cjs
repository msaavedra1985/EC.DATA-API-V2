'use strict';

/**
 * Agrega índices únicos compuestos a las tablas de traducción de device-metadata.
 * 
 * Problema que resuelve:
 *   Los modelos de traducción no tenían `indexes` definidos, por lo que sync() no creaba
 *   las constraints únicas. El seeder usa ON CONFLICT (parent_id, lang) que requiere
 *   que existan esas constraints en la DB.
 * 
 * Cuándo aplica esta migración:
 *   - DBs creadas con db:setup ANTES de este fix (no tienen los índices)
 *   - Se usa IF NOT EXISTS para ser idempotente (seguro si se re-corre)
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS device_type_translations_type_lang_idx
                ON device_type_translations (device_type_id, lang);

            CREATE UNIQUE INDEX IF NOT EXISTS device_brand_translations_brand_lang_idx
                ON device_brand_translations (device_brand_id, lang);

            CREATE UNIQUE INDEX IF NOT EXISTS device_network_translations_network_lang_idx
                ON device_network_translations (device_network_id, lang);

            CREATE UNIQUE INDEX IF NOT EXISTS device_server_translations_server_lang_idx
                ON device_server_translations (device_server_id, lang);

            CREATE UNIQUE INDEX IF NOT EXISTS device_model_translations_model_lang_idx
                ON device_model_translations (device_model_id, lang);
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            DROP INDEX IF EXISTS device_type_translations_type_lang_idx;
            DROP INDEX IF EXISTS device_brand_translations_brand_lang_idx;
            DROP INDEX IF EXISTS device_network_translations_network_lang_idx;
            DROP INDEX IF EXISTS device_server_translations_server_lang_idx;
            DROP INDEX IF EXISTS device_model_translations_model_lang_idx;
        `);
    }
};
