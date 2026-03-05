// Seeder de Devices y Channels con datos realistas
import Organization from '../../modules/organizations/models/Organization.js';
import Site from '../../modules/sites/models/Site.js';
import Device from '../../modules/devices/models/Device.js';
import Channel from '../../modules/channels/models/Channel.js';
import User from '../../modules/auth/models/User.js';
import { generateUuidV7, generatePublicCode, generateHumanId } from '../../utils/identifiers.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import { dbLogger } from '../../utils/logger.js';

const deviceStatuses = ['active', 'inactive', 'maintenance'];
const getRandomStatus = (weights = [0.8, 0.1, 0.1]) => {
    const rand = Math.random();
    if (rand < weights[0]) return deviceStatuses[0];
    if (rand < weights[0] + weights[1]) return deviceStatuses[1];
    return deviceStatuses[2];
};

const firmwareVersions = ['v2.1.0', 'v3.0.1', 'v1.9.2', 'v2.5.3', 'v3.2.0', 'v1.8.5'];
const deviceNames = [
    'Medidor Principal', 'Medidor Secundario', 'Gateway IoT', 'Sensor Temperatura',
    'Controlador HVAC', 'Analizador Red', 'Medidor Energía', 'Edge Device', 'Sensor Presión'
];

const generateSerialNumber = (index) => {
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    return `SN-DEV-${random}-${index}`;
};

const generateIpAddress = () => {
    const subnet = Math.random() < 0.5 ? '192.168.1' : '10.0.0';
    const host = Math.floor(Math.random() * 254) + 1;
    return `${subnet}.${host}`;
};

const generateMacAddress = () => {
    const parts = [];
    for (let i = 0; i < 6; i++) {
        parts.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase());
    }
    return parts.join(':');
};

const getRecentDate = (daysAgo = 7) => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    return date;
};

/**
 * Crear devices para una organización
 */
const createDevicesForOrganization = async (organization, sites, adminUser) => {
    const devices = [];
    const deviceCount = Math.floor(Math.random() * 6) + 5;

    dbLogger.info(`\n📱 Creando ${deviceCount} devices para: ${organization.name} (${organization.publicCode})`);

    for (let i = 0; i < deviceCount; i++) {
        try {
            const deviceId = generateUuidV7();
            const deviceHumanId = await generateHumanId(Device, null, null);
            const devicePublicCode = generatePublicCode('DEV');

            const deviceName = deviceNames[i % deviceNames.length];
            const status = getRandomStatus();

            const siteId = (Math.random() < 0.7 && sites.length > 0)
                ? sites[Math.floor(Math.random() * sites.length)].id
                : null;

            const device = await Device.create({
                id: deviceId,
                humanId: deviceHumanId,
                publicCode: devicePublicCode,
                organizationId: organization.id,
                siteId,
                name: `${deviceName} ${i + 1}`,
                description: `Equipo de monitoreo para ${organization.name}`,
                status,
                firmwareVersion: firmwareVersions[Math.floor(Math.random() * firmwareVersions.length)],
                serialNumber: generateSerialNumber(i),
                ipAddress: generateIpAddress(),
                macAddress: generateMacAddress(),
                physicalLocation: `Rack ${Math.floor(Math.random() * 5) + 1}, Slot ${Math.floor(Math.random() * 10) + 1}`,
                lastSeenAt: getRecentDate(7),
                metadata: {
                    manufacturer: 'IoT Systems Inc.',
                    created_by_seeder: true
                },
                isActive: status === 'active'
            });

            devices.push(device);

            const siteInfo = siteId ? ` [Site: ${sites.find(s => s.id === siteId)?.name}]` : '';
            dbLogger.info(`  ✅ Device: ${device.name} (${devicePublicCode}) - ${status}${siteInfo}`);

            await logAuditAction({
                entityType: 'device',
                entityId: deviceId,
                action: 'create',
                performedBy: adminUser.id,
                changes: { new: { name: device.name, status, organizationId: organization.id } },
                metadata: { organizationId: organization.id, seeder: true, source: 'seed-devices-channels' },
                ipAddress: '127.0.0.1',
                userAgent: 'Seeder Script'
            });

        } catch (error) {
            dbLogger.error(`  ❌ Error creando device ${i + 1}: ${error.message}`);
        }
    }

    return devices;
};

/**
 * Crear channels para un device
 */
