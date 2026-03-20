'use strict';

/**
 * Script: reset-resource-hierarchy.cjs
 *
 * Resetea completamente los objetos de resource_hierarchy en la BD:
 * 1. Droppea triggers, funciones, tablas dependientes y la tabla principal
 * 2. Elimina las entradas correspondientes en SequelizeMeta
 * 3. Ejecuta npx sequelize-cli db:migrate
 * 4. Verifica que cada migración de resource_hierarchy fue aplicada
 *    (comprobando tanto SequelizeMeta como los objetos creados en BD)
 *
 * Si db:migrate falla en una migración ajena a resource_hierarchy,
 * el script continúa sólo si ya aplicó exitosamente TODAS las migraciones
 * de resource_hierarchy. En caso contrario, falla inmediatamente.
 */

require('dotenv').config();

const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está definida en las variables de entorno');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions:
    process.env.NODE_ENV === 'production'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {}
});

const MIGRATION_NAMES = [
  '20251226150310-enable-ltree-create-resource-hierarchy.cjs',
  '20251226150311-create-user-resource-access.cjs',
  '20260102133038-add-optimized-indexes-resource-hierarchy.cjs',
  '20260107142948-add-organization-resource-counters.cjs',
  '20260128150000-move-asset-category-to-resource-hierarchy.cjs',
  '20260320000000-fix-resource-hierarchy-path-column.cjs'
];

/**
 * Verify that the DB artifacts created by each migration are actually present.
 * Returns an array of error messages (empty = all good).
 */
