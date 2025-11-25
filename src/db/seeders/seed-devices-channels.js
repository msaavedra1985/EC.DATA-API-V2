// Seeder de Devices y Channels con datos realistas
import sequelize from '../sql/sequelize.js';
import Organization from '../../modules/organizations/models/Organization.js';
import Site from '../../modules/sites/models/Site.js';
import Device from '../../modules/devices/models/Device.js';
import Channel from '../../modules/channels/models/Channel.js';
import User from '../../modules/auth/models/User.js';
import { generateUuidV7, generatePublicCode, generateHumanId } from '../../utils/identifiers.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import { dbLogger } from '../../utils/logger.js';

/**
 * Generadores de datos aleatorios para devices
 */
const deviceGenerators = {
    // Tipos de dispositivos disponibles
    types: ['sensor', 'gateway', 'controller', 'edge'],
    
    // Status con distribución: active (80%), inactive (10%), maintenance (10%)
    getRandomStatus: () => {
        const rand = Math.random();
        if (rand < 0.8) return 'active';
        if (rand < 0.9) return 'inactive';
        return 'maintenance';
    },
    
    // Versiones de firmware realistas
    firmwareVersions: ['v2.1.0', 'v3.0.1', 'v1.9.2', 'v2.5.3', 'v3.2.0', 'v1.8.5'],
    
    // Generar serial number único
    generateSerialNumber: (deviceType, index) => {
        const typePrefix = deviceType.toUpperCase().substring(0, 3);
        const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
        return `SN-${typePrefix}-${random}-${index}`;
    },
    
    // Generar IP address realista
    generateIpAddress: () => {
        const subnet = Math.random() < 0.5 ? '192.168.1' : '10.0.0';
        const host = Math.floor(Math.random() * 254) + 1;
        return `${subnet}.${host}`;
    },
    
    // Generar MAC address válido
    generateMacAddress: () => {
        const parts = [];
        for (let i = 0; i < 6; i++) {
            const byte = Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
            parts.push(byte);
        }
        return parts.join(':');
    },
    
    // Location hints realistas
    locationHints: [
        'Rack 1, Slot 3',
        'Rack 2, Slot 5',
        'Building A, Floor 2',
        'Building B, Floor 1',
        'Server Room A',
        'Data Center - Zone 1',
        'Warehouse Section C',
        'Production Line 1',
        'Office Block D',
        'Control Room'
    ],
    
    // Generar fecha reciente (últimos 7 días)
    getRecentDate: (daysAgo = 7) => {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
        date.setHours(Math.floor(Math.random() * 24));
        date.setMinutes(Math.floor(Math.random() * 60));
        return date;
    },
    
    // Nombres de devices según tipo
    getDeviceName: (type, index) => {
        const names = {
            sensor: ['Temperature Sensor', 'Humidity Sensor', 'Pressure Sensor', 'Motion Sensor', 'Light Sensor'],
            gateway: ['Main Gateway', 'Edge Gateway', 'IoT Gateway', 'Network Gateway', 'Protocol Gateway'],
            controller: ['PLC Controller', 'Process Controller', 'HVAC Controller', 'Access Controller', 'Logic Controller'],
            edge: ['Edge Device', 'Edge Processor', 'Edge Analytics', 'Edge Router', 'Edge Computer']
        };
        const baseName = names[type][index % names[type].length];
        return `${baseName} ${index + 1}`;
    }
};

/**
 * Generadores de datos aleatorios para channels
 */
const channelGenerators = {
    // Configuraciones por tipo de canal
    channelConfigs: {
        mqtt: {
            protocol: 'mqtt',
            getEndpoint: (deviceName) => `mqtt://broker.example.com:1883/devices/${deviceName.toLowerCase().replace(/\s+/g, '-')}`,
            getConfig: () => ({
                topic: `sensors/${['temperature', 'humidity', 'pressure', 'motion'][Math.floor(Math.random() * 4)]}`,
                qos: Math.random() < 0.5 ? 1 : 2,
                retain: Math.random() < 0.3
            }),
            getName: (index) => `MQTT Data Stream ${index + 1}`
        },
        http: {
            protocol: 'https',
            getEndpoint: (deviceId) => `https://api.example.com/v1/devices/${deviceId}/data`,
            getConfig: () => ({
                method: Math.random() < 0.7 ? 'POST' : 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 30000
            }),
            getName: (index) => `HTTP API ${index + 1}`
        },
        websocket: {
            protocol: 'wss',
            getEndpoint: (deviceId) => `wss://ws.example.com/stream/${deviceId}`,
            getConfig: () => ({
                reconnect: true,
                ping_interval: 30000,
                max_reconnect_attempts: 5,
                reconnect_delay: 5000
            }),
            getName: (index) => `WebSocket Stream ${index + 1}`
        },
        coap: {
            protocol: 'coaps',
            getEndpoint: () => `coap://coap.example.com:5683/sensors/${Math.floor(Math.random() * 1000)}`,
            getConfig: () => ({
                confirmable: Math.random() < 0.7,
                observe: Math.random() < 0.5,
                max_retransmit: 4
            }),
            getName: (index) => `CoAP Endpoint ${index + 1}`
        }
    },
    
    // Direction con distribución: inbound (30%), outbound (30%), bidirectional (40%)
    getRandomDirection: () => {
        const rand = Math.random();
        if (rand < 0.3) return 'inbound';
        if (rand < 0.6) return 'outbound';
        return 'bidirectional';
    },
    
    // Status con distribución: active (85%), inactive (10%), error (5%)
    getRandomStatus: () => {
        const rand = Math.random();
        if (rand < 0.85) return 'active';
        if (rand < 0.95) return 'inactive';
        return 'error';
    },
    
    // Priority con distribución normal alrededor de 5
    getRandomPriority: () => {
        // Distribución normal simple alrededor de 5
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const priority = Math.round(5 + z0 * 2);
        return Math.max(1, Math.min(10, priority));
    },
    
    // Generar fecha reciente (últimos 3 días)
    getRecentSyncDate: () => {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 3));
        date.setHours(Math.floor(Math.random() * 24));
        date.setMinutes(Math.floor(Math.random() * 60));
        return date;
    }
};

