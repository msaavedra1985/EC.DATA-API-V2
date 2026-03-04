/**
 * Migración de public codes al formato "boleto de avión"
 * Convierte public codes legacy al formato PREFIX-XXX-XXX (nanoid)
 * 
 * Ejecutar: node scripts/migrate-public-codes.js
 */
import sequelize from '../src/db/sql/sequelize.js';
import { generatePublicCode } from '../src/utils/identifiers.js';

const TABLES = [
    { table: 'organizations', prefix: 'ORG' },
    { table: 'users', prefix: 'EC' },
    { table: 'devices', prefix: 'DEV' },
    { table: 'channels', prefix: 'CHN' },
    { table: 'dashboards', prefix: 'DSH' },
    { table: 'dashboard_groups', prefix: 'DGR' },
    { table: 'sites', prefix: 'SITE' },
    { table: 'resource_hierarchy', prefix: 'RES' },
];

const migrateTable = async (tableName, prefix, transaction) => {
    const [rows] = await sequelize.query(
        `SELECT id, public_code FROM ${tableName} WHERE public_code IS NOT NULL`,
        { transaction }
    );

    if (rows.length === 0) {
        console.log(`  ${tableName}: sin registros, saltando`);
        return 0;
    }

    const usedCodes = new Set();
    let updated = 0;

    for (const row of rows) {
        let newCode;
        let attempts = 0;
        do {
            newCode = generatePublicCode(prefix);
            attempts++;
            if (attempts > 10) {
                throw new Error(`No se pudo generar código único para ${tableName} id=${row.id}`);
            }
        } while (usedCodes.has(newCode));

        usedCodes.add(newCode);

        console.log(`  ${row.public_code} → ${newCode}`);

        await sequelize.query(
            `UPDATE ${tableName} SET public_code = :newCode WHERE id = :id`,
            { replacements: { newCode, id: row.id }, transaction }
        );
        updated++;
    }

    return updated;
};

const main = async () => {
    console.log('=== Migración de Public Codes al formato boleto de avión ===\n');

    const transaction = await sequelize.transaction();

    try {
        let totalUpdated = 0;

        for (const { table, prefix } of TABLES) {
            console.log(`\nMigrando ${table} (${prefix})...`);
            const count = await migrateTable(table, prefix, transaction);
            totalUpdated += count;
            console.log(`  → ${count} registros actualizados`);
        }

        await transaction.commit();
        console.log(`\n✓ Migración completada: ${totalUpdated} registros actualizados en total`);
        console.log('\nIMPORTANTE: Limpiar cache de Redis (session contexts, org cache, etc.)');
    } catch (error) {
        await transaction.rollback();
        console.error('\n✗ Error en migración, rollback ejecutado:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
};

main();
