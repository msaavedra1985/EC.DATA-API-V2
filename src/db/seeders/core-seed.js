/**
 * Core Seed - Seed de datos base para producción
 *
 * Ejecuta en orden:
 *   1. Roles
 *   2. Países
 *   3. Telemetría (measurement_types + variables)
 *   4. Device metadata (types, brands, models, networks, servers, licenses, validity_periods)
 *   5. Usuario admin
 *
 * Idempotente: puede correrse múltiples veces sin efectos secundarios.
 * Uso manual: node src/db/seeders/core-seed.js
 * Startup automático: AUTO_SEED=true (configurado en index.js)
 */
import '../../db/models.js';
import { seedRoles } from './roles.seeder.js';
import { seedCountries } from './countries.seeder.js';
import seedTelemetry from './telemetry.seeder.js';
import { seedDeviceMetadata } from './device-metadata.seeder.js';
import { seedAdminUser } from './admin-user.seeder.js';
import logger from '../../utils/logger.js';

export const runCoreSeed = async () => {
    logger.info('🌱 Iniciando Core Seed...');

    const results = {};

    // 1. Roles
    try {
        results.roles = await seedRoles();
    } catch (err) {
        logger.error({ err }, '❌ Error en seed de roles');
        results.roles = { error: err.message };
    }

    // 2. Países
    try {
        results.countries = await seedCountries();
    } catch (err) {
        logger.error({ err }, '❌ Error en seed de países');
        results.countries = { error: err.message };
    }

    // 3. Telemetría
    try {
        results.telemetry = await seedTelemetry();
    } catch (err) {
        logger.error({ err }, '❌ Error en seed de telemetría');
        results.telemetry = { error: err.message };
    }

    // 4. Device metadata
    try {
        results.deviceMetadata = await seedDeviceMetadata();
    } catch (err) {
        logger.error({ err }, '❌ Error en seed de device-metadata');
        results.deviceMetadata = { error: err.message };
    }

    // 5. Usuario admin
    try {
        results.adminUser = await seedAdminUser();
    } catch (err) {
        logger.error({ err }, '❌ Error en seed de usuario admin');
        results.adminUser = { error: err.message };
    }

    const dm = results.deviceMetadata || {};
    const tel = results.telemetry || {};
    const rol = results.roles || {};
    const cty = results.countries || {};

    logger.info(`
╔══════════════════════════════════════════════════════════════╗
║  🌱 Core Seed completado                                     ║
╠══════════════════════════════════════════════════════════════╣
║  Roles:            ${String(rol.rolesCreated ?? '⏭').padEnd(41)} ║
║  Países:           ${String(cty.countriesCreated ?? cty.created ?? '⏭').padEnd(41)} ║
║  Measurement types:${String(tel.measurementTypesCreated ?? tel.measurementTypes ?? '⏭').padEnd(41)} ║
║  Variables:        ${String(tel.variablesCreated ?? tel.variables ?? '⏭').padEnd(41)} ║
║  Device types:     ${String(dm.deviceTypes ?? '⏭').padEnd(41)} ║
║  Device brands:    ${String(dm.deviceBrands ?? '⏭').padEnd(41)} ║
║  Device models:    ${String(dm.deviceModels ?? '⏭').padEnd(41)} ║
║  Device networks:  ${String(dm.deviceNetworks ?? '⏭').padEnd(41)} ║
║  Device servers:   ${String(dm.deviceServers ?? '⏭').padEnd(41)} ║
║  Device licenses:  ${String(dm.deviceLicenses ?? '⏭').padEnd(41)} ║
║  Validity periods: ${String(dm.deviceValidityPeriods ?? '⏭').padEnd(41)} ║
║  Admin user:       ${String(results.adminUser?.email ?? '❌').padEnd(41)} ║
╚══════════════════════════════════════════════════════════════╝`);

    return results;
};

const isMain = process.argv[1]?.endsWith('core-seed.js');
if (isMain) {
    runCoreSeed()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Core seed failed:', err);
            process.exit(1);
        });
}
