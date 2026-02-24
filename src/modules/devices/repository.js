// modules/devices/repository.js
// Capa de acceso a datos para Devices

import Device from './models/Device.js';
import Organization from '../organizations/models/Organization.js';
import Site from '../sites/models/Site.js';
import Channel from '../channels/models/Channel.js';
import '../channels/repository.js';
import DeviceType from '../device-metadata/models/DeviceType.js';
import DeviceBrand from '../device-metadata/models/DeviceBrand.js';
import DeviceModel from '../device-metadata/models/DeviceModel.js';
import DeviceServer from '../device-metadata/models/DeviceServer.js';
import DeviceNetwork from '../device-metadata/models/DeviceNetwork.js';
import DeviceLicense from '../device-metadata/models/DeviceLicense.js';
import DeviceValidityPeriod from '../device-metadata/models/DeviceValidityPeriod.js';
import { toPublicDeviceDto } from './helpers/serializers.js';
import { Op } from 'sequelize';

// --- Definir relaciones de Sequelize ---

// Relaciones principales
Device.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization'
});

Device.belongsTo(Site, {
    foreignKey: 'siteId',
    as: 'site'
});

Organization.hasMany(Device, {
    foreignKey: 'organizationId',
    as: 'devices'
});

Site.hasMany(Device, {
    foreignKey: 'siteId',
    as: 'devices'
});

// Relaciones con catálogos de equipos
Device.belongsTo(DeviceType, {
    foreignKey: 'deviceTypeId',
    as: 'deviceType'
});

Device.belongsTo(DeviceBrand, {
    foreignKey: 'brandId',
    as: 'brand'
});

Device.belongsTo(DeviceModel, {
    foreignKey: 'modelId',
    as: 'model'
});

Device.belongsTo(DeviceServer, {
    foreignKey: 'serverId',
    as: 'server'
});

Device.belongsTo(DeviceNetwork, {
    foreignKey: 'networkId',
    as: 'network'
});

Device.belongsTo(DeviceLicense, {
    foreignKey: 'licenseId',
    as: 'license'
});

Device.belongsTo(DeviceValidityPeriod, {
    foreignKey: 'validityPeriodId',
    as: 'validityPeriod'
});

/**
 * Includes comunes para queries de device con relaciones
 * Incluye organización, sitio y los 7 catálogos
 */
const deviceIncludes = [
    {
        model: Organization,
        as: 'organization',
        attributes: ['id', 'publicCode', 'slug', 'name', 'logoUrl']
    },
    {
        model: Site,
        as: 'site',
        attributes: ['id', 'publicCode', 'name', 'city', 'countryCode']
    },
    {
        model: DeviceType,
        as: 'deviceType',
        attributes: ['id', 'code', 'icon']
    },
    {
        model: DeviceBrand,
        as: 'brand',
        attributes: ['id', 'code']
    },
    {
        model: DeviceModel,
        as: 'model',
        attributes: ['id', 'code']
    },
    {
        model: DeviceServer,
        as: 'server',
        attributes: ['id', 'code']
    },
    {
        model: DeviceNetwork,
        as: 'network',
        attributes: ['id', 'code']
    },
    {
        model: DeviceLicense,
        as: 'license',
        attributes: ['id', 'code']
    },
    {
        model: DeviceValidityPeriod,
        as: 'validityPeriod',
        attributes: ['id', 'code']
    }
];

/**
 * Crear un nuevo device
 * @param {Object} deviceData - Datos del device
 * @returns {Promise<Object>} - Device creado con DTO público
 */
export const createDevice = async (deviceData) => {
    const device = await Device.create(deviceData);
    
    // Recargar con relaciones
    await device.reload({ include: deviceIncludes });
    
    return toPublicDeviceDto(device);
};

/**
 * Buscar device por ID público (publicCode)
 * Retorna DTO público - uso externo
 * @param {string} publicCode - Public code del device (ej: DEV-abc123-1)
 * @returns {Promise<Object|null>} - Device DTO o null
 */
export const findDeviceByPublicCode = async (publicCode) => {
    const device = await Device.findOne({
        where: { publicCode },
        include: deviceIncludes
    });
    
    if (!device) {
        return null;
    }
    
    return toPublicDeviceDto(device);
};

/**
 * Buscar device por ID público (publicCode) - VERSIÓN INTERNA
 * Retorna modelo Sequelize completo - uso interno
 * @param {string} publicCode - Public code del device
 * @returns {Promise<Device|null>} - Modelo Device o null
 */
export const findDeviceByPublicCodeInternal = async (publicCode) => {
    return await Device.findOne({
        where: { publicCode }
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
    await device.reload({ include: deviceIncludes });
    
    return toPublicDeviceDto(device);
};

/**
 * Soft delete de device (actualiza deletedAt e isActive)
 * @param {string} id - UUID interno del device
 * @param {Object} transaction - Transacción de Sequelize (opcional)
 * @returns {Promise<Object|null>} - Device actualizado con DTO público o null
 */
export const softDeleteDevice = async (id, transaction = null) => {
    const device = await Device.findByPk(id, { transaction });
    
    if (!device) {
        return null;
    }
    
    // Soft delete explícito: setear deletedAt e isActive
    await device.update({
        deletedAt: new Date(),
        isActive: false
    }, { transaction });
    
    // Recargar con relaciones para serializar
    await device.reload({
        include: deviceIncludes,
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
 * @returns {Promise<Object>} - { items, total, page, limit }
 */
export const listDevices = async ({ 
    organizationId,
    organizationIds,
    siteId,
    status,
    deviceTypeId,
    search,
    includeChannels = false,
    limit = 20, 
    offset = 0 
}) => {
    const where = {};
    
    // Soporte para filtro de múltiples organizaciones (usado por all=true con scope limitado)
    if (organizationIds !== undefined && Array.isArray(organizationIds) && organizationIds.length > 0) {
        where.organizationId = { [Op.in]: organizationIds };
    } else if (organizationId !== undefined && organizationId !== null) {
        where.organizationId = organizationId;
    }
    
    if (siteId !== undefined) {
        where.siteId = siteId;
    }
    
    if (status !== undefined) {
        where.status = status;
    }
    
    // Filtrar por tipo de equipo (FK a catálogo)
    if (deviceTypeId !== undefined) {
        where.deviceTypeId = deviceTypeId;
    }
    
    // Búsqueda por nombre o serialNumber
    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { serialNumber: { [Op.iLike]: `%${search}%` } }
        ];
    }
    
    const includes = [...deviceIncludes];

    if (includeChannels) {
        includes.push({
            model: Channel,
            as: 'channels',
            attributes: ['id', 'publicCode', 'name', 'description', 'status', 'measurementTypeId', 'unit'],
            required: false
        });
    }

    const { count, rows } = await Device.findAndCountAll({
        where,
        include: includes,
        distinct: true,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });
    
    return {
        items: rows.map(device => toPublicDeviceDto(device)),
        total: count,
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit)
    };
};
