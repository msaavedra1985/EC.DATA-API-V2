// modules/channels/repository.js
// Capa de acceso a datos para Channels

import Channel from './models/Channel.js';
import Device from '../devices/models/Device.js';
import Organization from '../organizations/models/Organization.js';
import MeasurementType from '../telemetry/models/MeasurementType.js';
import { toPublicChannelDto } from './helpers/serializers.js';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../../db/sql/sequelize.js';

// Definir relaciones de Sequelize
Channel.belongsTo(Device, {
    foreignKey: 'deviceId',
    as: 'device'
});

Channel.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization'
});

Channel.belongsTo(MeasurementType, {
    foreignKey: 'measurementTypeId',
    as: 'measurementType'
});

Device.hasMany(Channel, {
    foreignKey: 'deviceId',
    as: 'channels'
});

Organization.hasMany(Channel, {
    foreignKey: 'organizationId',
    as: 'channels'
});

const deviceInclude = {
    model: Device,
    as: 'device',
    attributes: ['id', 'public_code', 'name', 'status']
};

const organizationInclude = {
    model: Organization,
    as: 'organization',
    attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
};

const measurementTypeInclude = {
    model: MeasurementType,
    as: 'measurementType',
    attributes: ['id', 'code'],
    required: false
};

const defaultIncludes = [deviceInclude, organizationInclude, measurementTypeInclude];

/**
 * Crear un nuevo channel
 * @param {Object} channelData - Datos del channel
 * @returns {Promise<Object>} - Channel creado con DTO público
 */
export const createChannel = async (channelData) => {
    const channel = await Channel.create(channelData);
    
    await channel.reload({ include: defaultIncludes });
    
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
        include: defaultIncludes
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
    
    await channel.reload({ include: defaultIncludes });
    
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
    
    await channel.destroy();
    return true;
};

/**
 * Listar channels con filtros y paginación
 * Soporta filtro not_in_hierarchy para excluir channels ya en jerarquía
 * 
 * @param {Object} options - Opciones de filtrado y paginación
 * @param {boolean} options.not_in_hierarchy - Si true, excluye channels que ya están en resource_hierarchy
 * @returns {Promise<Object>} - { items: [...], total, page, limit }
 */
export const listChannels = async ({ 
    device_id, 
    organization_id,
    organization_ids,
    measurement_type_id,
    status,
    search,
    not_in_hierarchy = false,
    limit = 20, 
    offset = 0 
}) => {
    if (not_in_hierarchy) {
        return await listChannelsNotInHierarchy({
            device_id,
            organization_id,
            organization_ids,
            measurement_type_id,
            status,
            search,
            limit,
            offset
        });
    }
    
    const where = {};
    
    if (device_id !== undefined) {
        where.device_id = device_id;
    }
    
    if (organization_ids !== undefined && Array.isArray(organization_ids) && organization_ids.length > 0) {
        where.organization_id = { [Op.in]: organization_ids };
    } else if (organization_id !== undefined && organization_id !== null) {
        where.organization_id = organization_id;
    }

    if (measurement_type_id !== undefined) {
        where.measurement_type_id = measurement_type_id;
    }
    
    if (status !== undefined) {
        where.status = status;
    }
    
    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } }
        ];
    }
    
    const { count, rows } = await Channel.findAndCountAll({
        where,
        include: defaultIncludes,
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

/**
 * Listar channels que NO están en ninguna jerarquía de recursos
 * Usa raw SQL con LEFT JOIN para filtrar eficientemente
 * 
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<Object>} - { items: [...], total, page, limit }
 */
const listChannelsNotInHierarchy = async ({
    device_id,
    organization_id,
    organization_ids,
    measurement_type_id,
    status,
    search,
    limit = 20,
    offset = 0
}) => {
    const conditions = ['c.deleted_at IS NULL'];
    const bindings = [];
    let bindIndex = 1;
    
    if (organization_ids && Array.isArray(organization_ids) && organization_ids.length > 0) {
        conditions.push(`c.organization_id = ANY($${bindIndex}::uuid[])`);
        bindings.push(organization_ids);
        bindIndex++;
    } else if (organization_id) {
        conditions.push(`c.organization_id = $${bindIndex}`);
        bindings.push(organization_id);
        bindIndex++;
    }
    
    if (device_id) {
        conditions.push(`c.device_id = $${bindIndex}`);
        bindings.push(device_id);
        bindIndex++;
    }

    if (measurement_type_id) {
        conditions.push(`c.measurement_type_id = $${bindIndex}`);
        bindings.push(measurement_type_id);
        bindIndex++;
    }
    
    if (status) {
        conditions.push(`c.status = $${bindIndex}`);
        bindings.push(status);
        bindIndex++;
    }
    
    if (search) {
        conditions.push(`(c.name ILIKE $${bindIndex} OR c.description ILIKE $${bindIndex})`);
        bindings.push(`%${search}%`);
        bindIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    const countQuery = `
        SELECT COUNT(DISTINCT c.id) as total
        FROM channels c
        LEFT JOIN resource_hierarchy rh 
            ON rh.reference_id = c.public_code 
            AND rh.node_type = 'channel' 
            AND rh.deleted_at IS NULL
        WHERE ${whereClause}
          AND rh.id IS NULL
    `;
    
    const dataQuery = `
        SELECT 
            c.*,
            d.id as device_id_rel,
            d.public_code as device_public_code,
            d.name as device_name,
            d.status as device_status,
            o.id as org_id_rel,
            o.public_code as org_public_code,
            o.slug as org_slug,
            o.name as org_name,
            o.logo_url as org_logo_url,
            mt.id as mt_id,
            mt.code as mt_code
        FROM channels c
        LEFT JOIN resource_hierarchy rh 
            ON rh.reference_id = c.public_code 
            AND rh.node_type = 'channel' 
            AND rh.deleted_at IS NULL
        LEFT JOIN devices d ON c.device_id = d.id
        LEFT JOIN organizations o ON c.organization_id = o.id
        LEFT JOIN measurement_types mt ON c.measurement_type_id = mt.id
        WHERE ${whereClause}
          AND rh.id IS NULL
        ORDER BY c.created_at DESC
        LIMIT $${bindIndex} OFFSET $${bindIndex + 1}
    `;
    
    const countBindings = [...bindings];
    const dataBindings = [...bindings, parseInt(limit), parseInt(offset)];
    
    const [countResult, dataResult] = await Promise.all([
        sequelize.query(countQuery, { bind: countBindings, type: QueryTypes.SELECT }),
        sequelize.query(dataQuery, { bind: dataBindings, type: QueryTypes.SELECT })
    ]);
    
    const total = parseInt(countResult[0]?.total || 0);
    
    const items = dataResult.map(row => ({
        id: row.public_code,
        name: row.name,
        description: row.description,
        ch: row.ch,
        measurement_type_id: row.measurement_type_id,
        phase_system: row.phase_system,
        phase: row.phase,
        process: row.process,
        status: row.status,
        last_sync_at: row.last_sync_at,
        metadata: row.metadata,
        is_active: row.is_active,
        measurement_type: row.mt_id ? {
            id: row.mt_id,
            code: row.mt_code
        } : null,
        device: row.device_id_rel ? {
            id: row.device_public_code,
            name: row.device_name,
            status: row.device_status
        } : null,
        organization: row.org_id_rel ? {
            id: row.org_public_code,
            slug: row.org_slug,
            name: row.org_name,
            logo_url: row.org_logo_url
        } : null,
        created_at: row.created_at,
        updated_at: row.updated_at
    }));
    
    return {
        items,
        total,
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit)
    };
};
