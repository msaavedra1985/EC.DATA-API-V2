import sequelize from '../sql/sequelize.js';
import { QueryTypes } from 'sequelize';
import { dbLogger } from '../../utils/logger.js';

const deviceTypesData = [
    { code: 'node',        icon: 'cpu',        display_order: 1, is_active: true, translations: { es: { name: 'Nodo',           description: null }, en: { name: 'Node',        description: null } } },
    { code: 'ucm',         icon: 'server',     display_order: 2, is_active: true, translations: { es: { name: 'UCM',            description: null }, en: { name: 'UCM',         description: null } } },
    { code: 'gateway',     icon: 'router',     display_order: 3, is_active: true, translations: { es: { name: 'Gateway',         description: null }, en: { name: 'Gateway',     description: null } } },
    { code: 'lora_antenna',icon: 'radio',      display_order: 4, is_active: true, translations: { es: { name: 'Antena Lora',     description: null }, en: { name: 'Lora Antenna',description: null } } },
    { code: 'meter',       icon: 'gauge',      display_order: 5, is_active: true, translations: { es: { name: 'Medidor',         description: null }, en: { name: 'Meter',       description: null } } },
    { code: 'controller',  icon: 'controller', display_order: 3, is_active: true, translations: { es: { name: 'Controlador',     description: 'Dispositivo de control y automatización' }, en: { name: 'Controller',  description: 'Control and automation device' } } },
    { code: 'sensor',      icon: 'sensor',     display_order: 4, is_active: true, translations: { es: { name: 'Sensor',          description: 'Sensor de variables físicas' },             en: { name: 'Sensor',      description: 'Physical variable sensor' } } },
    { code: 'iot_device',  icon: 'iot',        display_order: 5, is_active: true, translations: { es: { name: 'Dispositivo IoT', description: 'Dispositivo IoT genérico' },                 en: { name: 'IoT Device',  description: 'Generic IoT device' } } },
    { code: 'edge_device', icon: 'edge',       display_order: 6, is_active: true, translations: { es: { name: 'Edge Device',     description: 'Dispositivo de computación en el borde' },  en: { name: 'Edge Device', description: 'Edge computing device' } } },
];

const deviceBrandsData = [
    { code: 'energycloud',       display_order: 1,  is_active: true, translations: { es: { name: 'EnergyCloud' },       en: { name: 'EnergyCloud' } } },
    { code: 'socomec',           display_order: 2,  is_active: true, translations: { es: { name: 'Socomec' },           en: { name: 'Socomec' } } },
    { code: 'schneider',         display_order: 3,  is_active: true, translations: { es: { name: 'Schneider Electric' },en: { name: 'Schneider Electric' } } },
    { code: 'accuenergy',        display_order: 4,  is_active: true, translations: { es: { name: 'AccuEnergy' },        en: { name: 'AccuEnergy' } } },
    { code: 'meazom',            display_order: 5,  is_active: true, translations: { es: { name: 'Meazom' },            en: { name: 'Meazom' } } },
    { code: 'circuitor',         display_order: 6,  is_active: true, translations: { es: { name: 'Circuitor' },         en: { name: 'Circuitor' } } },
    { code: 'shark',             display_order: 7,  is_active: true, translations: { es: { name: 'Shark' },             en: { name: 'Shark' } } },
    { code: 'best',              display_order: 8,  is_active: true, translations: { es: { name: 'Best' },              en: { name: 'Best' } } },
    { code: 'shelly',            display_order: 9,  is_active: true, translations: { es: { name: 'Shelly' },            en: { name: 'Shelly' } } },
    { code: 'powermeter',        display_order: 10, is_active: true, translations: { es: { name: 'PowerMeter' },        en: { name: 'PowerMeter' } } },
    { code: 'tiny_controls',     display_order: 11, is_active: true, translations: { es: { name: 'Tiny Controls' },     en: { name: 'Tiny Controls' } } },
    { code: 'hidroconta',        display_order: 12, is_active: true, translations: { es: { name: 'Hidroconta' },        en: { name: 'Hidroconta' } } },
    { code: 'network_thermostat',display_order: 13, is_active: true, translations: { es: { name: 'Network Thermostat' },en: { name: 'Network Thermostat' } } },
    { code: 'johnson_controls',  display_order: 14, is_active: true, translations: { es: { name: 'Johnson Controls' },  en: { name: 'Johnson Controls' } } },
    { code: 'abb',               display_order: 15, is_active: true, translations: { es: { name: 'ABB' },               en: { name: 'ABB' } } },
    { code: 'trane',             display_order: 16, is_active: true, translations: { es: { name: 'Trane' },             en: { name: 'Trane' } } },
    { code: 'emh',               display_order: 17, is_active: true, translations: { es: { name: 'EMH' },               en: { name: 'EMH' } } },
    { code: 'solution_device',   display_order: 18, is_active: true, translations: { es: { name: 'Solution Device' },   en: { name: 'Solution Device' } } },
    { code: 'acrel',             display_order: 19, is_active: true, translations: { es: { name: 'Acrel' },             en: { name: 'Acrel' } } },
    { code: 'tuya',              display_order: 20, is_active: true, translations: { es: { name: 'Tuya' },              en: { name: 'Tuya' } } },
    { code: 'milesight',         display_order: 21, is_active: true, translations: { es: { name: 'Milesight' },         en: { name: 'Milesight' } } },
    { code: 'siemens',           display_order: 3,  is_active: true, translations: { es: { name: 'Siemens' },           en: { name: 'Siemens' } } },
    { code: 'janitza',           display_order: 5,  is_active: true, translations: { es: { name: 'Janitza' },           en: { name: 'Janitza' } } },
    { code: 'carlo_gavazzi',     display_order: 6,  is_active: true, translations: { es: { name: 'Carlo Gavazzi' },     en: { name: 'Carlo Gavazzi' } } },
    { code: 'circutor',          display_order: 7,  is_active: true, translations: { es: { name: 'Circutor' },          en: { name: 'Circutor' } } },
    { code: 'generic',           display_order: 8,  is_active: true, translations: { es: { name: 'Genérico' },          en: { name: 'Generic' } } },
];

