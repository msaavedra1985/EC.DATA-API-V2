/**
 * Script de inicialización para base de datos vacía en producción.
 *
 * Problema que resuelve:
 *   Las migraciones asumen que las tablas base ya existen (fueron creadas originalmente
 *   por sequelize.sync() en desarrollo). En una DB vacía en producción, las migraciones
 *   fallan porque intentan hacer ALTER TABLE sobre tablas que no existen.
 *
 * Qué hace este script:
 *   1. Importa todos los modelos Sequelize para registrarlos
 *   2. Llama sequelize.sync({ alter: false }) → crea todas las tablas desde los modelos
 *   3. Crea la tabla SequelizeMeta (registro interno de sequelize-cli)
 *   4. Inserta las 41 migraciones históricas como "ya ejecutadas"
 *      → Esto evita que db:migrate las intente correr sobre tablas recién creadas
 *
 * Uso:
 *   Fresh DB:    npm run db:setup → npm run db:seed:core → npm run db:seed → npm start
 *   Re-deploy:   npm run db:migrate → npm start  (solo migraciones nuevas)
 */

import '../sql/sequelize.js';

// --- Modelos base + asociaciones ---
import '../models.js';

// --- Modelos adicionales no incluidos en models.js ---
import '../../modules/asset-categories/models/AssetCategory.js';
import '../../modules/audit/models/AuditLog.js';
import '../../modules/channels/models/Channel.js';
import '../../modules/device-metadata/models/index.js';
import '../../modules/devices/models/Device.js';
import '../../modules/error-logs/models/ErrorLog.js';
import '../../modules/files/models/FileUpload.js';
import '../../modules/locations/models/index.js';
import '../../modules/organizations/models/OrganizationCountry.js';
import '../../modules/resource-hierarchy/models/ResourceHierarchy.js';
import '../../modules/resource-hierarchy/models/UserResourceAccess.js';
import '../../modules/telemetry/models/index.js';

import sequelize from '../sql/sequelize.js';

// Migraciones históricas a registrar como ya ejecutadas
const HISTORICAL_MIGRATIONS = [
    '20251125131324-add-extended-fields-to-sites.cjs',
    '20251125132505-create-devices-table.cjs',
    '20251125133435-create-channels-table.cjs',
    '20251125171305-create-file-uploads-table.cjs',
    '20251210172855-add-username-to-users.cjs',
    '20251218144401-add-ch-to-channels.cjs',
    '20251218144402-add-timezone-to-devices.cjs',
    '20251218144403-create-measurement-types-table.cjs',
    '20251218144404-create-measurement-type-translations-table.cjs',
    '20251218144405-create-variables-table.cjs',
    '20251218144406-create-variable-translations-table.cjs',
    '20251218144407-create-channel-variables-table.cjs',
    '20251218144408-add-measurement-type-to-channels.cjs',
    '20251218200000-modify-channels-device-ch-unique-for-energy.cjs',
    '20251226150310-enable-ltree-create-resource-hierarchy.cjs',
    '20251226150311-create-user-resource-access.cjs',
    '20260102133038-add-optimized-indexes-resource-hierarchy.cjs',
    '20260102194617-change-reference-id-to-varchar.cjs',
    '20260107142948-add-organization-resource-counters.cjs',
    '20260115131311-add-impersonated-org-id-to-audit-logs.cjs',
    '20260127161526-migration-step1-add-country-code-columns.cjs',
    '20260127161616-migration-step2-change-countries-pk.cjs',
    '20260127161703-migration-step3-create-states-tables.cjs',
    '20260127161706-migration-step4-create-cities-tables.cjs',
    '20260127220127-create-asset-categories-table.cjs',
    '20260127220128-add-asset-category-to-channels.cjs',
    '20260128150000-move-asset-category-to-resource-hierarchy.cjs',
    '20260130180000-create-device-catalog-tables.cjs',
    '20260209180000-create-organization-countries-table.cjs',
    '20260209193400-drop-cities-tables.cjs',
    '20260211150000-add-code-to-measurement-types.cjs',
    '20260211160000-add-code-to-variables.cjs',
    '20260211200000-restructure-devices-table.cjs',
    '20260212100000-add-uuid-to-devices.cjs',
    '20260212120000-restructure-channels-table.cjs',
    '20260213100000-create-dashboards-module.cjs',
    '20260223100000-add-dashboard-layout-fields.cjs',
    '20260224100000-dashboard-counters-and-order-numbers.cjs',
    '20260224120000-make-dashboard-page-name-nullable.cjs',
    '20260226100000-add-mqtt-key-to-variables.cjs',
    '20260226180000-fix-dashboard-order-number-constraints.cjs',
];

async function setupFreshDatabase() {
    try {
        console.log('🔌 Conectando a la base de datos...');
        await sequelize.authenticate();
        console.log('✅ Conexión exitosa');

        console.log('\n🔍 Verificando que la base de datos esté vacía...');
        const [{ count }] = await sequelize.query(
            `SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public'`,
            { type: 'SELECT' }
        );
        if (parseInt(count, 10) > 0) {
            console.error('\n❌ ERROR: La base de datos NO está vacía.');
            console.error(`   Se encontraron ${count} tabla(s) en el schema public.`);
            console.error('\n   db:setup es exclusivamente para bases de datos completamente vacías.');
            console.error('   Si hay tablas de un intento previo fallido, ejecuta este SQL para limpiarlas:\n');
            console.error('   -- Eliminar todas las tablas:');
            console.error(`   DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; END $$;`);
            console.error('\n   -- Eliminar todos los ENUMs:');
            console.error(`   DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT t.typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typtype = 'e' AND n.nspname = 'public') LOOP EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE'; END LOOP; END $$;`);
            console.error('\n   Luego vuelve a correr: npm run db:setup\n');
            await sequelize.close().catch(() => {});
            process.exit(1);
        }
        console.log('✅ Base de datos vacía, procediendo con el setup');

        console.log('\n📐 Creando tablas desde modelos Sequelize...');
        await sequelize.sync({ alter: false });
        console.log('✅ Todas las tablas creadas correctamente');

        console.log('\n📋 Registrando migraciones históricas en SequelizeMeta...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
                name VARCHAR(255) NOT NULL UNIQUE PRIMARY KEY
            );
        `);

        const values = HISTORICAL_MIGRATIONS
            .map(name => `('${name}')`)
            .join(', ');

        const [, meta] = await sequelize.query(`
            INSERT INTO "SequelizeMeta" (name)
            VALUES ${values}
            ON CONFLICT (name) DO NOTHING;
        `);

        console.log(`✅ ${meta?.rowCount ?? HISTORICAL_MIGRATIONS.length} migraciones registradas`);

        console.log('\n✅ Base de datos lista para producción.');
        console.log('\nSiguientes pasos:');
        console.log('  npm run db:seed:core   → datos base (roles, países, tipos)');
        console.log('  npm run db:seed        → resto de datos iniciales');
        console.log('  npm start              → arrancar la API\n');

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error durante el setup:', error.message);
        if (error.original) {
            console.error('   Detalle:', error.original.message);
        }
        await sequelize.close().catch(() => {});
        process.exit(1);
    }
}

setupFreshDatabase();
