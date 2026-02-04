#!/usr/bin/env node
/**
 * Seed: Datos iniciales para catálogos de dispositivos
 * 
 * Uso: node data/seed/seed-device-metadata.js
 * 
 * Incluye:
 * - Tipos de dispositivo
 * - Marcas
 * - Modelos (por marca)
 * - Servidores MQTT/FTP
 * - Tipos de red
 * - Licencias
 * - Períodos de vigencia
 */

import sequelize from '../../src/db/sql/sequelize.js';
import {
    DeviceType,
    DeviceTypeTranslation,
    DeviceBrand,
    DeviceBrandTranslation,
    DeviceModel,
    DeviceModelTranslation,
    DeviceServer,
    DeviceServerTranslation,
    DeviceNetwork,
    DeviceNetworkTranslation,
    DeviceLicense,
    DeviceLicenseTranslation,
    DeviceValidityPeriod,
    DeviceValidityPeriodTranslation
} from '../../src/modules/device-metadata/models/index.js';

const LANGS = ['es', 'en'];

const seedDeviceTypes = async () => {
    const types = [
        { code: 'node', icon: 'cpu', order: 1, translations: { es: 'Nodo', en: 'Node' } },
        { code: 'ucm', icon: 'server', order: 2, translations: { es: 'UCM', en: 'UCM' } },
        { code: 'gateway', icon: 'router', order: 3, translations: { es: 'Gateway', en: 'Gateway' } },
        { code: 'lora_antenna', icon: 'radio', order: 4, translations: { es: 'Antena Lora', en: 'Lora Antenna' } },
        { code: 'meter', icon: 'gauge', order: 5, translations: { es: 'Medidor', en: 'Meter' } }
    ];

    for (const t of types) {
        const [type] = await DeviceType.findOrCreate({
            where: { code: t.code },
            defaults: { icon: t.icon, display_order: t.order, is_active: true }
        });

        for (const lang of LANGS) {
            await DeviceTypeTranslation.findOrCreate({
                where: { device_type_id: type.id, lang },
                defaults: { name: t.translations[lang] }
            });
        }
    }
    console.log('✅ Device Types seeded');
};

const seedDeviceBrands = async () => {
    const brands = [
        { id: 1, code: 'energycloud', name: 'EnergyCloud' },
        { id: 2, code: 'socomec', name: 'Socomec' },
        { id: 3, code: 'schneider', name: 'Schneider Electric' },
        { id: 4, code: 'accuenergy', name: 'AccuEnergy' },
        { id: 5, code: 'meazom', name: 'Meazom' },
        { id: 6, code: 'circuitor', name: 'Circuitor' },
        { id: 7, code: 'shark', name: 'Shark' },
        { id: 8, code: 'best', name: 'BEST' },
        { id: 9, code: 'shelly', name: 'Shelly' },
        { id: 10, code: 'powermeter', name: 'Powermeter' },
        { id: 11, code: 'tiny_controls', name: 'Tiny Controls' },
        { id: 12, code: 'hidroconta', name: 'HidroConta' },
        { id: 13, code: 'network_thermostat', name: 'Network Thermostat' },
        { id: 14, code: 'johnson_controls', name: 'Johnson Controls' },
        { id: 15, code: 'abb', name: 'ABB' },
        { id: 16, code: 'trane', name: 'Trane' },
        { id: 17, code: 'emh', name: 'EMH' },
        { id: 18, code: 'solution_device', name: 'Solution Device' },
        { id: 19, code: 'acrel', name: 'Acrel' },
        { id: 20, code: 'tuya', name: 'Tuya' },
        { id: 21, code: 'milesight', name: 'Milesight' }
    ];

    for (let i = 0; i < brands.length; i++) {
        const b = brands[i];
        const [brand] = await DeviceBrand.findOrCreate({
            where: { code: b.code },
            defaults: { display_order: i + 1, is_active: true }
        });

        for (const lang of LANGS) {
            await DeviceBrandTranslation.findOrCreate({
                where: { device_brand_id: brand.id, lang },
                defaults: { name: b.name }
            });
        }
    }
    console.log('✅ Device Brands seeded');
};