const createChannelsForDevice = async (device, adminUser) => {
    const channels = [];
    const channelCount = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < channelCount; i++) {
        try {
            const channelId = generateUuidV7();
            const channelHumanId = await generateHumanId(Channel, null, null);
            const channelPublicCode = generatePublicCode('CHN');

            const statuses = ['active', 'inactive', 'error', 'disabled'];
            const statusWeights = [0.85, 0.1, 0.03, 0.02];
            const rand = Math.random();
            let status = statuses[0];
            let cumulative = 0;
            for (let j = 0; j < statusWeights.length; j++) {
                cumulative += statusWeights[j];
                if (rand < cumulative) { status = statuses[j]; break; }
            }

            const channel = await Channel.create({
                id: channelId,
                humanId: channelHumanId,
                publicCode: channelPublicCode,
                deviceId: device.id,
                organizationId: device.organizationId,
                name: `Canal ${i + 1} - ${device.name}`,
                description: `Canal de medición ${i + 1} del equipo ${device.name}`,
                ch: i + 1,
                status,
                lastSyncAt: getRecentDate(3),
                metadata: { created_by_seeder: true, channel_index: i },
                isActive: status === 'active'
            });

            channels.push(channel);

            dbLogger.info(`    ✅ Channel: ${channel.name} (${channelPublicCode}) - ${status}`);

            await logAuditAction({
                entityType: 'channel',
                entityId: channelId,
                action: 'create',
                performedBy: adminUser.id,
                changes: { new: { name: channel.name, status, deviceId: device.id } },
                metadata: { organizationId: device.organizationId, deviceId: device.id, seeder: true, source: 'seed-devices-channels' },
                ipAddress: '127.0.0.1',
                userAgent: 'Seeder Script'
            });

        } catch (error) {
            dbLogger.error(`    ❌ Error creando channel ${i + 1}: ${error.message}`);
        }
    }

    return channels;
};

/**
 * Función principal del seeder
 */
export const seedDevicesAndChannels = async () => {
    try {
        dbLogger.info('🔄 Iniciando seeder de Devices y Channels...\n');

        const existingDevicesCount = await Device.count();

        if (existingDevicesCount > 0) {
            dbLogger.info(`ℹ️  Ya existen ${existingDevicesCount} devices. Saltando seeder.`);
            return {
                devicesCreated: 0,
                channelsCreated: 0,
                devicesSkipped: existingDevicesCount
            };
        }

        const adminUser = await User.findOne({ where: { email: 'admin@ecdata.com' } });

        if (!adminUser) {
            throw new Error('Usuario admin no encontrado. Ejecuta primero el seeder de usuarios.');
        }

        dbLogger.info(`👤 Usuario admin encontrado: ${adminUser.email}\n`);

        const organizations = await Organization.findAll({ where: { isActive: true } });

        if (organizations.length === 0) {
            throw new Error('No se encontraron organizaciones. Ejecuta primero el seeder de organizaciones.');
        }

        dbLogger.info(`📊 Encontradas ${organizations.length} organizaciones activas`);

        const allSites = await Site.findAll({ where: { isActive: true } });

        dbLogger.info(`📍 Encontrados ${allSites.length} sites activos\n`);

        let totalDevices = 0;
        let totalChannels = 0;

        for (const organization of organizations) {
            const orgSites = allSites.filter(site => site.organizationId === organization.id);

            dbLogger.info(`\n${'='.repeat(80)}`);
            dbLogger.info(`Organización: ${organization.name} (${organization.publicCode})`);
            dbLogger.info(`Sites disponibles: ${orgSites.length}`);
            dbLogger.info('='.repeat(80));

            const devices = await createDevicesForOrganization(organization, orgSites, adminUser);
            totalDevices += devices.length;

            dbLogger.info(`\n📡 Creando channels para los devices de ${organization.name}...`);
            for (const device of devices) {
                dbLogger.info(`\n  Device: ${device.name} (${device.publicCode})`);
                const channels = await createChannelsForDevice(device, adminUser);
                totalChannels += channels.length;
            }
        }

        const avgChannelsPerDevice = totalDevices > 0 ? (totalChannels / totalDevices).toFixed(2) : 0;

        dbLogger.info('\n' + '='.repeat(80));
        dbLogger.info('📊 ESTADÍSTICAS FINALES');
        dbLogger.info('='.repeat(80));
        dbLogger.info(`✅ Total de devices creados: ${totalDevices}`);
        dbLogger.info(`✅ Total de channels creados: ${totalChannels}`);
        dbLogger.info(`📈 Promedio de channels por device: ${avgChannelsPerDevice}`);
        dbLogger.info('='.repeat(80));
        dbLogger.info('\n✅ Seeder de Devices y Channels completado exitosamente\n');

        return {
            devicesCreated: totalDevices,
            channelsCreated: totalChannels,
            devicesSkipped: 0
        };

    } catch (error) {
        dbLogger.error(error, '❌ Error en seeder de Devices y Channels');
        throw error;
    }
};

if (import.meta.url === `file://${process.argv[1]}`) {
    seedDevicesAndChannels()
        .then(() => {
            dbLogger.info('✅ Proceso completado');
            process.exit(0);
        })
        .catch((error) => {
            dbLogger.error(error, '❌ Error en el proceso');
            process.exit(1);
        });
}

export default seedDevicesAndChannels;
