// modules/devices/helpers/serializers.js
// Serializadores para convertir modelos internos a DTOs públicos

/**
 * Convertir modelo Device a DTO público
 * Expone publicCode como 'id', oculta UUID interno
 * 
 * POLÍTICA DE SEGURIDAD:
 * - Nunca exponer el UUID interno en APIs públicas
 * - Siempre usar publicCode como 'id' en respuestas
 * - UUIDs solo para operaciones internas de base de datos
 * - IDs de catálogo (integers) se exponen directamente (no son sensibles)
 * 
 * @param {Device} device - Modelo Sequelize Device
 * @returns {Object} - DTO público para respuestas API
 */
export const toPublicDeviceDto = (device) => {
    if (!device) return null;
    
    const dto = {
        id: device.publicCode,
        uuid: device.uuid || null,
        name: device.name,
        description: device.description,
        status: device.status,
        firmwareVersion: device.firmwareVersion,
        serialNumber: device.serialNumber,
        ipAddress: device.ipAddress,
        macAddress: device.macAddress,
        topic: device.topic,
        locationName: device.locationName,
        physicalLocation: device.physicalLocation,
        electricalLocation: device.electricalLocation,
        latitude: device.latitude ? parseFloat(device.latitude) : null,
        longitude: device.longitude ? parseFloat(device.longitude) : null,
        city: device.city,
        timezone: device.timezone,
        installationDate: device.installationDate,
        warrantyMonths: device.warrantyMonths,
        expirationDate: device.expirationDate,
        lastSeenAt: device.lastSeenAt,
        metadata: device.metadata || {},
        isActive: device.isActive,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt
    };

    // --- Catálogos (exponer id + datos traducidos) ---
    if (device.deviceType) {
        dto.deviceType = {
            id: device.deviceType.id,
            code: device.deviceType.code,
            icon: device.deviceType.icon
        };
    } else {
        dto.deviceTypeId = device.deviceTypeId;
    }

    if (device.brand) {
        dto.brand = {
            id: device.brand.id,
            code: device.brand.code
        };
    } else {
        dto.brandId = device.brandId;
    }

    if (device.model) {
        dto.model = {
            id: device.model.id,
            code: device.model.code
        };
    } else {
        dto.modelId = device.modelId;
    }

    if (device.server) {
        dto.server = {
            id: device.server.id,
            code: device.server.code
        };
    } else {
        dto.serverId = device.serverId;
    }

    if (device.network) {
        dto.network = {
            id: device.network.id,
            code: device.network.code
        };
    } else {
        dto.networkId = device.networkId;
    }

    if (device.license) {
        dto.license = {
            id: device.license.id,
            code: device.license.code
        };
    } else {
        dto.licenseId = device.licenseId;
    }

    if (device.validityPeriod) {
        dto.validityPeriod = {
            id: device.validityPeriod.id,
            code: device.validityPeriod.code
        };
    } else {
        dto.validityPeriodId = device.validityPeriodId;
    }

    // --- Relaciones principales ---
    if (device.organization) {
        dto.organization = {
            id: device.organization.publicCode,
            slug: device.organization.slug,
            name: device.organization.name,
            logoUrl: device.organization.logoUrl
        };
    }
    
    if (device.site) {
        dto.site = {
            id: device.site.publicCode,
            name: device.site.name,
            city: device.site.city,
            countryCode: device.site.countryCode
        };
    }

    if (device.channels && Array.isArray(device.channels)) {
        dto.channels = device.channels.map(ch => ({
            id: ch.publicCode,
            name: ch.name,
            description: ch.description || null,
            status: ch.status,
            measurementTypeId: ch.measurementTypeId || null,
            unit: ch.unit || null
        }));
    }
    
    return dto;
};

/**
 * Convertir array de devices a DTOs públicos
 * 
 * @param {Device[]} devices - Array de modelos Sequelize Device
 * @returns {Object[]} - Array de DTOs públicos
 */
export const toPublicDeviceDtoList = (devices) => {
    if (!Array.isArray(devices)) return [];
    return devices.map(toPublicDeviceDto);
};
