import sequelize from '../sql/sequelize.js';
import { QueryTypes } from 'sequelize';
import { dbLogger } from '../../utils/logger.js';

const deviceTypesData = [
    { code: 'meter',       icon: 'meter',      display_order: 1, is_active: true, translations: { es: { name: 'Medidor',          description: 'Medidor eléctrico o de variable' },          en: { name: 'Meter',       description: 'Electrical or variable meter' } } },
    { code: 'gateway',     icon: 'gateway',    display_order: 2, is_active: true, translations: { es: { name: 'Gateway',          description: 'Dispositivo de comunicación y enrutamiento' }, en: { name: 'Gateway',    description: 'Communication and routing device' } } },
    { code: 'controller',  icon: 'controller', display_order: 3, is_active: true, translations: { es: { name: 'Controlador',      description: 'Dispositivo de control y automatización' },   en: { name: 'Controller', description: 'Control and automation device' } } },
    { code: 'sensor',      icon: 'sensor',     display_order: 4, is_active: true, translations: { es: { name: 'Sensor',           description: 'Sensor de variables físicas' },               en: { name: 'Sensor',     description: 'Physical variable sensor' } } },
    { code: 'iot_device',  icon: 'iot',        display_order: 5, is_active: true, translations: { es: { name: 'Dispositivo IoT',  description: 'Dispositivo IoT genérico' },                  en: { name: 'IoT Device', description: 'Generic IoT device' } } },
    { code: 'edge_device', icon: 'edge',       display_order: 6, is_active: true, translations: { es: { name: 'Edge Device',      description: 'Dispositivo de computación en el borde' },    en: { name: 'Edge Device', description: 'Edge computing device' } } }
];

const deviceBrandsData = [
    { code: 'schneider',     display_order: 1, is_active: true, translations: { es: { name: 'Schneider Electric', description: 'Líder global en gestión de energía y automatización' },    en: { name: 'Schneider Electric', description: 'Global leader in energy management and automation' } } },
    { code: 'abb',           display_order: 2, is_active: true, translations: { es: { name: 'ABB',                description: 'Grupo multinacional sueco-suizo de tecnología' },            en: { name: 'ABB',                description: 'Swedish-Swiss multinational technology group' } } },
    { code: 'siemens',       display_order: 3, is_active: true, translations: { es: { name: 'Siemens',            description: 'Conglomerado multinacional alemán' },                         en: { name: 'Siemens',            description: 'German multinational conglomerate' } } },
    { code: 'socomec',       display_order: 4, is_active: true, translations: { es: { name: 'Socomec',            description: 'Especialista en energía crítica' },                           en: { name: 'Socomec',            description: 'Critical power specialist' } } },
    { code: 'janitza',       display_order: 5, is_active: true, translations: { es: { name: 'Janitza',            description: 'Experto en monitoreo de calidad de energía' },               en: { name: 'Janitza',            description: 'Power quality monitoring expert' } } },
    { code: 'carlo_gavazzi', display_order: 6, is_active: true, translations: { es: { name: 'Carlo Gavazzi',      description: 'Especialista en automatización y medición de energía' },     en: { name: 'Carlo Gavazzi',      description: 'Automation and energy measurement specialist' } } },
    { code: 'circutor',      display_order: 7, is_active: true, translations: { es: { name: 'Circutor',           description: 'Empresa española de eficiencia energética' },                 en: { name: 'Circutor',           description: 'Spanish energy efficiency company' } } },
    { code: 'generic',       display_order: 8, is_active: true, translations: { es: { name: 'Genérico',           description: 'Dispositivo de marca genérica o desconocida' },              en: { name: 'Generic',            description: 'Generic or unknown brand device' } } }
];

