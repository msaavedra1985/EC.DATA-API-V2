/**
 * Seeder de Sirenis: Devices, Channels y Channel Variables
 *
 * Importa los devices y channels reales del cliente Sirenis desde los archivos legacy.
 * - Limpia datos ficticios generados por seed-devices-channels.js (si no hay datos Sirenis)
 * - Importa devices con su UUID legacy en Device.uuid para trazabilidad
 * - Importa channels con su número ch y tipo de medición correcto
 * - Importa relaciones canal→variable traducidas a IDs de Postgres
 * - Idempotente: omite cada device/channel/cv si ya existe (por UUID legacy o MAC)
 * - Preserva createdAt/updatedAt del legacy
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { QueryTypes } from 'sequelize';
import sequelize from '../sql/sequelize.js';
import Organization from '../../modules/organizations/models/Organization.js';
import Device from '../../modules/devices/models/Device.js';
import Channel from '../../modules/channels/models/Channel.js';
import { generateUuidV7, generatePublicCode, generateHumanId } from '../../utils/identifiers.js';
import { dbLogger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ASSETS_DIR = join(__dirname, '../../../attached_assets');

/**
 * Mapeo de IDs de variables legacy → IDs de variables en Postgres
 *
 * tipoMedicionId=1 (electric_energy) → measurementTypeId=1
 * tipoMedicionId=4 (IoT) → measurementTypeId=3
 */
const LEGACY_VARIABLE_MAP = {
    // === tipoMedicionId=1 (electric_energy) → measurementTypeId=1 ===
    1:  1,   // fijo → ee_fixed_charge
    2:  2,   // e → ee_energy
    3:  3,   // p → ee_power
    4:  4,   // re → ee_reactive_energy
    5:  5,   // fp → ee_power_factor
    6:  6,   // Pcontratada → ee_contracted_power
    7:  7,   // v → ee_voltage_ln
    8:  8,   // i → ee_current
    10: 9,   // s → ee_apparent_power
    11: 10,  // u → ee_voltage_ll
    12: 11,  // e_count → ee_energy_counter
    13: 12,  // ae → ee_apparent_energy
    14: 13,  // d → ee_harmonic_distortion
    15: 14,  // c → ee_cost
    34: 15,  // rex → ee_capacitive_reactive
    45: 16,  // q → ee_reactive_power
    46: 17,  // p_max → ee_max_power_period
    52: 18,  // CO2 → ee_co2

    // === tipoMedicionId=4 (IoT) → measurementTypeId=3 ===
    24: 20,  // val1, Temperatura → iot_temperature
    25: 21,  // val2, Humedad → iot_humidity
    26: 22,  // val1, Estado On/Off → iot_on_off
    27: 23,  // val1, Analog In → iot_analog_in
    28: 24,  // val1, Digital IN → iot_digital_in
    29: 25,  // val1, FlowRate → iot_flow_rate
    30: 26,  // val2, Velocity → iot_velocity
    31: 27,  // val3, Net Accumulator → iot_net_accumulator
    32: 28,  // val4, Negative Accumulator → iot_negative_accumulator
    33: 29,  // val5, Positive Accumulator → iot_positive_accumulator
    35: 30,  // val1, Contador → iot_counter
    36: 31,  // val1, Presion PSI → iot_pressure_psi
    37: 32,  // val1, Porcentaje → iot_percentage
    38: 33,  // val7, Distancia m → iot_distance_m
    39: 34,  // val6, Energy flow rate → iot_energy_flow_rate
    40: 35,  // val3, Punto de Rocio → iot_dew_point
    41: 36,  // val1, Frecuencia → iot_frequency
    42: 37,  // val2, Presion BAR → iot_pressure_bar
    43: 38,  // val6, Quality → iot_quality
    44: 39,  // val1, CO2 → iot_co2
    47: 40,  // val24F, Temperatura F → iot_temperature_f
    48: 41,  // val3, BTU → iot_btu
    49: 42,  // val3, %Bateria → iot_battery
    50: 43,  // val4, RSSI → iot_rssi
    51: 44,  // val5, SNR → iot_snr
    53: 45,  // val2, pH → iot_ph
    54: 46,  // val3, concentración → iot_concentration
    55: 47,  // val4, mV → iot_mv
    56: 48,  // val1, Sólidos suspendidos → iot_suspended_solids
    57: 49,  // val2, auto-manual → iot_auto_manual
    58: 50,  // val2, ppm → iot_ppm
    59: 51,  // val7, Temperatura Salida → iot_temperature_out
    60: 52,  // val8, Temperatura Retorno → iot_temperature_return
    61: 53,  // val4, Upload → iot_upload
    62: 54,  // val5, Download → iot_download
    63: 55,  // val6, %Disco → iot_disk
    64: 56,  // val7, %CPU → iot_cpu
    65: 57,  // val2, Quality (orden 54) → iot_quality_signal
};