const seedDeviceModels = async () => {
    const models = [
        { name: 'ECS', brandCode: 'energycloud' },
        { name: 'EC.node', brandCode: 'energycloud' },
        { name: 'EC.Termostato', brandCode: 'energycloud' },
        { name: 'Dirris A20', brandCode: 'socomec' },
        { name: 'Dirris A10', brandCode: 'socomec' },
        { name: 'PM5560', brandCode: 'schneider' },
        { name: 'PM5510', brandCode: 'schneider' },
        { name: 'PM5330', brandCode: 'schneider' },
        { name: 'PM2000', brandCode: 'schneider' },
        { name: 'PM810', brandCode: 'schneider' },
        { name: 'PM710', brandCode: 'schneider' },
        { name: 'PM1200', brandCode: 'schneider' },
        { name: 'PM600', brandCode: 'schneider' },
        { name: 'IEM3255', brandCode: 'schneider' },
        { name: 'Ecostruxware', brandCode: 'schneider' },
        { name: 'Acuvim II-D', brandCode: 'accuenergy' },
        { name: 'Acuvim II-W', brandCode: 'accuenergy' },
        { name: 'Acurev 2100', brandCode: 'accuenergy' },
        { name: 'Acurev 1310', brandCode: 'accuenergy' },
        { name: 'Acurev 1302', brandCode: 'accuenergy' },
        { name: 'Acurev 1203', brandCode: 'accuenergy' },
        { name: 'DinRail Advance V4', brandCode: 'meazom' },
        { name: 'DinRail Advance V3', brandCode: 'meazom' },
        { name: 'CVMC10', brandCode: 'circuitor' },
        { name: 'NRG96', brandCode: 'circuitor' },
        { name: 'CVM1500', brandCode: 'circuitor' },
        { name: '100', brandCode: 'shark' },
        { name: 'Eniscope', brandCode: 'best' },
        { name: 'Uni', brandCode: 'shelly' },
        { name: 'Pro 4PM', brandCode: 'shelly' },
        { name: 'Pro 2PM', brandCode: 'shelly' },
        { name: 'Pro 1PM', brandCode: 'shelly' },
        { name: 'Home', brandCode: 'powermeter' },
        { name: 'Smart', brandCode: 'powermeter' },
        { name: 'Smart LCD', brandCode: 'powermeter' },
        { name: 'LK3', brandCode: 'tiny_controls' },
        { name: 'Iris', brandCode: 'hidroconta' },
        { name: 'X7', brandCode: 'network_thermostat' },
        { name: 'Metasys', brandCode: 'johnson_controls' },
        { name: 'VFD', brandCode: 'abb' },
        { name: 'Tracer', brandCode: 'trane' },
        { name: 'LZQJ-XC', brandCode: 'emh' },
        { name: 'V4', brandCode: 'solution_device' },
        { name: 'ADW210', brandCode: 'acrel' },
        { name: 'Smart IR with T&H Sensor', brandCode: 'tuya' },
        { name: 'Smart plug', brandCode: 'tuya' },
        { name: 'T&H Sensor', brandCode: 'tuya' },
        { name: 'WT201', brandCode: 'milesight' }
    ];

    const brandCache = {};
    const allBrands = await DeviceBrand.findAll();
    for (const b of allBrands) {
        brandCache[b.code] = b.id;
    }

    for (let i = 0; i < models.length; i++) {
        const m = models[i];
        const brandId = brandCache[m.brandCode];
        if (!brandId) {
            console.warn(`⚠️ Brand not found: ${m.brandCode}`);
            continue;
        }

        const [model] = await DeviceModel.findOrCreate({
            where: { device_brand_id: brandId, code: m.name },
            defaults: { display_order: i + 1, is_active: true }
        });

        for (const lang of LANGS) {
            await DeviceModelTranslation.findOrCreate({
                where: { device_model_id: model.id, lang },
                defaults: { name: m.name }
            });
        }
    }
    console.log('✅ Device Models seeded');
};

const seedDeviceServers = async () => {
    const servers = [
        { code: 'mqttssl.energycloud.tv', type: 'mqttssl', ssl: true },
        { code: 'mqtt.energycloud.tv', type: 'mqtt', ssl: false },
        { code: 'ECmqtt.ecdata.ai', type: 'mqtt', ssl: false },
        { code: 'Ecmqtt.ecdata.ai', type: 'mqtt', ssl: false },
        { code: 'BrokerLB OLD', type: 'mqtt', ssl: false },
        { code: 'ECmqttCluster.energycloud.tv', type: 'mqtt', ssl: false },
        { code: 'FTP', type: 'ftp', ssl: false },
        { code: 'ECmqttCluster.ecdata.ai', type: 'mqtt', ssl: false }
    ];

    for (let i = 0; i < servers.length; i++) {
        const s = servers[i];
        const [server] = await DeviceServer.findOrCreate({
            where: { code: s.code },
            defaults: {
                server_type: s.type,
                host: s.code.includes('.') ? s.code : null,
                use_ssl: s.ssl,
                display_order: i + 1,
                is_active: true
            }
        });

        for (const lang of LANGS) {
            await DeviceServerTranslation.findOrCreate({
                where: { device_server_id: server.id, lang },
                defaults: { name: s.code }
            });
        }
    }
    console.log('✅ Device Servers seeded');
};