const deviceModelsByBrandCode = {
    energycloud: [
        { code: 'ECS',                       display_order: 1  },
        { code: 'EC.node',                   display_order: 2  },
        { code: 'EC.Termostato',             display_order: 3  },
    ],
    socomec: [
        { code: 'DIRIS_A40',                 display_order: 1  },
        { code: 'DIRIS_B30',                 display_order: 2  },
        { code: 'Dirris A20',                display_order: 4  },
        { code: 'Dirris A10',                display_order: 5  },
    ],
    schneider: [
        { code: 'PM5000',                    display_order: 1  },
        { code: 'PM8000',                    display_order: 2  },
        { code: 'EG2000',                    display_order: 3  },
        { code: 'ION7400',                   display_order: 4  },
        { code: 'PM5560',                    display_order: 6  },
        { code: 'PM5510',                    display_order: 7  },
        { code: 'PM5330',                    display_order: 8  },
        { code: 'PM2000',                    display_order: 9  },
        { code: 'PM810',                     display_order: 10 },
        { code: 'PM710',                     display_order: 11 },
        { code: 'PM1200',                    display_order: 12 },
        { code: 'PM600',                     display_order: 13 },
        { code: 'IEM3255',                   display_order: 14 },
        { code: 'Ecostruxware',              display_order: 15 },
    ],
    accuenergy: [
        { code: 'Acuvim II-D',               display_order: 16 },
        { code: 'Acuvim II-W',               display_order: 17 },
        { code: 'Acurev 2100',               display_order: 18 },
        { code: 'Acurev 1310',               display_order: 19 },
        { code: 'Acurev 1302',               display_order: 20 },
        { code: 'Acurev 1203',               display_order: 21 },
    ],
    meazom: [
        { code: 'DinRail Advance V4',        display_order: 22 },
        { code: 'DinRail Advance V3',        display_order: 23 },
    ],
    circuitor: [
        { code: 'CVMC10',                    display_order: 24 },
        { code: 'NRG96',                     display_order: 25 },
        { code: 'CVM1500',                   display_order: 26 },
    ],
    shark: [
        { code: '100',                       display_order: 27 },
    ],
    best: [
        { code: 'Eniscope',                  display_order: 28 },
    ],
    shelly: [
        { code: 'Uni',                       display_order: 29 },
        { code: 'Pro 4PM',                   display_order: 30 },
        { code: 'Pro 2PM',                   display_order: 31 },
        { code: 'Pro 1PM',                   display_order: 32 },
    ],
    powermeter: [
        { code: 'Home',                      display_order: 33 },
        { code: 'Smart',                     display_order: 34 },
        { code: 'Smart LCD',                 display_order: 35 },
    ],
    tiny_controls: [
        { code: 'LK3',                       display_order: 36 },
    ],
    hidroconta: [
        { code: 'Iris',                      display_order: 37 },
    ],
    network_thermostat: [
        { code: 'X7',                        display_order: 38 },
    ],
    johnson_controls: [
        { code: 'Metasys',                   display_order: 39 },
    ],
    abb: [
        { code: 'B24',                       display_order: 1  },
        { code: 'C13',                       display_order: 2  },
        { code: 'EQ',                        display_order: 3  },
        { code: 'REX640',                    display_order: 4  },
        { code: 'VFD',                       display_order: 40 },
    ],
    trane: [
        { code: 'Tracer',                    display_order: 41 },
    ],
    emh: [
        { code: 'LZQJ-XC',                  display_order: 42 },
    ],
    solution_device: [
        { code: 'V4',                        display_order: 43 },
    ],
    acrel: [
        { code: 'ADW210',                    display_order: 44 },
    ],
    tuya: [
        { code: 'Smart IR with T&H Sensor',  display_order: 45 },
        { code: 'Smart plug',                display_order: 46 },
        { code: 'T&H Sensor',               display_order: 47 },
    ],
    milesight: [
        { code: 'WT201',                     display_order: 48 },
    ],
    siemens: [
        { code: 'SENTRON_PAC3200',           display_order: 1  },
        { code: 'SENTRON_PAC3220',           display_order: 2  },
        { code: 'SIMEAS_P',                  display_order: 3  },
    ],
    janitza: [
        { code: 'UMG96RM',                   display_order: 1  },
        { code: 'UMG512',                    display_order: 2  },
    ],
    carlo_gavazzi: [
        { code: 'EM100',                     display_order: 1  },
        { code: 'EM340',                     display_order: 2  },
        { code: 'WM30',                      display_order: 3  },
    ],
    circutor: [
        { code: 'CEM_C10',                   display_order: 1  },
        { code: 'MK_30',                     display_order: 2  },
    ],
    generic: [
        { code: 'GENERIC_MODBUS',            display_order: 1  },
        { code: 'GENERIC_MQTT',              display_order: 2  },
    ],
};

