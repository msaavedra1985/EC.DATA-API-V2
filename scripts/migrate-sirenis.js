import { v7 as uuidv7 } from 'uuid';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../src/db/sql/sequelize.js';
import Device from '../src/modules/devices/models/Device.js';
import Channel from '../src/modules/channels/models/Channel.js';
import { generatePublicCode } from '../src/utils/identifiers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, '..', 'attached_assets');

// ─── Organización destino ───
const SIRENIS_ORG_ID = '019c47b7-8ec1-76e3-90c3-2afdbffac557';

// ─── Mapeo de tipos de medición (old SQL → new PG) ───
const MEASUREMENT_TYPE_MAP = {
    1: 1,  // Energía eléctrica
    3: 2,  // IoT Control
    4: 3,  // IoT
    6: 4,  // IoT Lectura
};

// ─── Mapeo de variables (old SQL id → new PG id) ───
// Cada entrada incluye datos de validación para verificar contra la DB
const VARIABLE_MAP = {
    24: { newId: 20, expectedCode: 'iot_temperature',          expectedUnit: 'ºC' },
    26: { newId: 22, expectedCode: 'iot_on_off',               expectedUnit: '' },
    29: { newId: 25, expectedCode: 'iot_flow_rate',            expectedUnit: 'm3/h' },
    32: { newId: 28, expectedCode: 'iot_negative_accumulator', expectedUnit: 'm3' },
    33: { newId: 29, expectedCode: 'iot_positive_accumulator', expectedUnit: 'm3' },
    35: { newId: 30, expectedCode: 'iot_counter',              expectedUnit: '' },
    36: { newId: 31, expectedCode: 'iot_pressure_psi',         expectedUnit: 'PSI' },
    37: { newId: 32, expectedCode: 'iot_percentage',           expectedUnit: '%' },
    39: { newId: 34, expectedCode: 'iot_energy_flow_rate',     expectedUnit: 'BTU/h' },
    41: { newId: 36, expectedCode: 'iot_frequency',            expectedUnit: 'Hz' },
    42: { newId: 37, expectedCode: 'iot_pressure_bar',         expectedUnit: 'BAR' },
    47: { newId: 40, expectedCode: 'iot_temperature_f',        expectedUnit: '°F' },
    48: { newId: 41, expectedCode: 'iot_btu',                  expectedUnit: 'BTU' },
    59: { newId: 51, expectedCode: 'iot_temperature_out',      expectedUnit: 'ºC' },
    60: { newId: 52, expectedCode: 'iot_temperature_return',   expectedUnit: 'ºC' },
    65: { newId: 57, expectedCode: 'iot_quality_signal',       expectedUnit: '' },
};

function loadJson(filename) {
    return JSON.parse(readFileSync(resolve(ASSETS, filename), 'utf-8'));
}

async function validateVariableMappings() {
    console.log('Validando mapeo de variables contra la DB...');
    const targetIds = Object.values(VARIABLE_MAP).map(v => v.newId);
    const [dbVars] = await sequelize.query(
        `SELECT id, code, unit FROM variables WHERE id IN (:ids)`,
        { replacements: { ids: targetIds } }
    );

    const dbMap = {};
    for (const v of dbVars) dbMap[v.id] = v;

    for (const [oldId, mapping] of Object.entries(VARIABLE_MAP)) {
        const dbVar = dbMap[mapping.newId];
        if (!dbVar) {
            throw new Error(`Variable newId=${mapping.newId} (oldId=${oldId}) no existe en la DB`);
        }
        if (dbVar.code !== mapping.expectedCode) {
            throw new Error(`Variable ${mapping.newId}: code esperado="${mapping.expectedCode}", encontrado="${dbVar.code}"`);
        }
        if (dbVar.unit !== mapping.expectedUnit) {
            throw new Error(`Variable ${mapping.newId}: unit esperado="${mapping.expectedUnit}", encontrado="${dbVar.unit}"`);
        }
    }
    console.log(`   ✓ ${targetIds.length} variables validadas correctamente\n`);
}