/**
 * Crear devices para una organización
 * 
 * @param {Object} organization - Organización
 * @param {Array} sites - Sites de la organización
 * @param {Object} adminUser - Usuario admin para audit logs
 * @returns {Promise<Array>} Devices creados
 */
const createDevicesForOrganization = async (organization, sites, adminUser) => {
    const devices = [];
    const deviceCount = Math.floor(Math.random() * 6) + 5; // 5-10 devices
    
    dbLogger.info(`\n📱 Creando ${deviceCount} devices para: ${organization.name} (${organization.public_code})`);
    
    for (let i = 0; i < deviceCount; i++) {
        try {
            // Seleccionar tipo de device aleatorio
            const deviceType = deviceGenerators.types[Math.floor(Math.random() * deviceGenerators.types.length)];
            
            // Generar datos del device
            const deviceId = generateUuidV7();
            const deviceHumanId = await generateHumanId(Device, null, null);
            const devicePublicCode = generatePublicCode('DEV', deviceId);
            
            const deviceName = deviceGenerators.getDeviceName(deviceType, i);
            const status = deviceGenerators.getRandomStatus();
            const firmwareVersion = deviceGenerators.firmwareVersions[Math.floor(Math.random() * deviceGenerators.firmwareVersions.length)];
            const serialNumber = deviceGenerators.generateSerialNumber(deviceType, i);
            const ipAddress = deviceGenerators.generateIpAddress();
            const macAddress = deviceGenerators.generateMacAddress();
            const locationHint = deviceGenerators.locationHints[Math.floor(Math.random() * deviceGenerators.locationHints.length)];
            const lastSeenAt = deviceGenerators.getRecentDate(7);
            
            // Asignar site aleatorio (70% con site, 30% sin site)
            const siteId = (Math.random() < 0.7 && sites.length > 0) 
                ? sites[Math.floor(Math.random() * sites.length)].id 
                : null;
            
            // Crear device
            const device = await Device.create({
                id: deviceId,
                human_id: deviceHumanId,
                public_code: devicePublicCode,
                organization_id: organization.id,
                site_id: siteId,
                name: deviceName,
                description: `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} device for ${organization.name}`,
                device_type: deviceType,
                status,
                firmware_version: firmwareVersion,
                serial_number: serialNumber,
                ip_address: ipAddress,
                mac_address: macAddress,
                location_hint: locationHint,
                last_seen_at: lastSeenAt,
                metadata: {
                    manufacturer: 'IoT Systems Inc.',
                    model: `${deviceType.toUpperCase()}-${Math.floor(Math.random() * 9) + 1}00`,
                    installation_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                },
                is_active: status === 'active'
            });
            
            devices.push(device);
            
            const siteInfo = siteId ? ` [Site: ${sites.find(s => s.id === siteId)?.name}]` : '';
            dbLogger.info(`  ✅ Device: ${deviceName} (${devicePublicCode}) - ${deviceType} - ${status}${siteInfo}`);
            
            // Crear audit log
            await logAuditAction({
                entityType: 'device',
                entityId: deviceId,
                action: 'create',
                performedBy: adminUser.id,
                changes: {
                    new: {
                        name: deviceName,
                        device_type: deviceType,
                        status,
                        organization_id: organization.id
                    }
                },
                metadata: {
                    organization_id: organization.id,
                    organization_name: organization.name,
                    seeder: true,
                    source: 'seed-devices-channels'
                },
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
 * 
 * @param {Object} device - Device
 * @param {Object} adminUser - Usuario admin para audit logs
 * @returns {Promise<Array>} Channels creados
 */
const createChannelsForDevice = async (device, adminUser) => {
    const channels = [];
    const channelCount = Math.floor(Math.random() * 4) + 2; // 2-5 channels
    
    // Seleccionar tipos de canales aleatorios (sin repetir)
    const channelTypes = Object.keys(channelGenerators.channelConfigs);
    const selectedTypes = [];
    for (let i = 0; i < Math.min(channelCount, channelTypes.length); i++) {
        let type;
        do {
            type = channelTypes[Math.floor(Math.random() * channelTypes.length)];
        } while (selectedTypes.includes(type));
        selectedTypes.push(type);
    }
    
    for (let i = 0; i < selectedTypes.length; i++) {
        try {
            const channelType = selectedTypes[i];
            const config = channelGenerators.channelConfigs[channelType];
            
            // Generar datos del channel
            const channelId = generateUuidV7();
            const channelHumanId = await generateHumanId(Channel, null, null);
            const channelPublicCode = generatePublicCode('CHN', channelId);
            
            const channelName = config.getName(i);
            const direction = channelGenerators.getRandomDirection();
            const status = channelGenerators.getRandomStatus();
            const endpointUrl = config.getEndpoint(device.public_code);
            const channelConfig = config.getConfig();
            const priority = channelGenerators.getRandomPriority();
            const lastSyncAt = channelGenerators.getRecentSyncDate();
            
            // Crear channel
            const channel = await Channel.create({
                id: channelId,
                human_id: channelHumanId,
                public_code: channelPublicCode,
                device_id: device.id,
                organization_id: device.organization_id,
                name: channelName,
                description: `${channelType.toUpperCase()} communication channel for ${device.name}`,
                channel_type: channelType,
                protocol: config.protocol,
                direction,
                status,
                endpoint_url: endpointUrl,
                config: channelConfig,
                credentials_ref: Math.random() < 0.5 ? `cred_${channelType}_${Math.floor(Math.random() * 1000)}` : null,
                priority,
                last_sync_at: lastSyncAt,
                metadata: {
                    created_by_seeder: true,
                    channel_version: '1.0'
                },
                is_active: status === 'active'
            });
            
            channels.push(channel);
            
            dbLogger.info(`    ✅ Channel: ${channelName} (${channelPublicCode}) - ${channelType}/${config.protocol} - ${direction} - ${status}`);
            
            // Crear audit log
            await logAuditAction({
                entityType: 'channel',
                entityId: channelId,
                action: 'create',
                performedBy: adminUser.id,
                changes: {
                    new: {
                        name: channelName,
                        channel_type: channelType,
                        protocol: config.protocol,
                        status,
                        device_id: device.id
                    }
                },
                metadata: {
                    organization_id: device.organization_id,
                    device_id: device.id,
                    device_name: device.name,
                    seeder: true,
                    source: 'seed-devices-channels'
                },
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
        
        // 1. Verificar si ya existen devices
        const existingDevicesCount = await Device.count();
        
        if (existingDevicesCount > 0) {
            dbLogger.info(`ℹ️  Ya existen ${existingDevicesCount} devices. Saltando seeder.`);
            return {
                devicesCreated: 0,
                channelsCreated: 0,
                devicesSkipped: existingDevicesCount
            };
        }
        
        // 2. Obtener usuario admin del sistema
        const adminUser = await User.findOne({
            where: { email: 'admin@ecdata.com' }
        });
        
        if (!adminUser) {
            throw new Error('Usuario admin no encontrado. Ejecuta primero el seeder de usuarios.');
        }
        
        dbLogger.info(`👤 Usuario admin encontrado: ${adminUser.email}\n`);
        
        // 3. Obtener todas las organizaciones
        const organizations = await Organization.findAll({
            where: { is_active: true }
        });
        
        if (organizations.length === 0) {
            throw new Error('No se encontraron organizaciones. Ejecuta primero el seeder de organizaciones.');
        }
        
        dbLogger.info(`📊 Encontradas ${organizations.length} organizaciones activas`);
        
        // 4. Obtener todos los sites
        const allSites = await Site.findAll({
            where: { is_active: true }
        });
        
        dbLogger.info(`📍 Encontrados ${allSites.length} sites activos\n`);
        
        // 5. Crear devices y channels por organización
        let totalDevices = 0;
        let totalChannels = 0;
        
        for (const organization of organizations) {
            // Obtener sites de esta organización
            const orgSites = allSites.filter(site => site.organization_id === organization.id);
            
            dbLogger.info(`\n${'='.repeat(80)}`);
            dbLogger.info(`Organización: ${organization.name} (${organization.public_code})`);
            dbLogger.info(`Sites disponibles: ${orgSites.length}`);
            dbLogger.info('='.repeat(80));
            
            // Crear devices para esta organización
            const devices = await createDevicesForOrganization(organization, orgSites, adminUser);
            totalDevices += devices.length;
            
            // Crear channels para cada device
            dbLogger.info(`\n📡 Creando channels para los devices de ${organization.name}...`);
            for (const device of devices) {
                dbLogger.info(`\n  Device: ${device.name} (${device.public_code})`);
                const channels = await createChannelsForDevice(device, adminUser);
                totalChannels += channels.length;
            }
        }
        
        // 6. Mostrar estadísticas finales
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

// Ejecutar seeder si se ejecuta directamente
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
