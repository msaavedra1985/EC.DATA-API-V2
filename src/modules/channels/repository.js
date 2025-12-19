// modules/channels/repository.js
// Capa de acceso a datos para Channels

import Channel from './models/Channel.js';
import Device from '../devices/models/Device.js';
import Organization from '../organizations/models/Organization.js';
import { toPublicChannelDto } from './helpers/serializers.js';
import { Op } from 'sequelize';

// Definir relaciones de Sequelize
Channel.belongsTo(Device, {
    foreignKey: 'device_id',
    as: 'device'
});

Channel.belongsTo(Organization, {
    foreignKey: 'organization_id',
    as: 'organization'
});

Device.hasMany(Channel, {
    foreignKey: 'device_id',
    as: 'channels'
});

Organization.hasMany(Channel, {
    foreignKey: 'organization_id',
    as: 'channels'
});

/**
 * Crear un nuevo channel
 * @param {Object} channelData - Datos del channel
 * @returns {Promise<Object>} - Channel creado con DTO público
 */
export const createChannel = async (channelData) => {
    const channel = await Channel.create(channelData);
    
    // Recargar con relaciones
    await channel.reload({
        include: [
            {
                model: Device,
                as: 'device',
                attributes: ['id', 'public_code', 'name', 'device_type', 'status']
            },
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            }
        ]
    });
    
    return toPublicChannelDto(channel);
};

/**
 * Buscar channel por ID público (public_code)
 * Retorna DTO público - uso externo
 * @param {string} publicCode - Public code del channel (ej: CHN-abc123-1)
 * @returns {Promise<Object|null>} - Channel DTO o null
 */
export const findChannelByPublicCode = async (publicCode) => {
    const channel = await Channel.findOne({
        where: { public_code: publicCode },
        include: [
            {
                model: Device,
                as: 'device',
                attributes: ['id', 'public_code', 'name', 'device_type', 'status']
            },
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            }
        ]
    });
    
    if (!channel) {
        return null;
    }
    
    return toPublicChannelDto(channel);
};

/**
 * Buscar channel por ID público (public_code) - VERSIÓN INTERNA
 * Retorna modelo Sequelize completo - uso interno
 * @param {string} publicCode - Public code del channel
 * @returns {Promise<Channel|null>} - Modelo Channel o null
 */
export const findChannelByPublicCodeInternal = async (publicCode) => {
    return await Channel.findOne({
        where: { public_code: publicCode }
    });
};

/**
 * Buscar channel por UUID interno
 * Uso interno - NO exponer en APIs públicas
 * @param {string} id - UUID del channel
 * @returns {Promise<Channel|null>} - Modelo Channel o null
 */
export const findChannelById = async (id) => {
    return await Channel.findByPk(id);
};

/**
 * Actualizar channel
 * @param {string} id - UUID interno del channel
 * @param {Object} updateData - Datos a actualizar
 * @returns {Promise<Object>} - Channel actualizado con DTO público
 */
export const updateChannel = async (id, updateData) => {
    const channel = await Channel.findByPk(id);
    
    if (!channel) {
        return null;
    }
    
    await channel.update(updateData);
    
    // Recargar con relaciones
    await channel.reload({
        include: [
            {
                model: Device,
                as: 'device',
                attributes: ['id', 'public_code', 'name', 'device_type', 'status']
            },
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            }
        ]
    });
    
    return toPublicChannelDto(channel);
};

/**
 * Soft delete de channel
 * @param {string} id - UUID interno del channel
 * @returns {Promise<boolean>} - true si se eliminó
 */
export const deleteChannel = async (id) => {
    const channel = await Channel.findByPk(id);
    
    if (!channel) {
        return false;
    }
    
    await channel.destroy(); // Soft delete por paranoid: true
    return true;
};

/**
 * Listar channels con filtros y paginación
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Promise<Object>} - { channels: [...], total, page, limit }
 */
export const listChannels = async ({ 
    device_id, 
    organization_id,
    organization_ids,  // Array de UUIDs para filtrar múltiples organizaciones
    channel_type,
    status,
    search,
    limit = 20, 
    offset = 0 
}) => {
    const where = {};
    
    if (device_id !== undefined) {
        where.device_id = device_id;
    }
    
    // Soporte para filtro de múltiples organizaciones (usado por all=true con scope limitado)
    if (organization_ids !== undefined && Array.isArray(organization_ids) && organization_ids.length > 0) {
        where.organization_id = { [Op.in]: organization_ids };
    } else if (organization_id !== undefined && organization_id !== null) {
        where.organization_id = organization_id;
    }
    
    if (channel_type !== undefined) {
        where.channel_type = channel_type;
    }
    
    if (status !== undefined) {
        where.status = status;
    }
    
    // Búsqueda por nombre o endpoint_url
    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { endpoint_url: { [Op.iLike]: `%${search}%` } }
        ];
    }
    
    const { count, rows } = await Channel.findAndCountAll({
        where,
        include: [
            {
                model: Device,
                as: 'device',
                attributes: ['id', 'public_code', 'name', 'device_type', 'status']
            },
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
    });
    
    return {
        items: rows.map(channel => toPublicChannelDto(channel)),
        total: count,
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit)
    };
};
