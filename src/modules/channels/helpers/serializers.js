// modules/channels/helpers/serializers.js
// Serializadores para convertir modelos internos a DTOs públicos

/**
 * Convertir modelo Channel a DTO público
 * Expone public_code como 'id', oculta UUID interno
 * 
 * POLÍTICA DE SEGURIDAD:
 * - Nunca exponer el UUID interno en APIs públicas
 * - Siempre usar public_code como 'id' en respuestas
 * - UUIDs solo para operaciones internas de base de datos
 * 
 * @param {Channel} channel - Modelo Sequelize Channel
 * @returns {Object} - DTO público para respuestas API
 */
export const toPublicChannelDto = (channel) => {
    if (!channel) return null;
    
    const dto = {
        id: channel.public_code,
        name: channel.name,
        description: channel.description,
        ch: channel.ch,
        measurement_type_id: channel.measurement_type_id,
        phase_system: channel.phase_system,
        phase: channel.phase,
        process: channel.process,
        status: channel.status,
        last_sync_at: channel.last_sync_at,
        metadata: channel.metadata || {},
        is_active: channel.is_active,
        created_at: channel.created_at,
        updated_at: channel.updated_at
    };

    if (channel.measurementType) {
        dto.measurement_type = {
            id: channel.measurementType.id,
            code: channel.measurementType.code
        };
    }
    
    if (channel.device) {
        dto.device = {
            id: channel.device.public_code,
            name: channel.device.name,
            status: channel.device.status
        };
    }
    
    if (channel.organization) {
        dto.organization = {
            id: channel.organization.public_code,
            slug: channel.organization.slug,
            name: channel.organization.name,
            logo_url: channel.organization.logo_url
        };
    }
    
    return dto;
};

/**
 * Convertir array de channels a DTOs públicos
 * 
 * @param {Channel[]} channels - Array de modelos Sequelize Channel
 * @returns {Object[]} - Array de DTOs públicos
 */
export const toPublicChannelDtoList = (channels) => {
    if (!Array.isArray(channels)) return [];
    return channels.map(toPublicChannelDto);
};
