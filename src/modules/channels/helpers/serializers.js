// modules/channels/helpers/serializers.js
// Serializadores para convertir modelos internos a DTOs públicos

/**
 * Convertir modelo Channel a DTO público
 * Expone publicCode como 'id', oculta UUID interno
 * 
 * POLÍTICA DE SEGURIDAD:
 * - Nunca exponer el UUID interno en APIs públicas
 * - Siempre usar publicCode como 'id' en respuestas
 * - UUIDs solo para operaciones internas de base de datos
 * 
 * @param {Channel} channel - Modelo Sequelize Channel
 * @returns {Object} - DTO público para respuestas API
 */
export const toPublicChannelDto = (channel) => {
    if (!channel) return null;
    
    const dto = {
        id: channel.publicCode,
        name: channel.name,
        description: channel.description,
        ch: channel.ch,
        measurementTypeId: channel.measurementTypeId,
        phaseSystem: channel.phaseSystem,
        phase: channel.phase,
        process: channel.process,
        status: channel.status,
        lastSyncAt: channel.lastSyncAt,
        metadata: channel.metadata || {},
        isActive: channel.isActive,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt
    };

    if (channel.measurementType) {
        dto.measurementType = {
            id: channel.measurementType.id,
            code: channel.measurementType.code
        };
    }
    
    if (channel.device) {
        dto.device = {
            id: channel.device.publicCode,
            name: channel.device.name,
            status: channel.device.status
        };
    }
    
    if (channel.organization) {
        dto.organization = {
            id: channel.organization.publicCode,
            slug: channel.organization.slug,
            name: channel.organization.name,
            logoUrl: channel.organization.logoUrl
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