const deviceNetworksData = [
    { code: 'modem_4g',   icon: 'signal',      display_order: 1, is_active: true, translations: { es: { name: 'Modem 4G',   description: null },                          en: { name: '4G Modem',    description: null } } },
    { code: 'ethernet',   icon: 'ethernet-port',display_order: 2, is_active: true, translations: { es: { name: 'Ethernet',   description: null },                          en: { name: 'Ethernet',    description: null } } },
    { code: 'wireless',   icon: 'wifi',         display_order: 3, is_active: true, translations: { es: { name: 'Wireless',   description: null },                          en: { name: 'Wireless',    description: null } } },
    { code: 'lora',       icon: 'radio-tower',  display_order: 4, is_active: true, translations: { es: { name: 'Lora',       description: null },                          en: { name: 'Lora',        description: null } } },
    { code: '4g_lte',     icon: '4g',           display_order: 1, is_active: true, translations: { es: { name: '4G/LTE',     description: 'Red celular 4G LTE para IoT' },  en: { name: '4G/LTE',      description: '4G LTE cellular network for IoT' } } },
    { code: 'wifi',       icon: 'wifi',         display_order: 2, is_active: true, translations: { es: { name: 'WiFi',       description: 'Red inalámbrica WiFi 802.11' },  en: { name: 'WiFi',        description: 'Wireless network WiFi 802.11' } } },
    { code: 'lorawan',    icon: 'lora',         display_order: 4, is_active: true, translations: { es: { name: 'LoRaWAN',    description: 'Red de largo alcance y bajo consumo' }, en: { name: 'LoRaWAN', description: 'Long range low power network' } } },
    { code: 'rs485',      icon: 'serial',       display_order: 5, is_active: true, translations: { es: { name: 'RS-485',     description: 'Bus serial RS-485 industrial' }, en: { name: 'RS-485',      description: 'Industrial RS-485 serial bus' } } },
    { code: 'modbus_tcp', icon: 'modbus',       display_order: 6, is_active: true, translations: { es: { name: 'Modbus TCP', description: 'Protocolo Modbus sobre TCP/IP' },en: { name: 'Modbus TCP',   description: 'Modbus protocol over TCP/IP' } } },
];