async function validateMeasurementTypes() {
    console.log('Validando mapeo de tipos de medición contra la DB...');
    const targetIds = Object.values(MEASUREMENT_TYPE_MAP);
    const [dbTypes] = await sequelize.query(
        `SELECT id, code FROM measurement_types WHERE id IN (:ids)`,
        { replacements: { ids: targetIds } }
    );
    if (dbTypes.length !== targetIds.length) {
        const found = dbTypes.map(t => t.id);
        const missing = targetIds.filter(id => !found.includes(id));
        throw new Error(`Tipos de medición faltantes en DB: ${missing.join(', ')}`);
    }
    console.log(`   ✓ ${targetIds.length} tipos de medición validados\n`);
}

async function checkIdempotency() {
    const [existing] = await sequelize.query(
        `SELECT COUNT(*) as count FROM devices WHERE organization_id = :orgId`,
        { replacements: { orgId: SIRENIS_ORG_ID }, type: sequelize.QueryTypes.SELECT }
    );

    if (parseInt(existing.count) > 0) {
        console.log(`\n⚠ Ya existen ${existing.count} dispositivos para Sirenis.`);
        console.log('  Para re-ejecutar, primero limpiá los datos existentes:');
        console.log('  node scripts/migrate-sirenis.js --clean\n');
        return false;
    }
    return true;
}

