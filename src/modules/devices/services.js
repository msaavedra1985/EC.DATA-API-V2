// modules/devices/services.js
// Lógica de negocio para Devices

import { v7 as uuidv7 } from 'uuid';
import * as deviceRepository from './repository.js';
import * as organizationRepository from '../organizations/repository.js';
import * as siteRepository from '../sites/repository.js';
import { cacheDeviceList, getCachedDeviceList, invalidateDeviceCache } from './cache.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import { generateHumanId, generatePublicCode } from '../../utils/identifiers.js';
import Device from './models/Device.js';
import logger from '../../utils/logger.js';

/**
 * Crear un nuevo device
 * @param {Object} deviceData - Datos del device
 * @param {string} userId - ID del usuario que crea el device
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Device creado
 */
export const createDevice = async (deviceData, userId, ipAddress, userAgent) => {
    // Convertir organization_id de public_code a UUID si es necesario
    let organizationUuid = deviceData.organization_id;
    if (!deviceData.organization_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const org = await organizationRepository.findOrganizationByPublicCodeInternal(deviceData.organization_id);
        if (!org) {
            const error = new Error('Organización no encontrada');
            error.status = 404;
            error.code = 'ORGANIZATION_NOT_FOUND';
            throw error;
        }
        organizationUuid = org.id;
    }
    
    // Si se proporciona site_id, validar que existe y pertenece a la misma organización
    let siteUuid = deviceData.site_id;
    if (deviceData.site_id) {
        if (!deviceData.site_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const site = await siteRepository.findSiteByPublicCodeInternal(deviceData.site_id);
            if (!site) {
                const error = new Error('Site no encontrado');
                error.status = 404;
                error.code = 'SITE_NOT_FOUND';
                throw error;
            }
            // Validar que el site pertenece a la misma organización
            if (site.organization_id !== organizationUuid) {
                const error = new Error('El site no pertenece a la organización especificada');
                error.status = 400;
                error.code = 'SITE_ORGANIZATION_MISMATCH';
                throw error;
            }
            siteUuid = site.id;
        }
    }
    
    // Generar identificadores usando el helper centralizado
    const uuid = uuidv7();
    const humanId = await generateHumanId(Device, null, null);
    const publicCode = generatePublicCode('DEV', uuid);
    
    const identifiers = {
        id: uuid,
        human_id: humanId,
        public_code: publicCode
    };
    
    // Crear device
    const device = await deviceRepository.createDevice({
        ...deviceData,
        organization_id: organizationUuid,
        site_id: siteUuid || null,
        ...identifiers
    });
    
    // Audit log
    await logAuditAction({
        entityType: 'device',
        entityId: device.id,
        action: 'create',
        performedBy: userId,
        changes: { new: device },
        metadata: {
            organization_id: organizationUuid,
            site_id: siteUuid || null,
            device_type: deviceData.device_type
        },
        ipAddress: ipAddress,
        userAgent: userAgent
    });
    
    // Invalidar cache
    await invalidateDeviceCache();
    
    logger.info({ deviceId: device.id, userId }, 'Device created successfully');
    
    return device;
};

/**
 * Obtener device por public_code
 * @param {string} publicCode - Public code del device
 * @returns {Promise<Object>} - Device encontrado
 */
export const getDeviceByPublicCode = async (publicCode) => {
    const device = await deviceRepository.findDeviceByPublicCode(publicCode);
    
    if (!device) {
        const error = new Error('Device no encontrado');
        error.status = 404;
        error.code = 'DEVICE_NOT_FOUND';
        throw error;
    }
    
    return device;
};

/**
 * Listar devices con filtros y paginación
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Object>} - Lista de devices paginada
 */