const deviceServersData = [
    { code: 'mqttssl.energycloud.tv',      server_type: 'mqttssl', host: 'mqttssl.energycloud.tv',       port: null, use_ssl: true,  display_order: 1,  is_active: true, translations: { es: { name: 'mqttssl.energycloud.tv',      description: null }, en: { name: 'mqttssl.energycloud.tv',      description: null } } },
    { code: 'mqtt.energycloud.tv',          server_type: 'mqtt',    host: 'mqtt.energycloud.tv',          port: null, use_ssl: false, display_order: 2,  is_active: true, translations: { es: { name: 'mqtt.energycloud.tv',          description: null }, en: { name: 'mqtt.energycloud.tv',          description: null } } },
    { code: 'ECmqtt.ecdata.ai',             server_type: 'mqtt',    host: 'ECmqtt.ecdata.ai',             port: null, use_ssl: false, display_order: 3,  is_active: true, translations: { es: { name: 'ECmqtt.ecdata.ai',             description: null }, en: { name: 'ECmqtt.ecdata.ai',             description: null } } },
    { code: 'Ecmqtt.ecdata.ai',             server_type: 'mqtt',    host: 'Ecmqtt.ecdata.ai',             port: null, use_ssl: false, display_order: 4,  is_active: true, translations: { es: { name: 'Ecmqtt.ecdata.ai',             description: null }, en: { name: 'Ecmqtt.ecdata.ai',             description: null } } },
    { code: 'BrokerLB OLD',                 server_type: 'mqtt',    host: null,                           port: null, use_ssl: false, display_order: 5,  is_active: true, translations: { es: { name: 'BrokerLB OLD',                 description: null }, en: { name: 'BrokerLB OLD',                 description: null } } },
    { code: 'ECmqttCluster.energycloud.tv', server_type: 'mqtt',    host: 'ECmqttCluster.energycloud.tv', port: null, use_ssl: false, display_order: 6,  is_active: true, translations: { es: { name: 'ECmqttCluster.energycloud.tv', description: null }, en: { name: 'ECmqttCluster.energycloud.tv', description: null } } },
    { code: 'FTP',                          server_type: 'ftp',     host: null,                           port: null, use_ssl: false, display_order: 7,  is_active: true, translations: { es: { name: 'FTP',                          description: null }, en: { name: 'FTP',                          description: null } } },
    { code: 'ECmqttCluster.ecdata.ai',      server_type: 'mqtt',    host: 'ECmqttCluster.ecdata.ai',      port: null, use_ssl: false, display_order: 8,  is_active: true, translations: { es: { name: 'ECmqttCluster.ecdata.ai',      description: null }, en: { name: 'ECmqttCluster.ecdata.ai',      description: null } } },
    { code: 'mqtt_primary',                 server_type: 'mqtt',    host: 'mqtt.ecdata.io',               port: 1883, use_ssl: false, display_order: 1,  is_active: true, translations: { es: { name: 'MQTT Principal',               description: 'Broker MQTT principal de producción' }, en: { name: 'MQTT Primary', description: 'Primary production MQTT broker' } } },
    { code: 'mqtt_backup',                  server_type: 'mqtt',    host: 'mqtt-backup.ecdata.io',        port: 1883, use_ssl: false, display_order: 2,  is_active: true, translations: { es: { name: 'MQTT Backup',                  description: 'Broker MQTT de respaldo' },             en: { name: 'MQTT Backup',  description: 'Backup MQTT broker' } } },
    { code: 'ftp_primary',                  server_type: 'ftp',     host: 'ftp.ecdata.io',                port: 21,   use_ssl: false, display_order: 3,  is_active: true, translations: { es: { name: 'FTP Principal',                description: 'Servidor FTP para transferencia de archivos' }, en: { name: 'FTP Primary', description: 'FTP server for file transfer' } } },
];

const deviceLicensesData = [
    { code: 'ec_iot',        display_order: 1, is_active: true, translations: { es: { name: 'EC.IoT' },        en: { name: 'EC.IoT' } } },
    { code: 'ec_automation', display_order: 2, is_active: true, translations: { es: { name: 'EC.Automation' }, en: { name: 'EC.Automation' } } },
    { code: 'ec_billing',    display_order: 3, is_active: true, translations: { es: { name: 'EC.Billing' },    en: { name: 'EC.Billing' } } },
    { code: 'ec_ems',        display_order: 4, is_active: true, translations: { es: { name: 'EC.EMS' },        en: { name: 'EC.EMS' } } },
    { code: 'ec_pq',         display_order: 5, is_active: true, translations: { es: { name: 'EC.PQ' },         en: { name: 'EC.PQ' } } },
    { code: 'ec_bills',      display_order: 6, is_active: true, translations: { es: { name: 'EC.Bills' },      en: { name: 'EC.Bills' } } },
    { code: 'ec_analytics',  display_order: 4, is_active: true, translations: { es: { name: 'EC.Analítica' },  en: { name: 'EC.Analytics' } } },
];