const seedDeviceNetworks = async () => {
    const networks = [
        { code: 'modem_4g', icon: 'signal', translations: { es: 'Modem 4G', en: '4G Modem' } },
        { code: 'ethernet', icon: 'ethernet-port', translations: { es: 'Ethernet', en: 'Ethernet' } },
        { code: 'wireless', icon: 'wifi', translations: { es: 'Wireless', en: 'Wireless' } },
        { code: 'lora', icon: 'radio-tower', translations: { es: 'Lora', en: 'Lora' } }
    ];

    for (let i = 0; i < networks.length; i++) {
        const n = networks[i];
        const [network] = await DeviceNetwork.findOrCreate({
            where: { code: n.code },
            defaults: { icon: n.icon, display_order: i + 1, is_active: true }
        });

        for (const lang of LANGS) {
            await DeviceNetworkTranslation.findOrCreate({
                where: { device_network_id: network.id, lang },
                defaults: { name: n.translations[lang] }
            });
        }
    }
    console.log('✅ Device Networks seeded');
};

const seedDeviceLicenses = async () => {
    const licenses = [
        { code: 'ec_iot', color: '#3B82F6', translations: { es: 'EC.IoT', en: 'EC.IoT' } },
        { code: 'ec_automation', color: '#10B981', translations: { es: 'EC.Automation', en: 'EC.Automation' } },
        { code: 'ec_billing', color: '#F59E0B', translations: { es: 'EC.Billing', en: 'EC.Billing' } },
        { code: 'ec_ems', color: '#8B5CF6', translations: { es: 'EC.EMS', en: 'EC.EMS' } },
        { code: 'ec_pq', color: '#EF4444', translations: { es: 'EC.PQ', en: 'EC.PQ' } },
        { code: 'ec_bills', color: '#06B6D4', translations: { es: 'EC.Bills', en: 'EC.Bills' } }
    ];

    for (let i = 0; i < licenses.length; i++) {
        const l = licenses[i];
        const [license] = await DeviceLicense.findOrCreate({
            where: { code: l.code },
            defaults: { color: l.color, display_order: i + 1, is_active: true }
        });

        for (const lang of LANGS) {
            await DeviceLicenseTranslation.findOrCreate({
                where: { device_license_id: license.id, lang },
                defaults: { name: l.translations[lang] }
            });
        }
    }
    console.log('✅ Device Licenses seeded');
};

const seedDeviceValidityPeriods = async () => {
    const periods = [
        { code: '12_months', months: 12, translations: { es: '12 meses', en: '12 months' } },
        { code: '24_months', months: 24, translations: { es: '24 meses', en: '24 months' } },
        { code: '36_months', months: 36, translations: { es: '36 meses', en: '36 months' } },
        { code: 'enterprise', months: null, translations: { es: 'Enterprise', en: 'Enterprise' } }
    ];

    for (let i = 0; i < periods.length; i++) {
        const p = periods[i];
        const [period] = await DeviceValidityPeriod.findOrCreate({
            where: { code: p.code },
            defaults: { months: p.months, display_order: i + 1, is_active: true }
        });

        for (const lang of LANGS) {
            await DeviceValidityPeriodTranslation.findOrCreate({
                where: { device_validity_period_id: period.id, lang },
                defaults: { name: p.translations[lang] }
            });
        }
    }
    console.log('✅ Device Validity Periods seeded');
};

const main = async () => {
    try {
        console.log('🌱 Iniciando seed de Device Metadata...\n');

        await sequelize.authenticate();
        console.log('✅ Conexión a base de datos OK\n');

        await seedDeviceTypes();
        await seedDeviceBrands();
        await seedDeviceModels();
        await seedDeviceServers();
        await seedDeviceNetworks();
        await seedDeviceLicenses();
        await seedDeviceValidityPeriods();

        console.log('\n🎉 Seed completado exitosamente!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en seed:', error);
        process.exit(1);
    }
};

main();