export const listDevices = async (filters) => {
    // Convertir organization_id de public_code a UUID si es necesario
    let organizationUuid = filters.organization_id;
    if (filters.organization_id && !filters.organization_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const org = await organizationRepository.findOrganizationByPublicCodeInternal(filters.organization_id);
        if (!org) {
            const error = new Error('Organización no encontrada');
            error.status = 404;
            error.code = 'ORGANIZATION_NOT_FOUND';
            throw error;
        }
        organizationUuid = org.id;
    }
    
    // Convertir site_id de public_code a UUID si es necesario
    let siteUuid = filters.site_id;
    if (filters.site_id && !filters.site_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const site = await siteRepository.findSiteByPublicCodeInternal(filters.site_id);
        if (!site) {
            const error = new Error('Site no encontrado');
            error.status = 404;
            error.code = 'SITE_NOT_FOUND';
            throw error;
        }
        siteUuid = site.id;
    }
    
    // Generar cache key basada en filtros
    const cacheKey = JSON.stringify({
        ...filters,
        organization_id: organizationUuid,
        site_id: siteUuid
    });
    
    // Intentar obtener del cache
    const cached = await getCachedDeviceList(cacheKey);
    if (cached) {
        return cached;
    }
    
    // Obtener de BD
    const result = await deviceRepository.listDevices({
        ...filters,
        organization_id: organizationUuid,
        site_id: siteUuid
    });
    
    // Cachear resultado
    await cacheDeviceList(cacheKey, result);
    
    return result;
};

/**
 * Actualizar device
 * @param {string} publicCode - Public code del device
 * @param {Object} updateData - Datos a actualizar
 * @param {string} userId - ID del usuario que actualiza
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Device actualizado
 */
export const updateDevice = async (publicCode, updateData, userId, ipAddress, userAgent) => {
    // Obtener device actual
    const deviceInternal = await deviceRepository.findDeviceByPublicCodeInternal(publicCode);
    
    if (!deviceInternal) {
        const error = new Error('Device no encontrado');
        error.status = 404;
        error.code = 'DEVICE_NOT_FOUND';
        throw error;
    }
    
    // Si se actualiza site_id, validar que existe y pertenece a la misma organización
    if (updateData.site_id) {
        let siteUuid = updateData.site_id;
        if (!updateData.site_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const site = await siteRepository.findSiteByPublicCodeInternal(updateData.site_id);
            if (!site) {
                const error = new Error('Site no encontrado');
                error.status = 404;
                error.code = 'SITE_NOT_FOUND';
                throw error;
            }
            // Validar que el site pertenece a la misma organización
            if (site.organization_id !== deviceInternal.organization_id) {
                const error = new Error('El site no pertenece a la organización del device');
                error.status = 400;
                error.code = 'SITE_ORGANIZATION_MISMATCH';
                throw error;
            }
            siteUuid = site.id;
        }
        updateData.site_id = siteUuid;
    }
    
    // Guardar estado anterior para audit
    const oldData = { ...deviceInternal.dataValues };
    
    // Actualizar device
    const updatedDevice = await deviceRepository.updateDevice(deviceInternal.id, updateData);
    
    // Audit log
    const changes = {};
    Object.keys(updateData).forEach(key => {
        if (oldData[key] !== updateData[key]) {
            changes[key] = {
                old: oldData[key],
                new: updateData[key]
            };
        }
    });
    
    await logAuditAction({
        entityType: 'device',
        entityId: updatedDevice.id,
        action: 'update',
        performedBy: userId,
        changes,
        metadata: {
            organization_id: deviceInternal.organization_id
        },
        ipAddress: ipAddress,
        userAgent: userAgent
    });
    
    // Invalidar cache
    await invalidateDeviceCache();
    
    logger.info({ deviceId: updatedDevice.id, userId }, 'Device updated successfully');
    
    return updatedDevice;
};

/**
 * Eliminar device (soft delete)
 * @param {string} publicCode - Public code del device
 * @param {string} userId - ID del usuario que elimina
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<boolean>} - true si se eliminó
 */
export const deleteDevice = async (publicCode, userId, ipAddress, userAgent) => {
    // Obtener device actual
    const deviceInternal = await deviceRepository.findDeviceByPublicCodeInternal(publicCode);
    
    if (!deviceInternal) {
        const error = new Error('Device no encontrado');
        error.status = 404;
        error.code = 'DEVICE_NOT_FOUND';
        throw error;
    }
    
    // Eliminar (soft delete)
    const deleted = await deviceRepository.deleteDevice(deviceInternal.id);
    
    if (deleted) {
        // Audit log
        await logAuditAction({
            entityType: 'device',
            entityId: deviceInternal.id,
            action: 'delete',
            performedBy: userId,
            changes: {
                deleted_at: {
                    old: null,
                    new: new Date()
                }
            },
            metadata: {
                organization_id: deviceInternal.organization_id
            },
            ipAddress: ipAddress,
            userAgent: userAgent
        });
        
        // Invalidar cache
        await invalidateDeviceCache();
        
        logger.info({ deviceId: deviceInternal.id, userId }, 'Device deleted successfully');
    }
    
    return deleted;
};
