// modules/devices/repository.js
// Capa de acceso a datos para Devices

import Device from './models/Device.js';
import Organization from '../organizations/models/Organization.js';
import Site from '../sites/models/Site.js';
import { toPublicDeviceDto } from './helpers/serializers.js';
import { Op } from 'sequelize';

// Definir relaciones de Sequelize
Device.belongsTo(Organization, {
    foreignKey: 'organization_id',
    as: 'organization'
});

Device.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
});

Organization.hasMany(Device, {
    foreignKey: 'organization_id',
    as: 'devices'
});

Site.hasMany(Device, {
    foreignKey: 'site_id',
    as: 'devices'
});

/**
 * Crear un nuevo device
 * @param {Object} deviceData - Datos del device
 * @returns {Promise<Object>} - Device creado con DTO público
 */
export const createDevice = async (deviceData) => {
    const device = await Device.create(deviceData);
    
    // Recargar con relaciones
    await device.reload({
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            },
            {
                model: Site,
                as: 'site',
                attributes: ['id', 'public_code', 'name', 'city', 'country_code']
            }
        ]
    });
    
    return toPublicDeviceDto(device);
};

/**
 * Buscar device por ID público (public_code)
 * Retorna DTO público - uso externo
 * @param {string} publicCode - Public code del device (ej: DEV-abc123-1)
 * @returns {Promise<Object|null>} - Device DTO o null
 */
export const findDeviceByPublicCode = async (publicCode) => {
    const device = await Device.findOne({
        where: { public_code: publicCode },
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            },
            {
                model: Site,
                as: 'site',
                attributes: ['id', 'public_code', 'name', 'city', 'country_code']
            }
        ]
    });
    
    if (!device) {
        return null;
    }
    
    return toPublicDeviceDto(device);
};

/**
 * Buscar device por ID público (public_code) - VERSIÓN INTERNA
 * Retorna modelo Sequelize completo - uso interno
 * @param {string} publicCode - Public code del device
 * @returns {Promise<Device|null>} - Modelo Device o null
 */
export const findDeviceByPublicCodeInternal = async (publicCode) => {
    return await Device.findOne({
        where: { public_code: publicCode }
    });
};

/**
 * Buscar device por UUID interno
 * Uso interno - NO exponer en APIs públicas
 * @param {string} id - UUID del device
 * @returns {Promise<Device|null>} - Modelo Device o null
 */
export const findDeviceById = async (id) => {
    return await Device.findByPk(id);
};

/**
 * Actualizar device
 * @param {string} id - UUID interno del device
 * @param {Object} updateData - Datos a actualizar
 * @returns {Promise<Object>} - Device actualizado con DTO público
 */
export const updateDevice = async (id, updateData) => {
    const device = await Device.findByPk(id);
    
    if (!device) {
        return null;
    }
    
    await device.update(updateData);
    
    // Recargar con relaciones
    await device.reload({
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            },
            {
                model: Site,
                as: 'site',
                attributes: ['id', 'public_code', 'name', 'city', 'country_code']
            }
        ]
    });
    
    return toPublicDeviceDto(device);
};

/**
 * Soft delete de device (actualiza deleted_at e is_active)
 * @param {string} id - UUID interno del device
 * @param {Object} transaction - Transacción de Sequelize (opcional)
 * @returns {Promise<Object|null>} - Device actualizado con DTO público o null
 */
export const softDeleteDevice = async (id, transaction = null) => {
    const device = await Device.findByPk(id, { transaction });
    
    if (!device) {
        return null;
    }
    
    // Soft delete explícito: setear deleted_at e is_active
    await device.update({
        deleted_at: new Date(),
        is_active: false
    }, { transaction });
    
    // Recargar con relaciones para serializar
    await device.reload({
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            },
            {
                model: Site,
                as: 'site',
                attributes: ['id', 'public_code', 'name', 'city', 'country_code']
            }
        ],
        transaction
    });
    
    return toPublicDeviceDto(device);
};

/**
 * Soft delete de device (legacy method - mantener por compatibilidad)
 * @param {string} id - UUID interno del device
 * @returns {Promise<boolean>} - true si se eliminó
 */
export const deleteDevice = async (id) => {
    const device = await Device.findByPk(id);
    
    if (!device) {
        return false;
    }
    
    await device.destroy(); // Soft delete por paranoid: true
    return true;
};

/**
 * Listar devices con filtros y paginación
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Promise<Object>} - { devices: [...], total, page, limit }
 */
export const listDevices = async ({ 
    organization_id,
    organization_ids,  // Array de UUIDs para filtrar múltiples organizaciones
    site_id,
    status,
    device_type,
    search,
    limit = 20, 
    offset = 0 
}) => {
    const where = {};
    
    // Soporte para filtro de múltiples organizaciones (usado por all=true con scope limitado)
    if (organization_ids !== undefined && Array.isArray(organization_ids) && organization_ids.length > 0) {
        where.organization_id = { [Op.in]: organization_ids };
    } else if (organization_id !== undefined && organization_id !== null) {
        where.organization_id = organization_id;
    }
    
    if (site_id !== undefined) {
        where.site_id = site_id;
    }
    
    if (status !== undefined) {
        where.status = status;
    }
    
    if (device_type !== undefined) {
        where.device_type = device_type;
    }
    
    // Búsqueda por nombre o serial_number
    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { serial_number: { [Op.iLike]: `%${search}%` } }
        ];
    }
    
    const { count, rows } = await Device.findAndCountAll({
        where,
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            },
            {
                model: Site,
                as: 'site',
                attributes: ['id', 'public_code', 'name', 'city', 'country_code']
            }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
    });
    
    return {
        items: rows.map(device => toPublicDeviceDto(device)),
        total: count,
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit)
    };
};
