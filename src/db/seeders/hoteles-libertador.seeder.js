/**
 * Seeder de Migración - Hoteles Libertador
 * 
 * Migra datos de la plataforma original a la nueva plataforma:
 * - Reinicializa measurement_types y variables con IDs originales
 * - Crea organización Hoteles Libertador
 * - Inserta equipos, canales y relaciones channel_variables
 * 
 * Ejecutar: node src/db/seeders/hoteles-libertador.seeder.js
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sequelize from '../sql/sequelize.js';
import { v7 as uuidv7 } from 'uuid';
import Hashids from 'hashids';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Hashids para generar public_codes
const deviceHashids = new Hashids('ecdata-devices-salt', 5, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
const channelHashids = new Hashids('ecdata-channels-salt', 5, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
const orgHashids = new Hashids('ecdata-orgs-salt', 5, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');

// Función para calcular dígito Luhn
const calculateLuhnDigit = (str) => {
    const chars = str.toUpperCase().split('').reverse();
    let sum = 0;
    for (let i = 0; i < chars.length; i++) {
        let value = chars[i].charCodeAt(0) - 48;
        if (chars[i] >= 'A') value = chars[i].charCodeAt(0) - 55;
        if (i % 2 === 0) value *= 2;
        if (value > 9) value -= 9;
        sum += value;
    }
    return (10 - (sum % 10)) % 10;
};

// Genera human_id incremental
const generateHumanId = (prefix, counter) => {
    return `${prefix}-${String(counter).padStart(6, '0')}`;
};

// Genera public_code con checksum Luhn
const generatePublicCode = (prefix, hashids, id) => {
    const hash = hashids.encode(id);
    const base = `${prefix}-${hash}`;
    const checkDigit = calculateLuhnDigit(base);
    return `${base}-${checkDigit}`;
};

// Cargar JSONs
const loadJson = (filename) => {
    const path = join(__dirname, '../../../attached_assets', filename);
    return JSON.parse(readFileSync(path, 'utf8'));
};

// Datos de tipos de medición
const measurementTypes = [
    { id: 1, nombre: 'Energia electrica', prefijoTablas: '', activo: '1' },
    { id: 2, nombre: 'Temperatura', prefijoTablas: null, activo: '0' },
    { id: 3, nombre: 'IoT Control', prefijoTablas: 'sim', activo: '1' },
    { id: 4, nombre: 'IoT', prefijoTablas: 'sim', activo: '1' },
    { id: 5, nombre: 'BTU', prefijoTablas: 'btu', activo: '0' },
    { id: 6, nombre: 'IoT Lectura', prefijoTablas: null, activo: '1' }
];

const runMigration = async () => {
    const t = await sequelize.transaction();
    
    try {
        console.log('🚀 Iniciando migración de Hoteles Libertador...\n');

        // Cargar JSONs
        console.log('📂 Cargando archivos JSON...');
        const variables = loadJson('Variables_1766086522399.json');
        const equipos = loadJson('Equipos_1766086395522.json');
        const canales = loadJson('Canales_1766086395522.json');
        const channelVariables = loadJson('Variables_Canales_1766086395522.json');
        
        console.log(`   - ${variables.length} variables`);
        console.log(`   - ${equipos.length} equipos`);
        console.log(`   - ${canales.length} canales`);
        console.log(`   - ${channelVariables.length} relaciones channel_variables\n`);

        // =====================================================
        // 0. LIMPIAR TABLAS EXISTENTES (excepto organizaciones base)
        // =====================================================
        console.log('0️⃣  Limpiando tablas existentes...');
        
        // Verificar si Hoteles Libertador ya existe y obtener su ID
        const [existingOrg] = await sequelize.query(
            "SELECT id FROM organizations WHERE slug = 'hoteles-libertador'",
            { transaction: t }
        );
        
        if (existingOrg.length > 0) {
            const existingOrgId = existingOrg[0].id;
            // Eliminar canales y devices de esta organización
            await sequelize.query(
                'DELETE FROM channel_variables WHERE channel_id IN (SELECT id FROM channels WHERE organization_id = $1)',
                { bind: [existingOrgId], transaction: t }
            );
            await sequelize.query(
                'DELETE FROM channels WHERE organization_id = $1',
                { bind: [existingOrgId], transaction: t }
            );
            await sequelize.query(
                'DELETE FROM devices WHERE organization_id = $1',
                { bind: [existingOrgId], transaction: t }
            );
            await sequelize.query(
                'DELETE FROM organizations WHERE id = $1',
                { bind: [existingOrgId], transaction: t }
            );
        }
        
        // Limpiar traducciones y variables (se recrearán)
        await sequelize.query('DELETE FROM measurement_type_translations', { transaction: t });
        await sequelize.query('DELETE FROM variable_translations', { transaction: t });
        await sequelize.query('DELETE FROM variables', { transaction: t });
        await sequelize.query('DELETE FROM measurement_types', { transaction: t });
        console.log('   ✓ Tablas limpiadas\n');

        // =====================================================
        // 1. LIMPIAR Y REINSERTAR MEASUREMENT_TYPES
        // =====================================================
        console.log('1️⃣  Reiniciando measurement_types...');
        
        // Resetear secuencia
        await sequelize.query('ALTER SEQUENCE measurement_types_id_seq RESTART WITH 1', { transaction: t });
        
        // Insertar measurement_types con IDs exactos
        for (const mt of measurementTypes) {
            await sequelize.query(`
                INSERT INTO measurement_types (id, table_prefix, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
            `, {
                bind: [mt.id, mt.prefijoTablas || '', mt.activo === '1'],
                transaction: t
            });
            
            // Insertar traducciones ES/EN
            await sequelize.query(`
                INSERT INTO measurement_type_translations (measurement_type_id, lang, name, created_at, updated_at)
                VALUES ($1, 'es', $2, NOW(), NOW()), ($1, 'en', $2, NOW(), NOW())
            `, {
                bind: [mt.id, mt.nombre],
                transaction: t
            });
        }
        
        // Actualizar secuencia
        await sequelize.query('SELECT setval(\'measurement_types_id_seq\', (SELECT MAX(id) FROM measurement_types))', { transaction: t });
        console.log('   ✓ 6 measurement_types insertados\n');

        // =====================================================
        // 2. LIMPIAR Y REINSERTAR VARIABLES
        // =====================================================
        console.log('2️⃣  Reiniciando variables...');
        
        // Resetear secuencia
        await sequelize.query('ALTER SEQUENCE variables_id_seq RESTART WITH 1', { transaction: t });
        
        // Mapear tipos de agregación
        const mapAggregation = (tipo) => {
            const map = { 'total': 'sum', 'avg': 'avg', 'count': 'count', 'min': 'min', 'max': 'max' };
            return map[tipo] || 'none';
        };
        
        // Mapear tipos de gráfico
        const mapChartType = (tipo) => {
            const validTypes = ['column', 'spline', 'line', 'area', 'bar', 'pie', 'scatter', 'gauge', 'none'];
            return validTypes.includes(tipo) ? tipo : 'spline';
        };
        
        for (const v of variables) {
            await sequelize.query(`
                INSERT INTO variables (
                    id, measurement_type_id, column_name, unit, chart_type,
                    axis_name, axis_id, axis_min, axis_function, aggregation_type,
                    display_order, show_in_billing, show_in_analysis, is_realtime,
                    is_default, is_active, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10,
                    $11, $12, $13, $14,
                    $15, $16, NOW(), NOW()
                )
            `, {
                bind: [
                    v.id,
                    v.tipoMedicionId,
                    v.definicion,
                    v.unidad,
                    mapChartType(v.tipoGrafico),
                    v.axisName,
                    v.axisId,
                    v.axisMin,
                    v.axisFuncionTabla,
                    mapAggregation(v.tipoAgrupacion),
                    v.orden,
                    v.mostrarEnBilling === '1',
                    v.mostrarEnAnalisis === '1',
                    v.realtime === '1',
                    v.default === '1',
                    v.activo === '1'
                ],
                transaction: t
            });
            
            // Insertar traducciones ES/EN
            await sequelize.query(`
                INSERT INTO variable_translations (variable_id, lang, name, description, created_at, updated_at)
                VALUES ($1, 'es', $2, $3, NOW(), NOW()), ($1, 'en', $2, $3, NOW(), NOW())
            `, {
                bind: [v.id, v.nombre, v.descripcion],
                transaction: t
            });
        }
        
        // Actualizar secuencia
        await sequelize.query('SELECT setval(\'variables_id_seq\', (SELECT MAX(id) FROM variables))', { transaction: t });
        console.log(`   ✓ ${variables.length} variables insertadas\n`);

        // =====================================================
        // 3. CREAR ORGANIZACIÓN HOTELES LIBERTADOR
        // =====================================================
        console.log('3️⃣  Creando organización Hoteles Libertador...');
        
        // Obtener siguiente human_id disponible
        const [maxHumanId] = await sequelize.query(
            'SELECT COALESCE(MAX(human_id), 0) + 1 as next_id FROM organizations',
            { transaction: t }
        );
        
        const orgId = uuidv7();
        const orgHumanId = maxHumanId[0].next_id;
        const orgPublicCode = generatePublicCode('ORG', orgHashids, orgHumanId);
        
        // Peru country_id = 391
        const peruCountryId = 391;
        
        await sequelize.query(`
            INSERT INTO organizations (
                id, human_id, public_code, slug, name, description,
                country_id, is_active, created_at, updated_at
            ) VALUES (
                $1, $2, $3, 'hoteles-libertador', 'Hoteles Libertador', 
                'Inversiones Nacionales de Turismo S.A.',
                $4, true, NOW(), NOW()
            )
        `, {
            bind: [orgId, orgHumanId, orgPublicCode, peruCountryId],
            transaction: t
        });
        
        console.log(`   ✓ Organización creada: ORG-${String(orgHumanId).padStart(6, '0')} (${orgPublicCode})\n`);

        // =====================================================
        // 4. INSERTAR EQUIPOS (DEVICES)
        // =====================================================
        console.log('4️⃣  Insertando equipos...');
        
        // Obtener siguiente human_id disponible para devices
        const [maxDeviceHumanId] = await sequelize.query(
            'SELECT COALESCE(MAX(human_id), 0) + 1 as next_id FROM devices',
            { transaction: t }
        );
        
        // Mapa de equipoId viejo -> nuevo device id
        const deviceMap = new Map();
        let deviceCounter = maxDeviceHumanId[0].next_id;
        
        // Filtrar equipos únicos por uuid (hay duplicados en el JSON)
        const uniqueEquipos = [];
        const seenUuids = new Set();
        for (const e of equipos) {
            if (!seenUuids.has(e.uuid)) {
                seenUuids.add(e.uuid);
                uniqueEquipos.push(e);
            }
        }
        
        for (const equipo of uniqueEquipos) {
            const newDeviceId = uuidv7();
            const publicCode = generatePublicCode('DEV', deviceHashids, deviceCounter);
            
            // Guardar UUID original en metadata para consultas Cassandra
            const metadata = {
                legacy_uuid: equipo.uuid,
                legacy_id: equipo.id,
                latitude: equipo.lat,
                longitude: equipo.lon
            };
            
            await sequelize.query(`
                INSERT INTO devices (
                    id, human_id, public_code, organization_id,
                    name, mac_address, timezone, metadata,
                    device_type, status, is_active, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7, $8,
                    'gateway', 'active', $9, NOW(), NOW()
                )
            `, {
                bind: [
                    newDeviceId,
                    deviceCounter,
                    publicCode,
                    orgId,
                    equipo.nombre,
                    equipo.mac || null,
                    equipo.timezone || 'America/Lima',
                    JSON.stringify(metadata),
                    equipo.activo === '1'
                ],
                transaction: t
            });
            
            deviceMap.set(equipo.id, newDeviceId);
            deviceCounter++;
        }
        
        console.log(`   ✓ ${uniqueEquipos.length} equipos insertados\n`);

        // =====================================================
        // 5. INSERTAR CANALES (CHANNELS)
        // =====================================================
        console.log('5️⃣  Insertando canales...');
        
        // Obtener siguiente human_id disponible para channels
        const [maxChannelHumanId] = await sequelize.query(
            'SELECT COALESCE(MAX(human_id), 0) + 1 as next_id FROM channels',
            { transaction: t }
        );
        
        // Mapa de canalId viejo -> nuevo channel id
        const channelMap = new Map();
        let channelCounter = maxChannelHumanId[0].next_id;
        let insertedChannels = 0;
        let skippedChannels = 0;
        
        // Sets para evitar duplicados por (device_id, ch) y (device_id, name)
        const seenDeviceCh = new Set();
        const seenDeviceName = new Set();
        
        for (const canal of canales) {
            const deviceId = deviceMap.get(canal.equipoId);
            
            if (!deviceId) {
                skippedChannels++;
                continue;
            }
            
            // Evitar duplicados por (device_id, ch)
            const deviceChKey = `${deviceId}-${canal.ch}`;
            if (seenDeviceCh.has(deviceChKey)) {
                skippedChannels++;
                continue;
            }
            
            // Evitar duplicados por (device_id, name)
            const deviceNameKey = `${deviceId}-${canal.nombre}`;
            if (seenDeviceName.has(deviceNameKey)) {
                skippedChannels++;
                continue;
            }
            
            seenDeviceCh.add(deviceChKey);
            seenDeviceName.add(deviceNameKey);
            
            const newChannelId = uuidv7();
            const publicCode = generatePublicCode('CHN', channelHashids, channelCounter);
            
            // Guardar ID original en metadata para referencia
            const channelMetadata = {
                legacy_id: canal.id,
                varios: canal.varios
            };
            
            await sequelize.query(`
                INSERT INTO channels (
                    id, human_id, public_code, device_id, organization_id,
                    name, description, ch, measurement_type_id, metadata,
                    channel_type, protocol, direction, status, is_active,
                    created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10,
                    'modbus', 'modbus_tcp', 'inbound', 'active', $11,
                    NOW(), NOW()
                )
            `, {
                bind: [
                    newChannelId,
                    channelCounter,
                    publicCode,
                    deviceId,
                    orgId,
                    canal.nombre,
                    canal.descripcion || null,
                    canal.ch,
                    canal.tipoMedicionId,
                    JSON.stringify(channelMetadata),
                    canal.activo === '1'
                ],
                transaction: t
            });
            
            channelMap.set(canal.id, newChannelId);
            channelCounter++;
            insertedChannels++;
        }
        
        console.log(`   ✓ ${insertedChannels} canales insertados (${skippedChannels} omitidos por device no encontrado)\n`);

        // =====================================================
        // 6. INSERTAR RELACIONES CHANNEL_VARIABLES
        // =====================================================
        console.log('6️⃣  Insertando relaciones channel_variables...');
        
        let insertedRelations = 0;
        let skippedRelations = 0;
        
        for (const cv of channelVariables) {
            const channelId = channelMap.get(cv.canaleId);
            
            if (!channelId) {
                skippedRelations++;
                continue;
            }
            
            // Verificar que la variable existe
            const [varExists] = await sequelize.query(
                'SELECT id FROM variables WHERE id = $1',
                { bind: [cv.variableId], transaction: t }
            );
            
            if (varExists.length === 0) {
                skippedRelations++;
                continue;
            }
            
            await sequelize.query(`
                INSERT INTO channel_variables (channel_id, variable_id, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
                ON CONFLICT (channel_id, variable_id) DO NOTHING
            `, {
                bind: [channelId, cv.variableId, cv.activo === '1'],
                transaction: t
            });
            
            insertedRelations++;
        }
        
        console.log(`   ✓ ${insertedRelations} relaciones insertadas (${skippedRelations} omitidas)\n`);

        // =====================================================
        // COMMIT TRANSACCIÓN
        // =====================================================
        await t.commit();
        
        console.log('═══════════════════════════════════════════════════');
        console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════');
        console.log(`   📊 6 measurement_types`);
        console.log(`   📊 ${variables.length} variables`);
        console.log(`   🏢 1 organización (Hoteles Libertador)`);
        console.log(`   📱 ${uniqueEquipos.length} equipos`);
        console.log(`   📡 ${insertedChannels} canales`);
        console.log(`   🔗 ${insertedRelations} relaciones channel_variables`);
        console.log('═══════════════════════════════════════════════════\n');
        
        // Mostrar algunos ejemplos
        console.log('📋 Ejemplos de canales activos para probar:');
        const [sampleChannels] = await sequelize.query(`
            SELECT c.public_code, c.name, c.ch, d.uuid as device_uuid, mt.table_prefix
            FROM channels c
            JOIN devices d ON c.device_id = d.id
            JOIN measurement_types mt ON c.measurement_type_id = mt.id
            WHERE c.is_active = true
            LIMIT 5
        `);
        
        for (const ch of sampleChannels) {
            console.log(`   - ${ch.public_code}: ${ch.name} (ch=${ch.ch}, uuid=${ch.device_uuid.substring(0, 8)}...)`);
        }
        
        process.exit(0);
        
    } catch (error) {
        await t.rollback();
        console.error('❌ Error en migración:', error);
        process.exit(1);
    }
};

runMigration();