const deviceModelsByBrandCode = {
    schneider: [
        { code: 'PM5000',   display_order: 1, translations: { es: { name: 'PowerLogic PM5000', description: 'Analizador de energía con Ethernet y Modbus' },     en: { name: 'PowerLogic PM5000', description: 'Energy analyzer with Ethernet and Modbus' } } },
        { code: 'PM8000',   display_order: 2, translations: { es: { name: 'PowerLogic PM8000', description: 'Analizador avanzado con pantalla táctil' },           en: { name: 'PowerLogic PM8000', description: 'Advanced analyzer with touchscreen' } } },
        { code: 'EG2000',   display_order: 3, translations: { es: { name: 'EcoStruxure EG2000', description: 'Gateway IoT para medidores en campo' },              en: { name: 'EcoStruxure EG2000', description: 'IoT gateway for field meters' } } },
        { code: 'ION7400',  display_order: 4, translations: { es: { name: 'ION7400',            description: 'Medidor de calidad de energía de alta precisión' }, en: { name: 'ION7400',            description: 'High-precision power quality meter' } } }
    ],
    abb: [
        { code: 'B24',    display_order: 1, translations: { es: { name: 'B24 Multimíter',   description: 'Analizador compacto de panel' },              en: { name: 'B24 Multimeter',   description: 'Compact panel analyzer' } } },
        { code: 'C13',    display_order: 2, translations: { es: { name: 'C13 Medidor',      description: 'Medidor de energía trifásico compacto' },     en: { name: 'C13 Meter',       description: 'Compact three-phase energy meter' } } },
        { code: 'EQ',     display_order: 3, translations: { es: { name: 'EQmeter',          description: 'Medidor de calidad de energía' },              en: { name: 'EQmeter',          description: 'Power quality meter' } } },
        { code: 'REX640', display_order: 4, translations: { es: { name: 'REX640 Gateway',   description: 'Gateway de comunicación y relé de protección' }, en: { name: 'REX640 Gateway',  description: 'Communication gateway and protection relay' } } }
    ],
    siemens: [
        { code: 'SENTRON_PAC3200', display_order: 1, translations: { es: { name: 'SENTRON PAC3200', description: 'Analizador de potencia multifuncional' },         en: { name: 'SENTRON PAC3200', description: 'Multifunctional power analyzer' } } },
        { code: 'SENTRON_PAC3220', display_order: 2, translations: { es: { name: 'SENTRON PAC3220', description: 'Analizador de potencia con display' },             en: { name: 'SENTRON PAC3220', description: 'Power analyzer with display' } } },
        { code: 'SIMEAS_P',        display_order: 3, translations: { es: { name: 'SIMEAS P',         description: 'Medidor de calidad de energía ANSI/IEC' },        en: { name: 'SIMEAS P',         description: 'ANSI/IEC power quality meter' } } }
    ],
    socomec: [
        { code: 'DIRIS_A40', display_order: 1, translations: { es: { name: 'Diris A40',  description: 'Analizador de red multifunción con pantalla' },    en: { name: 'Diris A40',  description: 'Multifunction network analyzer with display' } } },
        { code: 'DIRIS_B30', display_order: 2, translations: { es: { name: 'Diris B30',  description: 'Analizador de red compacto sin pantalla' },          en: { name: 'Diris B30',  description: 'Compact network analyzer without display' } } }
    ],
    janitza: [
        { code: 'UMG96RM',  display_order: 1, translations: { es: { name: 'UMG 96RM',  description: 'Analizador de red DIN compacto' },                   en: { name: 'UMG 96RM',  description: 'Compact DIN network analyzer' } } },
        { code: 'UMG512',   display_order: 2, translations: { es: { name: 'UMG 512',   description: 'Analizador de calidad de energía profesional' },     en: { name: 'UMG 512',   description: 'Professional power quality analyzer' } } }
    ],
    carlo_gavazzi: [
        { code: 'EM100',  display_order: 1, translations: { es: { name: 'EM100',  description: 'Medidor de energía monofásico compacto' },                en: { name: 'EM100',  description: 'Compact single-phase energy meter' } } },
        { code: 'EM340',  display_order: 2, translations: { es: { name: 'EM340',  description: 'Medidor de energía trifásico con RS485' },                 en: { name: 'EM340',  description: 'Three-phase energy meter with RS485' } } },
        { code: 'WM30',   display_order: 3, translations: { es: { name: 'WM30',   description: 'Medidor de energía trifásico Modbus' },                    en: { name: 'WM30',   description: 'Three-phase Modbus energy meter' } } }
    ],
    circutor: [
        { code: 'CEM_C10', display_order: 1, translations: { es: { name: 'CEM-C10', description: 'Analizador de redes con comunicación Modbus' },         en: { name: 'CEM-C10', description: 'Network analyzer with Modbus communication' } } },
        { code: 'MK_30',   display_order: 2, translations: { es: { name: 'MK-30',   description: 'Medidor multifunción con comunicación' },                en: { name: 'MK-30',   description: 'Multifunction meter with communication' } } }
    ],
    generic: [
        { code: 'GENERIC_MODBUS', display_order: 1, translations: { es: { name: 'Genérico Modbus', description: 'Dispositivo genérico con protocolo Modbus RTU/TCP' }, en: { name: 'Generic Modbus', description: 'Generic device with Modbus RTU/TCP protocol' } } },
        { code: 'GENERIC_MQTT',   display_order: 2, translations: { es: { name: 'Genérico MQTT',   description: 'Dispositivo genérico con protocolo MQTT' },             en: { name: 'Generic MQTT',   description: 'Generic device with MQTT protocol' } } }
    ]
};

