// modules/devices/helpers/serializers.js
// Serializadores para convertir modelos internos a DTOs públicos

/**
 * Convertir modelo Device a DTO público
 * Expone public_code como 'id', oculta UUID interno
 * 
 * POLÍTICA DE SEGURIDAD:
 * - Nunca exponer el UUID interno en APIs públicas
 * - Siempre usar public_code como 'id' en respuestas
 * - UUIDs solo para operaciones internas de base de datos
 * 
 * @param {Device} device - Modelo Sequelize Device
 * @returns {Object} - DTO público para respuestas API
 */
export const toPublicDeviceDto = (device) => {
    if (!device) return null;
    
    const dto = {
        id: device.public_code, // CRÍTICO: exponer public_code como 'id'
        name: device.name,
        description: device.description,
        device_type: device.device_type,
        status: device.status,
        firmware_version: device.firmware_version,
        serial_number: device.serial_number,
        ip_address: device.ip_address,
        mac_address: device.mac_address,
        location_hint: device.location_hint,
        last_seen_at: device.last_seen_at,
        metadata: device.metadata || {},
        is_active: device.is_active,
        created_at: device.created_at,
        updated_at: device.updated_at
    };
    
    // Incluir organization si está presente
    if (device.organization) {
        dto.organization = {
            id: device.organization.public_code, // Exponer public_code como id
            slug: device.organization.slug,
            name: device.organization.name,
            logo_url: device.organization.logo_url
        };
    }
    
    // Incluir site si está presente
    if (device.site) {
        dto.site = {
            id: device.site.public_code, // Exponer public_code como id
            name: device.site.name,
            city: device.site.city,
            country_code: device.site.country_code
        };
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