async function cleanSirenisData() {
    console.log('Limpiando datos existentes de Sirenis...');
    const transaction = await sequelize.transaction();
    try {
        const [cvResult] = await sequelize.query(
            `DELETE FROM channel_variables WHERE channel_id IN (
                SELECT id FROM channels WHERE organization_id = :orgId
            )`,
            { replacements: { orgId: SIRENIS_ORG_ID }, transaction }
        );
        console.log(`   Eliminadas ${cvResult?.rowCount || 0} channel_variables`);

        const [chResult] = await sequelize.query(
            `DELETE FROM channels WHERE organization_id = :orgId`,
            { replacements: { orgId: SIRENIS_ORG_ID }, transaction }
        );
        console.log(`   Eliminados ${chResult?.rowCount || 0} canales`);

        const [devResult] = await sequelize.query(
            `DELETE FROM devices WHERE organization_id = :orgId`,
            { replacements: { orgId: SIRENIS_ORG_ID }, transaction }
        );
        console.log(`   Eliminados ${devResult?.rowCount || 0} dispositivos`);

        await transaction.commit();
        console.log('   ✓ Limpieza completada\n');
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function getNextHumanId(model, transaction) {
    await sequelize.query(
        `LOCK TABLE "${model.tableName}" IN EXCLUSIVE MODE`,
        { transaction }
    );
    const [result] = await sequelize.query(
        `SELECT COALESCE(MAX(human_id), 0) + 1 as next_id FROM "${model.tableName}"`,
        { transaction, type: sequelize.QueryTypes.SELECT }
    );
    return result.next_id;
}

async function migrate() {
    console.log('═══ Migración Sirenis ═══\n');

    const isClean = process.argv.includes('--clean');
    if (isClean) {
        await cleanSirenisData();
    }

    await validateMeasurementTypes();
    await validateVariableMappings();

    const canProceed = await checkIdempotency();
    if (!canProceed) {
        await sequelize.close();
        process.exit(0);
    }

    const equipos = loadJson('Equipos_Sirenis_1770915291864.json');
    const canales = loadJson('Canales_Sirenis_1770915291865.json');
    const canalesVariables = loadJson('Canales_Variables_1770915291863.json');

    console.log(`Datos cargados: ${equipos.length} equipos, ${canales.length} canales, ${canalesVariables.length} channel_variables\n`);

    const transaction = await sequelize.transaction();

    try {
        // ─── 1. Insertar dispositivos ───
        console.log('1/3 Insertando dispositivos...');
        let deviceHumanId = await getNextHumanId(Device, transaction);
        const oldIdToNewUuid = {};

        for (const eq of equipos) {
            const newUuid = uuidv7();
            const publicCode = generatePublicCode('DEV', newUuid);

            await Device.create({
                id: newUuid,
                human_id: deviceHumanId++,
                public_code: publicCode,
                organization_id: SIRENIS_ORG_ID,
                site_id: null,
                name: eq.nombre,
                description: null,
                status: eq.activo === '1' ? 'active' : 'inactive',
                uuid: eq.uuid || null,
                mac_address: eq.mac || null,
                timezone: eq.timezone || null,
                latitude: eq.lat || null,
                longitude: eq.lon || null,
                topic: eq.topic || null,
                brand_id: eq.equiposMarcaId || null,
                model_id: eq.equiposModeloId || null,
                device_type_id: null,
                server_id: null,
                network_id: null,
                license_id: null,
                validity_period_id: null,
                firmware_version: null,
                serial_number: null,
                ip_address: null,
                last_seen_at: eq.lastReport && !eq.lastReport.startsWith('1899') ? new Date(eq.lastReport) : null,
                metadata: null,
                is_active: eq.activo === '1',
                created_at: new Date(eq.createdAt),
                updated_at: new Date(eq.updatedAt),
            }, { transaction });

            oldIdToNewUuid[eq.id] = newUuid;
        }

        console.log(`   ✓ ${equipos.length} dispositivos insertados\n`);

        // ─── 2. Insertar canales ───
        console.log('2/3 Insertando canales...');
        let channelHumanId = await getNextHumanId(Channel, transaction);
        const oldChannelIdToNewUuid = {};
        let skippedChannels = 0;

        for (const ch of canales) {
            const deviceUuid = oldIdToNewUuid[ch.equipoId];
            if (!deviceUuid) {
                skippedChannels++;
                continue;
            }

            const newMeasurementTypeId = MEASUREMENT_TYPE_MAP[ch.tipoMedicionId];
            if (!newMeasurementTypeId) {
                console.warn(`   ⚠ Canal ${ch.id}: tipo medición ${ch.tipoMedicionId} no mapeado, omitido`);
                skippedChannels++;
                continue;
            }

            const newUuid = uuidv7();
            const publicCode = generatePublicCode('CHN', newUuid);

            await Channel.create({
                id: newUuid,
                human_id: channelHumanId++,
                public_code: publicCode,
                device_id: deviceUuid,
                organization_id: SIRENIS_ORG_ID,
                name: ch.nombre,
                description: ch.descripcion || null,
                status: ch.activo === '1' ? 'active' : 'inactive',
                ch: ch.ch,
                measurement_type_id: newMeasurementTypeId,
                phase_system: ch.sistema || 0,
                phase: ch.fase || null,
                process: ch.procesar === '1',
                last_sync_at: ch.lastReport ? new Date(ch.lastReport) : null,
                metadata: null,
                is_active: ch.activo === '1',
                created_at: new Date(ch.createdAt),
                updated_at: new Date(ch.updatedAt),
            }, { transaction });

            oldChannelIdToNewUuid[ch.id] = newUuid;
        }

        console.log(`   ✓ ${canales.length - skippedChannels} canales insertados (${skippedChannels} omitidos)\n`);

        // ─── 3. Insertar channel_variables ───
        console.log('3/3 Insertando channel_variables...');
        let insertedCv = 0;
        let skippedCv = 0;

        for (const cv of canalesVariables) {
            const channelUuid = oldChannelIdToNewUuid[cv.canaleId];
            if (!channelUuid) {
                skippedCv++;
                continue;
            }

            const mapping = VARIABLE_MAP[cv.variableId];
            if (!mapping) {
                console.warn(`   ⚠ CV ${cv.id}: variable ${cv.variableId} no mapeada, omitida`);
                skippedCv++;
                continue;
            }

            await sequelize.query(
                `INSERT INTO channel_variables (channel_id, variable_id, is_active, display_order, created_at, updated_at)
                 VALUES (:channelId, :variableId, :isActive, :displayOrder, NOW(), NOW())`,
                {
                    replacements: {
                        channelId: channelUuid,
                        variableId: mapping.newId,
                        isActive: cv.activo === '1',
                        displayOrder: insertedCv + 1,
                    },
                    transaction,
                }
            );
            insertedCv++;
        }

        console.log(`   ✓ ${insertedCv} channel_variables insertadas (${skippedCv} omitidas)\n`);

        // ─── Commit ───
        await transaction.commit();
        console.log('═══ Migración completada exitosamente ═══');
        console.log(`Resumen:`);
        console.log(`  Dispositivos: ${equipos.length}`);
        console.log(`  Canales: ${canales.length - skippedChannels}`);
        console.log(`  Channel_Variables: ${insertedCv}`);

    } catch (error) {
        await transaction.rollback();
        console.error('✗ Error en migración, rollback ejecutado:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

migrate();