const deviceNetworksData = [
    { code: '4g_lte',     icon: '4g',        display_order: 1, is_active: true, translations: { es: { name: '4G/LTE',       description: 'Red celular 4G LTE para IoT' },              en: { name: '4G/LTE',       description: '4G LTE cellular network for IoT' } } },
    { code: 'wifi',       icon: 'wifi',      display_order: 2, is_active: true, translations: { es: { name: 'WiFi',         description: 'Red inalámbrica WiFi 802.11' },               en: { name: 'WiFi',         description: 'Wireless network WiFi 802.11' } } },
    { code: 'ethernet',   icon: 'ethernet',  display_order: 3, is_active: true, translations: { es: { name: 'Ethernet LAN', description: 'Red local cableada Ethernet' },               en: { name: 'Ethernet LAN', description: 'Wired local area network Ethernet' } } },
    { code: 'lorawan',    icon: 'lora',      display_order: 4, is_active: true, translations: { es: { name: 'LoRaWAN',      description: 'Red de largo alcance y bajo consumo' },       en: { name: 'LoRaWAN',      description: 'Long range low power network' } } },
    { code: 'rs485',      icon: 'serial',    display_order: 5, is_active: true, translations: { es: { name: 'RS-485',       description: 'Bus serial RS-485 industrial' },               en: { name: 'RS-485',       description: 'Industrial RS-485 serial bus' } } },
    { code: 'modbus_tcp', icon: 'modbus',    display_order: 6, is_active: true, translations: { es: { name: 'Modbus TCP',   description: 'Protocolo Modbus sobre TCP/IP' },              en: { name: 'Modbus TCP',   description: 'Modbus protocol over TCP/IP' } } }
];

const deviceServersData = [
    { code: 'mqtt_primary', server_type: 'mqtt',    host: 'mqtt.ecdata.io',        port: 1883, use_ssl: false, display_order: 1, is_active: true, translations: { es: { name: 'MQTT Principal',  description: 'Broker MQTT principal de producción' },  en: { name: 'MQTT Primary',  description: 'Primary production MQTT broker' } } },
    { code: 'mqtt_backup',  server_type: 'mqtt',    host: 'mqtt-backup.ecdata.io', port: 1883, use_ssl: false, display_order: 2, is_active: true, translations: { es: { name: 'MQTT Backup',     description: 'Broker MQTT de respaldo' },               en: { name: 'MQTT Backup',   description: 'Backup MQTT broker' } } },
    { code: 'ftp_primary',  server_type: 'ftp',     host: 'ftp.ecdata.io',         port: 21,   use_ssl: false, display_order: 3, is_active: true, translations: { es: { name: 'FTP Principal',   description: 'Servidor FTP para transferencia de archivos' }, en: { name: 'FTP Primary', description: 'FTP server for file transfer' } } }
];