const deviceValidityPeriodsData = [
    { code: '12_months', months: 12,   display_order: 1, is_active: true, translations: { es: { name: '12 meses' }, en: { name: '12 months' } } },
    { code: '24_months', months: 24,   display_order: 2, is_active: true, translations: { es: { name: '24 meses' }, en: { name: '24 months' } } },
    { code: '36_months', months: 36,   display_order: 3, is_active: true, translations: { es: { name: '36 meses' }, en: { name: '36 months' } } },
    { code: 'enterprise', months: null, display_order: 4, is_active: true, translations: { es: { name: 'Enterprise' }, en: { name: 'Enterprise' } } },
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
                    { replacements: { deviceTypeId: row.id, lang, name: tr.name, description: tr.description ?? null }, type: QueryTypes.INSERT }
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
                    { replacements: { brandId: row.id, lang, name: tr.name, description: null }, type: QueryTypes.INSERT }
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
                    { replacements: { networkId: row.id, lang, name: tr.name, description: tr.description ?? null }, type: QueryTypes.INSERT }
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
            { replacements: { code: srv.code, server_type: srv.server_type, host: srv.host ?? null, port: srv.port ?? null, use_ssl: srv.use_ssl, display_order: srv.display_order, is_active: srv.is_active }, type: QueryTypes.SELECT }
        );
        if (row) {
            created++;
            for (const [lang, tr] of Object.entries(srv.translations)) {
                await sequelize.query(
                    `INSERT INTO device_server_translations (device_server_id, lang, name, description)
                     VALUES (:serverId, :lang, :name, :description)`,
                    { replacements: { serverId: row.id, lang, name: tr.name, description: tr.description ?? null }, type: QueryTypes.INSERT }
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
            `INSERT INTO device_licenses (code, display_order, is_active, created_at, updated_at)
             VALUES (:code, :display_order, :is_active, NOW(), NOW())
             ON CONFLICT (code) DO NOTHING
             RETURNING id, code`,
            { replacements: { code: lic.code, display_order: lic.display_order, is_active: lic.is_active }, type: QueryTypes.SELECT }
        );
        if (row) {
            created++;
            for (const [lang, tr] of Object.entries(lic.translations)) {
                await sequelize.query(
                    `INSERT INTO device_license_translations (device_license_id, lang, name, description)
                     VALUES (:licenseId, :lang, :name, :description)`,
                    { replacements: { licenseId: row.id, lang, name: tr.name, description: null }, type: QueryTypes.INSERT }
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
                    { replacements: { vpId: row.id, lang, name: tr.name, description: null }, type: QueryTypes.INSERT }
                );
            }
        }
    }
    return created;
};

/**
 * Seeder completo de metadatos de dispositivos.
 * Data exacta de la plataforma EC.DATA en producción.
 * Idempotente: ON CONFLICT (code) DO NOTHING en todas las tablas padre.
 * Traducciones solo se insertan cuando el padre es nuevo (RETURNING vacío = ya existía).
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

        const deviceTypes           = await seedDeviceTypes();
        const deviceBrands          = await seedDeviceBrands();
        const deviceModels          = await seedDeviceModels();
        const deviceNetworks        = await seedDeviceNetworks();
        const deviceServers         = await seedDeviceServers();
        const deviceLicenses        = await seedDeviceLicenses();
        const deviceValidityPeriods = await seedDeviceValidityPeriods();

        dbLogger.info('✅ Device-metadata seed completado');
        dbLogger.info(`   Types: ${deviceTypes} | Brands: ${deviceBrands} | Models: ${deviceModels} | Networks: ${deviceNetworks} | Servers: ${deviceServers} | Licenses: ${deviceLicenses} | Validity: ${deviceValidityPeriods}`);

        return { deviceTypes, deviceBrands, deviceModels, deviceNetworks, deviceServers, deviceLicenses, deviceValidityPeriods };
    } catch (error) {
        dbLogger.error(error, '❌ Error en device-metadata seeder');
        throw error;
    }
};