async function verifyMigrationArtifacts() {
  const errors = [];

  // ── 20251226150310: ltree extension, resource_hierarchy table, path column, trigger ─
  const [pathCol] = await sequelize.query(`
    SELECT column_name, udt_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resource_hierarchy' AND column_name = 'path'
  `);
  if (pathCol.length === 0) errors.push('Columna path (ltree) no existe en resource_hierarchy');
  else if (pathCol[0].udt_name !== 'ltree') errors.push(`Columna path tiene tipo incorrecto: ${pathCol[0].udt_name}`);

  const [trigger] = await sequelize.query(`
    SELECT trigger_name FROM information_schema.triggers
    WHERE event_object_table = 'resource_hierarchy'
      AND trigger_name = 'resource_hierarchy_path_trigger'
  `);
  if (trigger.length === 0) errors.push('Trigger resource_hierarchy_path_trigger no existe');

  const [genFn] = await sequelize.query(`
    SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='generate_resource_path'
  `);
  if (genFn.length === 0) errors.push('Función generate_resource_path no existe');

  // ── 20251226150311: user_resource_access table + access functions ──────────
  const [uraTable] = await sequelize.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name='user_resource_access'
  `);
  if (uraTable.length === 0) errors.push('Tabla user_resource_access no existe');

  const [checkFn] = await sequelize.query(`
    SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='check_resource_access'
  `);
  if (checkFn.length === 0) errors.push('Función check_resource_access no existe');

  // ── 20260107142948: organization_resource_counters table ─────────────────
  const [orcTable] = await sequelize.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name='organization_resource_counters'
  `);
  if (orcTable.length === 0) errors.push('Tabla organization_resource_counters no existe');

  // ── 20260128150000: asset_category_id column in resource_hierarchy ────────
  const [assetCol] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='resource_hierarchy' AND column_name='asset_category_id'
  `);
  if (assetCol.length === 0) errors.push('Columna asset_category_id no existe en resource_hierarchy');

  return errors;
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');

    // ── 1. Droppear trigger ───────────────────────────────────────────────────
    // Guard: DROP TRIGGER ... ON <table> fails in Postgres if the table doesn't exist,
    // even with IF EXISTS. Check table existence first.
    console.log('\n🔄 Paso 1: Eliminando trigger resource_hierarchy_path_trigger...');
    const [rhTableCheck] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'resource_hierarchy'
    `);
    if (rhTableCheck.length > 0) {
      await sequelize.query(`
        DROP TRIGGER IF EXISTS resource_hierarchy_path_trigger ON resource_hierarchy;
      `);
      console.log('✅ Trigger eliminado');
    } else {
      console.log('  ℹ️  Tabla resource_hierarchy no existe, se omite drop del trigger');
    }

    // ── 2. Droppear funciones ─────────────────────────────────────────────────
    // Guard: DROP FUNCTION ... with custom-type parameters fails at parse time if the
    // type doesn't exist. Use pg_proc lookups to drop by OID safely.
    console.log('\n🔄 Paso 2: Eliminando funciones PL/pgSQL...');
    await sequelize.query(`
      DROP FUNCTION IF EXISTS update_resource_hierarchy_path() CASCADE;
      DROP FUNCTION IF EXISTS generate_resource_path(UUID) CASCADE;
    `);
    // Drop functions whose signatures reference resource_access_type (may not exist)
    await sequelize.query(`
      DO $$
      DECLARE
        func_oid OID;
      BEGIN
        SELECT p.oid INTO func_oid
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'check_resource_access';
        IF func_oid IS NOT NULL THEN
          EXECUTE 'DROP FUNCTION IF EXISTS check_resource_access(' || pg_get_function_identity_arguments(func_oid) || ') CASCADE';
        END IF;

        SELECT p.oid INTO func_oid
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_accessible_resource_ids';
        IF func_oid IS NOT NULL THEN
          EXECUTE 'DROP FUNCTION IF EXISTS get_accessible_resource_ids(' || pg_get_function_identity_arguments(func_oid) || ') CASCADE';
        END IF;
      END $$;
    `);
    console.log('✅ Funciones eliminadas');

    // ── 3. Droppear tablas dependientes ───────────────────────────────────────
    console.log('\n🔄 Paso 3: Eliminando tablas dependientes...');
    await sequelize.query(`DROP TABLE IF EXISTS organization_resource_counters CASCADE;`);
    console.log('  ✅ organization_resource_counters eliminada');
    await sequelize.query(`DROP TABLE IF EXISTS user_resource_access CASCADE;`);
    console.log('  ✅ user_resource_access eliminada');

    // ── 4. Droppear tabla principal ───────────────────────────────────────────
    console.log('\n🔄 Paso 4: Eliminando tabla resource_hierarchy...');
    await sequelize.query(`DROP TABLE IF EXISTS resource_hierarchy CASCADE;`);
    console.log('✅ Tabla resource_hierarchy eliminada');

    // ── 5. Droppear ENUMs ─────────────────────────────────────────────────────
    console.log('\n🔄 Paso 5: Eliminando tipos ENUM...');
    await sequelize.query(`DROP TYPE IF EXISTS resource_node_type CASCADE;`);
    await sequelize.query(`DROP TYPE IF EXISTS resource_access_type CASCADE;`);
    console.log('✅ ENUMs eliminados');

    // ── 6. Eliminar entradas en SequelizeMeta ─────────────────────────────────
    console.log('\n🔄 Paso 6: Eliminando entradas en SequelizeMeta...');
    const [metaTableRows] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'SequelizeMeta'
    `);
    if (metaTableRows.length === 0) {
      console.log('  ⚠️  Tabla SequelizeMeta no existe, se omite este paso');
    } else {
      for (const name of MIGRATION_NAMES) {
        await sequelize.query(`DELETE FROM "SequelizeMeta" WHERE name = :name`, {
          replacements: { name }
        });
        console.log(`  ✅ Eliminado de SequelizeMeta: ${name}`);
      }
    }

    // ── 7. Ejecutar migración completa ────────────────────────────────────────
    // Run the full db:migrate. If it exits with an error, inspect which
    // resource_hierarchy migrations were NOT applied and run them individually.
    // This handles the case where an unrelated migration between the target set
    // fails and prevents the remaining ones from running.
    console.log('\n🔄 Paso 7: Ejecutando npx sequelize-cli db:migrate...');
    let migrateOutput = '';
    let migrateExitedClean = true;
    let migrateStderr = '';
    try {
      migrateOutput = execSync('npx sequelize-cli db:migrate', {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      console.log(migrateOutput.trim());
      console.log('✅ db:migrate completado sin errores');
    } catch (err) {
      migrateOutput = err.stdout || '';
      migrateStderr = err.stderr || '';
      migrateExitedClean = false;
      console.log(migrateOutput.trim());
      if (migrateStderr.trim()) console.warn(migrateStderr.trim());
      console.warn('\n⚠️  db:migrate salió con error — verificando cuáles migraciones de resource_hierarchy faltan...');

      // Check which resource_hierarchy migrations are still missing and run them
      for (const name of MIGRATION_NAMES) {
        const [rows] = await sequelize.query(`SELECT name FROM "SequelizeMeta" WHERE name = :name`, {
          replacements: { name }
        });
        if (rows.length === 0) {
          console.log(`  → Migración ${name} no aplicada. Ejecutando con --name...`);
          try {
            const out = execSync(`npx sequelize-cli db:migrate --name ${name}`, {
              cwd: process.cwd(),
              env: process.env,
              stdio: 'pipe',
              encoding: 'utf8'
            });
            console.log(out.trim());
            console.log(`  ✅ ${name} aplicada exitosamente`);
          } catch (migErr) {
            const migOut = (migErr.stdout || '').trim();
            const migErr2 = (migErr.stderr || '').trim();
            console.error(`  ❌ Error aplicando ${name}:`);
            if (migOut) console.error(migOut);
            if (migErr2) console.error(migErr2);
            throw new Error(`La migración ${name} falló al ejecutarse individualmente: ${migErr.message}`);
          }
        }
      }
    }

    // ── 8. Verificar que TODAS las migraciones de resource_hierarchy están en SequelizeMeta ──
    console.log('\n🔄 Paso 8: Verificando SequelizeMeta para resource_hierarchy...');
    const missingMigrations = [];
    for (const name of MIGRATION_NAMES) {
      const [rows] = await sequelize.query(`SELECT name FROM "SequelizeMeta" WHERE name = :name`, {
        replacements: { name }
      });
      if (rows.length > 0) {
        console.log(`  ✅ ${name}: presente`);
      } else {
        console.error(`  ❌ ${name}: AUSENTE`);
        missingMigrations.push(name);
      }
    }
    if (missingMigrations.length > 0) {
      console.error(`\n❌ ERROR: Las siguientes migraciones de resource_hierarchy no se aplicaron:`);
      missingMigrations.forEach(n => console.error(`   - ${n}`));
      console.error('   Revisar la salida de db:migrate arriba para más detalles.');
      process.exit(1);
    }
    console.log('✅ Todas las migraciones de resource_hierarchy están en SequelizeMeta');

    // ── 9. Verificar artefactos de BD de cada migración ───────────────────────
    console.log('\n🔄 Paso 9: Verificando artefactos de BD de cada migración...');
    const artifactErrors = await verifyMigrationArtifacts();
    if (artifactErrors.length > 0) {
      console.error('❌ ERROR: Faltan artefactos de BD:');
      artifactErrors.forEach(e => console.error(`   - ${e}`));
      process.exit(1);
    }
    console.log('✅ Todos los artefactos de BD verificados correctamente');

    // ── 10. Verificar INSERT funciona (trigger activo con columna path) ────────
    // Use timestamp-based unique values to avoid collision on reruns.
    console.log('\n🔄 Paso 10: Verificando INSERT con trigger activo...');
    const [orgRows] = await sequelize.query(`SELECT id FROM organizations LIMIT 1`);
    if (orgRows.length > 0) {
      const ts = Date.now();
      const testId = '00000000-0000-0000-0000-000000000099';
      const testPublicCode = `RST-TEST-${ts}`;
      const testName = `Test Trigger Verification ${ts}`;
      const orgId = orgRows[0].id;
      await sequelize.query(`DELETE FROM resource_hierarchy WHERE id = :id`, { replacements: { id: testId } });
      await sequelize.query(`
        INSERT INTO resource_hierarchy (id, public_code, organization_id, node_type, name, created_at, updated_at)
        VALUES (:id, :publicCode, :orgId, 'folder', :name, NOW(), NOW())
      `, { replacements: { id: testId, publicCode: testPublicCode, orgId, name: testName } });
      const [testRows] = await sequelize.query(
        `SELECT id, path::text AS path, depth FROM resource_hierarchy WHERE id = :id`,
        { replacements: { id: testId } }
      );
      if (!testRows[0].path) {
        console.error('❌ ERROR: El trigger no generó el path en el INSERT');
        process.exit(1);
      }
      console.log(`✅ INSERT exitoso. path="${testRows[0].path}", depth=${testRows[0].depth}`);

      // Also verify INSERT with a child node (parent_id set) to confirm path/depth on nested insert
      const childId = '00000000-0000-0000-0000-000000000098';
      const childPublicCode = `RST-CHILD-${ts}`;
      await sequelize.query(`DELETE FROM resource_hierarchy WHERE id = :id`, { replacements: { id: childId } });
      await sequelize.query(`
        INSERT INTO resource_hierarchy (id, public_code, organization_id, node_type, name, parent_id, created_at, updated_at)
        VALUES (:id, :publicCode, :orgId, 'folder', 'Child Test Node', :parentId, NOW(), NOW())
      `, { replacements: { id: childId, publicCode: childPublicCode, orgId, parentId: testId } });
      const [childAfterInsert] = await sequelize.query(
        `SELECT path::text AS path, depth FROM resource_hierarchy WHERE id = :id`,
        { replacements: { id: childId } }
      );
      if (!childAfterInsert[0].path || childAfterInsert[0].depth !== 1) {
        console.error(`❌ ERROR: Child path/depth incorrectos después de INSERT. path="${childAfterInsert[0].path}", depth=${childAfterInsert[0].depth}`);
        process.exit(1);
      }
      console.log(`✅ INSERT hijo exitoso. path="${childAfterInsert[0].path}", depth=${childAfterInsert[0].depth}`);

      // Verify UPDATE trigger: update a non-parent_id field; trigger must preserve path/depth
      await sequelize.query(
        `UPDATE resource_hierarchy SET name = 'Child Updated', updated_at = NOW() WHERE id = :id`,
        { replacements: { id: childId } }
      );
      const [childAfterUpdate] = await sequelize.query(
        `SELECT path::text AS path, depth FROM resource_hierarchy WHERE id = :id`,
        { replacements: { id: childId } }
      );
      if (!childAfterUpdate[0].path || childAfterUpdate[0].depth !== 1) {
        console.error(`❌ ERROR: UPDATE trigger rompió path/depth. path="${childAfterUpdate[0].path}", depth=${childAfterUpdate[0].depth}`);
        process.exit(1);
      }
      console.log(`✅ UPDATE trigger activo. path="${childAfterUpdate[0].path}", depth=${childAfterUpdate[0].depth}`);

      // Cleanup test nodes
      await sequelize.query(`DELETE FROM resource_hierarchy WHERE id IN (:testId, :childId)`, {
        replacements: { testId, childId }
      });
    } else {
      console.log('  ℹ️  No hay organizaciones en la BD, se omite verificación de INSERT');
    }

    if (migrateExitedClean) {
      console.log('\n🎉 Reset completado exitosamente. La tabla resource_hierarchy está en estado limpio y consistente.');
      console.log('   Para verificar el endpoint HTTP ejecutar: POST /api/v1/resource-hierarchy/nodes');
    } else {
      console.log('\n✅ Reset de resource_hierarchy completado exitosamente (exit code 2: partial).');
      console.log('   Todas las migraciones de resource_hierarchy fueron aplicadas y verificadas.');
      console.log('⚠️  Nota: db:migrate tuvo un error en una migración NO relacionada con resource_hierarchy.');
      console.log('   El estado de resource_hierarchy es correcto. El error de las otras migraciones');
      console.log('   debe ser investigado por separado.');
      console.log('   Para verificar el endpoint HTTP ejecutar: POST /api/v1/resource-hierarchy/nodes');
      process.exitCode = 2;
    }
  } catch (err) {
    console.error('\n❌ Error durante el reset:', err.message || err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