const deviceLicensesData = [
    { code: 'ec_iot',        icon: 'iot',        color: '#3B82F6', display_order: 1, is_active: true, translations: { es: { name: 'EC.IoT',          description: 'Licencia para dispositivos IoT genéricos' },            en: { name: 'EC.IoT',        description: 'License for generic IoT devices' } } },
    { code: 'ec_automation', icon: 'automation', color: '#8B5CF6', display_order: 2, is_active: true, translations: { es: { name: 'EC.Automatización', description: 'Licencia para dispositivos de automatización' },         en: { name: 'EC.Automation', description: 'License for automation devices' } } },
    { code: 'ec_billing',    icon: 'billing',    color: '#10B981', display_order: 3, is_active: true, translations: { es: { name: 'EC.Billing',       description: 'Licencia para medición y facturación de energía' },      en: { name: 'EC.Billing',    description: 'License for energy metering and billing' } } },
    { code: 'ec_analytics',  icon: 'analytics',  color: '#F59E0B', display_order: 4, is_active: true, translations: { es: { name: 'EC.Analítica',     description: 'Licencia para análisis avanzado de datos' },             en: { name: 'EC.Analytics',  description: 'License for advanced data analytics' } } }
];

const deviceValidityPeriodsData = [
    { code: '12_months', months: 12,   display_order: 1, is_active: true, translations: { es: { name: '12 Meses',   description: 'Vigencia de 1 año (12 meses)' },          en: { name: '12 Months',   description: '1 year validity (12 months)' } } },
    { code: '24_months', months: 24,   display_order: 2, is_active: true, translations: { es: { name: '24 Meses',   description: 'Vigencia de 2 años (24 meses)' },          en: { name: '24 Months',   description: '2 year validity (24 months)' } } },
    { code: '36_months', months: 36,   display_order: 3, is_active: true, translations: { es: { name: '36 Meses',   description: 'Vigencia de 3 años (36 meses)' },          en: { name: '36 Months',   description: '3 year validity (36 months)' } } },
    { code: 'enterprise', months: null, display_order: 4, is_active: true, translations: { es: { name: 'Enterprise', description: 'Vigencia ilimitada para contratos enterprise' }, en: { name: 'Enterprise', description: 'Unlimited validity for enterprise contracts' } } }
];

const seedDeviceTypes = async () => {
    let created = 0;
    for (const dt of deviceTypesData) {
        const [row] = await sequelize.query(
            `INSERT INTO device_types (code, icon, display_order, is_active, created_at, updated_at)
             VALUES (:code, :icon, :display_order, :is_active, NOW(), NOW())
             ON CONFLICT (code) DO NOTHING
             RETURNING id, code`,
            { replacements: { code: dt.code, icon: dt.icon, display_order: dt.display_order, is_active: dt.is_active }, type: QueryTypes.SELECT }
        );
        if (row) {
            created++;
            for (const [lang, tr] of Object.entries(dt.translations)) {
                await sequelize.query(
                    `INSERT INTO device_type_translations (device_type_id, lang, name, description)
                     VALUES (:deviceTypeId, :lang, :name, :description)`,
                    { replacements: { deviceTypeId: row.id, lang, name: tr.name, description: tr.description }, type: QueryTypes.INSERT }
                );
            }
        }
    }
    return created;
};