/**
 * Mapeo de tipoMedicionId legacy → measurementTypeId de Postgres
 */
const TIPO_MEDICION_MAP = {
    1: 1, // electric_energy
    2: 2, // iot_control
    4: 3, // iot
    5: null
};

/**
 * Carga y parsea un archivo JSON de attached_assets
 */
const loadJson = (filename) => {
    const path = join(ASSETS_DIR, filename);
    return JSON.parse(readFileSync(path, 'utf-8'));
};

/**
 * Parsea una fecha del formato legacy, devuelve null si inválida o en 1899
 */
const parseLegacyDate = (str) => {
    if (!str || str.startsWith('1899')) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
};

/**
 * Función principal del seeder
 */
export const seedSirenis = async () => {
    try {
        dbLogger.info('🌴 Iniciando seeder de Sirenis...\n');

        // Cargar archivos fuente
        const equipos = loadJson('EQUIPOS_SIRENIS_1775053278775.json');
        const canales = loadJson('CANALES_SIRENIS_1775053278776.json');
        const canalesVariables = loadJson('CANALES_VARIABLES_SIRENIS_1775053278775.json');

        dbLogger.info(`📦 Datos cargados:`);
        dbLogger.info(`   - Equipos: ${equipos.length}`);
        dbLogger.info(`   - Canales: ${canales.length}`);
        dbLogger.info(`   - Relaciones canal-variable: ${canalesVariables.length}`);

        // Buscar la organización raíz activa
        const organization = await Organization.findOne({
            order: [['createdAt', 'ASC']],
            where: { isActive: true }
        });
        if (!organization) {
            throw new Error('No se encontró ninguna organización activa. Ejecuta primero el seeder de organizaciones.');
        }

        dbLogger.info(`\n🏢 Organización: ${organization.name} (${organization.publicCode})`);

        // ===== Verificar si hay datos Sirenis previos para determinar si limpiar ficticios =====
        const legacyUuids = equipos.map(e => e.uuid);
        const legacyMacs = equipos
            .filter(e => e.mac && e.mac.trim().length > 0)
            .map(e => e.mac.trim().toLowerCase());

        // ===== PASO 1: Limpiar devices y channels ficticios SOLO en arranque limpio =====
        // Buscar cualquier device existente con UUID legacy OR MAC de Sirenis
        const sirenisDevicesByUuid = await Device.findAll({
            where: { uuid: legacyUuids },
            attributes: ['id'],
            paranoid: false,
            raw: true
        });

        const sirenisDevicesByMac = legacyMacs.length > 0
            ? await sequelize.query(
                `SELECT id FROM devices WHERE LOWER(mac_address) IN (:macs)`,
                { replacements: { macs: legacyMacs }, type: QueryTypes.SELECT }
            )
            : [];

        const hasSirenisData = sirenisDevicesByUuid.length > 0 || sirenisDevicesByMac.length > 0;

        // Check if any devices exist at all (to distinguish fresh vs fictitious start)
        const totalExistingDevices = await Device.count({ paranoid: false });

        if (totalExistingDevices === 0) {
            dbLogger.info('\n🗑️  No hay datos previos — arranque limpio, nada que limpiar.');
        } else {
            if (!hasSirenisData) {
                // Hay datos ficticios y no hay datos Sirenis → limpiar
                dbLogger.info('\n🗑️  Limpiando devices y channels ficticios...');
                const ficticioChannels = await Channel.count({ paranoid: false });
                const ficticioDevices = await Device.count({ paranoid: false });

                await sequelize.query('DELETE FROM channel_variables', { type: QueryTypes.DELETE });
                dbLogger.info(`   ✅ Channel variables eliminadas`);

                await sequelize.query('UPDATE channels SET deleted_at = NOW() WHERE deleted_at IS NULL', { type: QueryTypes.UPDATE });
                dbLogger.info(`   ✅ ${ficticioChannels} channels eliminados`);

                await sequelize.query('UPDATE devices SET deleted_at = NOW() WHERE deleted_at IS NULL', { type: QueryTypes.UPDATE });
                dbLogger.info(`   ✅ ${ficticioDevices} devices eliminados`);
            } else {
                const found = sirenisDevicesByUuid.length + sirenisDevicesByMac.length;
                dbLogger.info(`\nℹ️  Datos Sirenis ya presentes (${found} devices encontrados por UUID/MAC). Usando modo per-record.`);
            }
        }

        // ===== Cargar mapa de UUID y MAC existentes para deduplicación por registro =====
        const allExistingDevices = await Device.findAll({
            attributes: ['id', 'uuid', 'macAddress'],
            paranoid: false,
            raw: true
        });

        const existingByUuid = new Map(
            allExistingDevices.filter(d => d.uuid).map(d => [d.uuid, d.id])
        );
        const existingByMac = new Map(
            allExistingDevices.filter(d => d.macAddress).map(d => [d.macAddress.toLowerCase(), d.id])
        );

        // ===== PASO 2: Importar devices de Sirenis (per-record) =====
        dbLogger.info('\n📱 Importando devices de Sirenis...');

        let devicesCreated = 0;
        let devicesSkipped = 0;

        // Mapa: legacyEquipoId → newDeviceUUID (incluye tanto creados como ya existentes)
        const legacyEquipoIdToDeviceId = {};

        for (const equipo of equipos) {
            try {
                const macNormalized = equipo.mac && equipo.mac.trim().length > 0 
                    ? equipo.mac.trim() 
                    : null;

                // Deduplicación por UUID legacy
                if (existingByUuid.has(equipo.uuid)) {
                    const existingId = existingByUuid.get(equipo.uuid);
                    legacyEquipoIdToDeviceId[equipo.id] = existingId;
                    devicesSkipped++;
                    dbLogger.info(`  ⏭️  Device ya existe (UUID legacy): ${equipo.nombre}`);
                    continue;
                }

                // Deduplicación por MAC
                if (macNormalized && existingByMac.has(macNormalized.toLowerCase())) {
                    const existingId = existingByMac.get(macNormalized.toLowerCase());
                    legacyEquipoIdToDeviceId[equipo.id] = existingId;
                    devicesSkipped++;
                    dbLogger.info(`  ⏭️  Device ya existe (MAC): ${equipo.nombre}`);
                    continue;
                }

                const deviceId = generateUuidV7();
                const deviceHumanId = await generateHumanId(Device, null, null);
                const devicePublicCode = generatePublicCode('DEV');

                const status = equipo.activo === '1' ? 'active' : 'inactive';
                const createdAt = parseLegacyDate(equipo.createdAt) || new Date();
                const updatedAt = parseLegacyDate(equipo.updatedAt) || new Date();

                await Device.create({
                    id: deviceId,
                    humanId: deviceHumanId,
                    publicCode: devicePublicCode,
                    organizationId: organization.id,
                    siteId: null,
                    name: equipo.nombre,
                    description: `Equipo Sirenis - ID legacy: ${equipo.id}`,
                    uuid: equipo.uuid,
                    status,
                    macAddress: macNormalized,
                    latitude: equipo.lat || null,
                    longitude: equipo.lon || null,
                    timezone: equipo.timezone || 'UTC',
                    topic: equipo.topic || null,
                    lastSeenAt: parseLegacyDate(equipo.lastReport),
                    metadata: {
                        legacyId: equipo.uuid,
                        legacyEquipoId: equipo.id,
                        legacyClienteId: equipo.clienteId,
                        created_by_seeder: true,
                        source: 'seed-sirenis'
                    },
                    isActive: equipo.activo === '1',
                    createdAt,
                    updatedAt
                });

                // Actualizar timestamps reales (Sequelize puede sobrescribir con NOW())
                await sequelize.query(
                    'UPDATE devices SET created_at = :createdAt, updated_at = :updatedAt WHERE id = :id',
                    {
                        replacements: { id: deviceId, createdAt, updatedAt },
                        type: QueryTypes.UPDATE
                    }
                );

                legacyEquipoIdToDeviceId[equipo.id] = deviceId;
                existingByUuid.set(equipo.uuid, deviceId);
                if (macNormalized) existingByMac.set(macNormalized.toLowerCase(), deviceId);
                devicesCreated++;

                dbLogger.info(`  ✅ Device: ${equipo.nombre} [legacy: ${equipo.id}]`);

            } catch (error) {
                dbLogger.warn(`  ⚠️  Error creando device "${equipo.nombre}" (legacy id ${equipo.id}): ${error.message}`);
                devicesSkipped++;
            }
        }

        dbLogger.info(`\n   📊 Devices: ${devicesCreated} creados, ${devicesSkipped} saltados`);

        // ===== Cargar mapa de channels existentes para deduplicación per-record =====
        const allExistingChannels = await Channel.findAll({
            attributes: ['id', 'metadata'],
            paranoid: false,
            raw: true
        });

        // Mapa por legacyCanalId
        const existingChannelByLegacyId = new Map();
        for (const ch of allExistingChannels) {
            if (ch.metadata && ch.metadata.legacyCanalId) {
                existingChannelByLegacyId.set(ch.metadata.legacyCanalId, ch.id);
            }
        }

        // ===== PASO 3: Importar channels de Sirenis (per-record) =====
        dbLogger.info('\n📡 Importando channels de Sirenis...');

        let channelsCreated = 0;
        let channelsSkipped = 0;

        // Mapa: legacyCanalId → newChannelUUID
        const legacyCanalIdToChannelId = {};

        for (const canal of canales) {
            try {
                // Deduplicación per-record por legacyCanalId
                if (existingChannelByLegacyId.has(canal.id)) {
                    const existingId = existingChannelByLegacyId.get(canal.id);
                    legacyCanalIdToChannelId[canal.id] = existingId;
                    channelsSkipped++;
                    continue;
                }

                const deviceId = legacyEquipoIdToDeviceId[canal.equipoId];

                if (!deviceId) {
                    dbLogger.warn(`  ⚠️  Canal ${canal.id} referencia equipoId ${canal.equipoId} no importado. Saltando.`);
                    channelsSkipped++;
                    continue;
                }

                const channelId = generateUuidV7();
                const channelHumanId = await generateHumanId(Channel, null, null);
                const channelPublicCode = generatePublicCode('CHN');

                const isActive = canal.activo === '1';
                const status = isActive ? 'active' : 'inactive';
                const measurementTypeId = TIPO_MEDICION_MAP[canal.tipoMedicionId] ?? null;
                const createdAt = parseLegacyDate(canal.createdAt) || new Date();
                const updatedAt = parseLegacyDate(canal.updatedAt) || new Date();

                await Channel.create({
                    id: channelId,
                    humanId: channelHumanId,
                    publicCode: channelPublicCode,
                    deviceId,
                    organizationId: organization.id,
                    name: canal.nombre,
                    description: canal.descripcion || null,
                    ch: canal.ch,
                    measurementTypeId,
                    phaseSystem: canal.sistema || null,
                    phase: canal.fase || null,
                    process: canal.procesar === '1',
                    status,
                    lastSyncAt: parseLegacyDate(canal.lastReport),
                    metadata: {
                        legacyCanalId: canal.id,
                        legacyEquipoId: canal.equipoId,
                        legacyTipoMedicionId: canal.tipoMedicionId,
                        created_by_seeder: true,
                        source: 'seed-sirenis'
                    },
                    isActive,
                    createdAt,
                    updatedAt
                });

                // Actualizar timestamps reales
                await sequelize.query(
                    'UPDATE channels SET created_at = :createdAt, updated_at = :updatedAt WHERE id = :id',
                    {
                        replacements: { id: channelId, createdAt, updatedAt },
                        type: QueryTypes.UPDATE
                    }
                );

                legacyCanalIdToChannelId[canal.id] = channelId;
                existingChannelByLegacyId.set(canal.id, channelId);
                channelsCreated++;

            } catch (error) {
                dbLogger.warn(`  ⚠️  Error creando channel id ${canal.id} ("${canal.nombre}"): ${error.message}`);
                channelsSkipped++;
            }
        }

        dbLogger.info(`\n   📊 Channels: ${channelsCreated} creados, ${channelsSkipped} saltados`);

        // ===== PASO 4: Importar channel_variables (per-record, ON CONFLICT DO NOTHING) =====
        dbLogger.info('\n🔗 Importando relaciones channel_variables...');

        let cvCreated = 0;
        let cvSkipped = 0;
        let cvWarnings = 0;

        for (const cv of canalesVariables) {
            const channelId = legacyCanalIdToChannelId[cv.canaleId];
            const variableId = LEGACY_VARIABLE_MAP[cv.variableId];

            if (!channelId) {
                dbLogger.warn(`  ⚠️  Canal legacy ${cv.canaleId} no encontrado en mapa. Saltando relación id=${cv.id}.`);
                cvWarnings++;
                continue;
            }

            if (!variableId) {
                dbLogger.warn(`  ⚠️  Variable legacy ${cv.variableId} sin mapeo a Postgres. Saltando relación id=${cv.id}.`);
                cvWarnings++;
                continue;
            }

            try {
                // Use RETURNING 1 so we can reliably detect if a row was inserted
                // (ON CONFLICT DO NOTHING returns empty when the row already existed)
                const rows = await sequelize.query(
                    `INSERT INTO channel_variables (channel_id, variable_id, is_active, created_at, updated_at)
                     VALUES (:channelId, :variableId, :isActive, NOW(), NOW())
                     ON CONFLICT (channel_id, variable_id) DO NOTHING
                     RETURNING 1`,
                    {
                        replacements: {
                            channelId,
                            variableId,
                            isActive: cv.activo === '1'
                        },
                        type: QueryTypes.SELECT
                    }
                );

                // rows is an array: non-empty = inserted, empty = already existed
                if (rows.length > 0) {
                    cvCreated++;
                } else {
                    cvSkipped++;
                }
            } catch (error) {
                dbLogger.warn(`  ⚠️  Error insertando channel_variable (canal legacy ${cv.canaleId}, variable legacy ${cv.variableId}): ${error.message}`);
                cvSkipped++;
            }
        }

        dbLogger.info(`\n   📊 Channel Variables: ${cvCreated} creadas, ${cvSkipped} ya existían, ${cvWarnings} advertencias`);

        // ===== Resumen final =====
        dbLogger.info('\n' + '='.repeat(80));
        dbLogger.info('📊 RESUMEN FINAL - SEEDER SIRENIS');
        dbLogger.info('='.repeat(80));
        dbLogger.info(`✅ Devices creados:           ${devicesCreated}`);
        dbLogger.info(`⏭️  Devices saltados:          ${devicesSkipped}`);
        dbLogger.info(`✅ Channels creados:          ${channelsCreated}`);
        dbLogger.info(`⏭️  Channels saltados:         ${channelsSkipped}`);
        dbLogger.info(`✅ Channel Variables creadas: ${cvCreated}`);
        dbLogger.info(`⏭️  Channel Variables ya exist: ${cvSkipped}`);
        dbLogger.info(`⚠️  Channel Variables advertencias: ${cvWarnings}`);
        dbLogger.info('='.repeat(80));
        dbLogger.info('\n✅ Seeder Sirenis completado exitosamente\n');

        return {
            devicesCreated,
            devicesSkipped,
            channelsCreated,
            channelsSkipped,
            channelVariablesCreated: cvCreated,
            channelVariablesSkipped: cvSkipped + cvWarnings
        };

    } catch (error) {
        dbLogger.error(error, '❌ Error en seeder Sirenis');
        throw error;
    }
};

// Ejecutar directamente si se llama como script
if (import.meta.url === `file://${process.argv[1]}`) {
    import('../sql/sequelize.js').then(async ({ default: seq }) => {
        await import('../models.js');
        await seq.authenticate();
        await seedSirenis();
        await seq.close();
        process.exit(0);
    }).catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
}

export default seedSirenis;
