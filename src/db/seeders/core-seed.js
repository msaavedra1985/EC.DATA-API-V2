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
 * Comportamiento:
 *   - Fail-fast: si cualquier seeder falla, el proceso aborta con error (no continúa en estado parcial)
 *   - Idempotente: puede correrse múltiples veces sin efectos secundarios
 *   - Validación post-seed: verifica que los datos críticos están realmente en la DB
 *
 * Uso manual: node src/db/seeders/core-seed.js
 * Startup automático: AUTO_SEED=true (configurado en index.js)
 */
import sequelize from '../sql/sequelize.js';
import { QueryTypes } from 'sequelize';
import '../../db/models.js';
import { seedRoles } from './roles.seeder.js';
import { seedCountries } from './countries.seeder.js';
import seedTelemetry from './telemetry.seeder.js';
import { seedDeviceMetadata } from './device-metadata.seeder.js';
import { seedAdminUser } from './admin-user.seeder.js';
import Role from '../../modules/auth/models/Role.js';
import Country from '../../modules/countries/models/Country.js';
import User from '../../modules/auth/models/User.js';
import logger from '../../utils/logger.js';

const EXPECTED_MIN_COUNTRIES = 55;
const ADMIN_EMAIL = 'admin@ecdata.com';

const validatePostSeed = async () => {
    const errors = [];

    const roleCount = await Role.count();
    if (roleCount === 0) errors.push('roles: 0 registros en DB');

    const countryCount = await Country.count();
    if (countryCount < EXPECTED_MIN_COUNTRIES) errors.push(`countries: ${countryCount} registros (mínimo esperado: ${EXPECTED_MIN_COUNTRIES})`);

    const [{ count: mtCount }] = await sequelize.query(
        `SELECT COUNT(*) as count FROM measurement_types`,
        { type: QueryTypes.SELECT }
    );
    if (parseInt(mtCount, 10) === 0) errors.push('measurement_types: 0 registros en DB');

    const [{ count: dtCount }] = await sequelize.query(
        `SELECT COUNT(*) as count FROM device_types`,
        { type: QueryTypes.SELECT }
    );
    if (parseInt(dtCount, 10) === 0) errors.push('device_types: 0 registros en DB');

    const adminUser = await User.findOne({ where: { email: ADMIN_EMAIL } });
    if (!adminUser) errors.push(`usuario admin (${ADMIN_EMAIL}): no encontrado en DB`);

    if (errors.length > 0) {
        throw new Error(
            `❌ Validación post-seed fallida. La DB puede estar en estado inconsistente:\n  - ${errors.join('\n  - ')}`
        );
    }
};

export const runCoreSeed = async () => {
    logger.info('🌱 Iniciando Core Seed...');

    // 1. Roles — falla si hay error (no continúa en parcial)
    const roles = await seedRoles();

    // 2. Países
    const countries = await seedCountries();

    // 3. Telemetría
    const telemetry = await seedTelemetry();

    // 4. Device metadata
    const deviceMetadata = await seedDeviceMetadata();

    // 5. Usuario admin
    const adminUser = await seedAdminUser();

    // Validación post-seed: verifica que la data crítica está realmente en la DB
    await validatePostSeed();

    const dm = deviceMetadata || {};
    const tel = telemetry || {};
    const rol = roles || {};
    const cty = countries || {};

    logger.info(`
╔══════════════════════════════════════════════════════════════╗
║  🌱 Core Seed completado                                     ║
╠══════════════════════════════════════════════════════════════╣
║  Roles:            ${String(rol.rolesCreated ?? '⏭').padEnd(41)} ║
║  Países:           ${String(cty.countriesCreated ?? cty.created ?? '⏭').padEnd(41)} ║
║  Measurement types:${String(tel.measurementTypes ?? '⏭').padEnd(41)} ║
║  Variables:        ${String(tel.variables ?? '⏭').padEnd(41)} ║
║  Device types:     ${String(dm.deviceTypes ?? '⏭').padEnd(41)} ║
║  Device brands:    ${String(dm.deviceBrands ?? '⏭').padEnd(41)} ║
║  Device models:    ${String(dm.deviceModels ?? '⏭').padEnd(41)} ║
║  Device networks:  ${String(dm.deviceNetworks ?? '⏭').padEnd(41)} ║
║  Device servers:   ${String(dm.deviceServers ?? '⏭').padEnd(41)} ║
║  Device licenses:  ${String(dm.deviceLicenses ?? '⏭').padEnd(41)} ║
║  Validity periods: ${String(dm.deviceValidityPeriods ?? '⏭').padEnd(41)} ║
║  Admin user:       ${String(adminUser?.email ?? '❌').padEnd(41)} ║
╚══════════════════════════════════════════════════════════════╝`);

    return { roles, countries, telemetry, deviceMetadata, adminUser };
};

const isMain = process.argv[1]?.endsWith('core-seed.js');
if (isMain) {
    runCoreSeed()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('\n❌ Core seed FALLIDO:', err.message);
            process.exit(1);
        });
}