const seedDeviceBrands = async () => {
    let created = 0;
    for (const brand of deviceBrandsData) {
        const [row] = await sequelize.query(
            `INSERT INTO device_brands (code, display_order, is_active, created_at, updated_at)
             VALUES (:code, :display_order, :is_active, NOW(), NOW())
             ON CONFLICT (code) DO NOTHING
             RETURNING id, code`,
            { replacements: { code: brand.code, display_order: brand.display_order, is_active: brand.is_active }, type: QueryTypes.SELECT }
        );
        if (row) {
            created++;
            for (const [lang, tr] of Object.entries(brand.translations)) {
                await sequelize.query(
                    `INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
                     VALUES (:brandId, :lang, :name, :description)`,
                    { replacements: { brandId: row.id, lang, name: tr.name, description: tr.description }, type: QueryTypes.INSERT }
                );
            }
        }
    }
    return created;
};

const seedDeviceModels = async () => {
    let created = 0;
    for (const [brandCode, models] of Object.entries(deviceModelsByBrandCode)) {
        const [brand] = await sequelize.query(
            `SELECT id FROM device_brands WHERE code = :code LIMIT 1`,
            { replacements: { code: brandCode }, type: QueryTypes.SELECT }
        );
        if (!brand) continue;

        for (const model of models) {
            const [row] = await sequelize.query(
                `INSERT INTO device_models (device_brand_id, code, display_order, is_active, created_at, updated_at)
                 VALUES (:brandId, :code, :display_order, :is_active, NOW(), NOW())
                 ON CONFLICT (device_brand_id, code) DO NOTHING
                 RETURNING id, code`,
                { replacements: { brandId: brand.id, code: model.code, display_order: model.display_order, is_active: true }, type: QueryTypes.SELECT }
            );
            if (row) {
                created++;
                for (const [lang, tr] of Object.entries(model.translations)) {
                    await sequelize.query(
                        `INSERT INTO device_model_translations (device_model_id, lang, name, description)
                         VALUES (:modelId, :lang, :name, :description)`,
                        { replacements: { modelId: row.id, lang, name: tr.name, description: tr.description }, type: QueryTypes.INSERT }
                    );
                }
            }
        }
    }
    return created;
};

const seedDeviceNetworks = async () => {
    let created = 0;
    for (const net of deviceNetworksData) {
        const [row] = await sequelize.query(
            `INSERT INTO device_networks (code, icon, display_order, is_active, created_at, updated_at)
             VALUES (:code, :icon, :display_order, :is_active, NOW(), NOW())
             ON CONFLICT (code) DO NOTHING
             RETURNING id, code`,
            { replacements: { code: net.code, icon: net.icon, display_order: net.display_order, is_active: net.is_active }, type: QueryTypes.SELECT }
        );
        if (row) {
            created++;
            for (const [lang, tr] of Object.entries(net.translations)) {
                await sequelize.query(
                    `INSERT INTO device_network_translations (device_network_id, lang, name, description)
                     VALUES (:networkId, :lang, :name, :description)`,
                    { replacements: { networkId: row.id, lang, name: tr.name, description: tr.description }, type: QueryTypes.INSERT }
                );
            }
        }
    }
    return created;
};

const seedDeviceServers = async () => {
    let created = 0;
    for (const srv of deviceServersData) {
        const [row] = await sequelize.query(
            `INSERT INTO device_servers (code, server_type, host, port, use_ssl, display_order, is_active, created_at, updated_at)
             VALUES (:code, :server_type, :host, :port, :use_ssl, :display_order, :is_active, NOW(), NOW())
             ON CONFLICT (code) DO NOTHING
             RETURNING id, code`,
            { replacements: { code: srv.code, server_type: srv.server_type, host: srv.host, port: srv.port, use_ssl: srv.use_ssl, display_order: srv.display_order, is_active: srv.is_active }, type: QueryTypes.SELECT }
        );
        if (row) {
            created++;
            for (const [lang, tr] of Object.entries(srv.translations)) {
                await sequelize.query(
                    `INSERT INTO device_server_translations (device_server_id, lang, name, description)
                     VALUES (:serverId, :lang, :name, :description)`,
                    { replacements: { serverId: row.id, lang, name: tr.name, description: tr.description }, type: QueryTypes.INSERT }
                );
            }
        }
    }
    return created;
};

const seedDeviceLicenses = async () => {
    let created = 0;
    for (const lic of deviceLicensesData) {
        const [row] = await sequelize.query(
            `INSERT INTO device_licenses (code, icon, color, display_order, is_active, created_at, updated_at)
             VALUES (:code, :icon, :color, :display_order, :is_active, NOW(), NOW())
             ON CONFLICT (code) DO NOTHING
             RETURNING id, code`,
            { replacements: { code: lic.code, icon: lic.icon, color: lic.color, display_order: lic.display_order, is_active: lic.is_active }, type: QueryTypes.SELECT }
        );
        if (row) {
            created++;
            for (const [lang, tr] of Object.entries(lic.translations)) {
                await sequelize.query(
                    `INSERT INTO device_license_translations (device_license_id, lang, name, description)
                     VALUES (:licenseId, :lang, :name, :description)`,
                    { replacements: { licenseId: row.id, lang, name: tr.name, description: tr.description }, type: QueryTypes.INSERT }
                );
            }
        }
    }
    return created;
};

const seedDeviceValidityPeriods = async () => {
    let created = 0;
    for (const vp of deviceValidityPeriodsData) {
        const [row] = await sequelize.query(
            `INSERT INTO device_validity_periods (code, months, display_order, is_active, created_at, updated_at)
             VALUES (:code, :months, :display_order, :is_active, NOW(), NOW())
             ON CONFLICT (code) DO NOTHING
             RETURNING id, code`,
            { replacements: { code: vp.code, months: vp.months ?? null, display_order: vp.display_order, is_active: vp.is_active }, type: QueryTypes.SELECT }
        );
        if (row) {
            created++;
            for (const [lang, tr] of Object.entries(vp.translations)) {
                await sequelize.query(
                    `INSERT INTO device_validity_period_translations (device_validity_period_id, lang, name, description)
                     VALUES (:vpId, :lang, :name, :description)`,
                    { replacements: { vpId: row.id, lang, name: tr.name, description: tr.description }, type: QueryTypes.INSERT }
                );
            }
        }
    }
    return created;
};

/**
 * Seeder completo de metadatos de dispositivos.
 * Idempotente via guard `if (row)` después del RETURNING:
 * - Los padres (device_types, device_brands, etc.) usan ON CONFLICT (code) DO NOTHING
 * - Si el padre ya existe, RETURNING devuelve vacío → row=undefined → las traducciones se saltan
 * - Las traducciones NO usan ON CONFLICT porque solo se insertan cuando el padre es nuevo
 * → Funciona en cualquier DB, con o sin constraints únicos en las tablas de traducción
 */
export const seedDeviceMetadata = async () => {
    try {
        dbLogger.info('🔧 Iniciando seeder de device-metadata...');

        const [{ count }] = await sequelize.query(
            `SELECT COUNT(*) as count FROM device_types`,
            { type: QueryTypes.SELECT }
        );

        if (parseInt(count, 10) > 0) {
            dbLogger.info(`⏭️  Device metadata ya existe (${count} tipos de dispositivo). Saltando seeder.`);
            return { deviceTypes: 0, deviceBrands: 0, deviceModels: 0, deviceNetworks: 0, deviceServers: 0, deviceLicenses: 0, deviceValidityPeriods: 0 };
        }

        const deviceTypes       = await seedDeviceTypes();
        const deviceBrands      = await seedDeviceBrands();
        const deviceModels      = await seedDeviceModels();
        const deviceNetworks    = await seedDeviceNetworks();
        const deviceServers     = await seedDeviceServers();
        const deviceLicenses    = await seedDeviceLicenses();
        const deviceValidityPeriods = await seedDeviceValidityPeriods();

        dbLogger.info('✅ Device-metadata seed completado');

        return { deviceTypes, deviceBrands, deviceModels, deviceNetworks, deviceServers, deviceLicenses, deviceValidityPeriods };
    } catch (error) {
        dbLogger.error(error, '❌ Error en device-metadata seeder');
        throw error;
    }
};
