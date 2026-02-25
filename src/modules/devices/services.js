// modules/devices/services.js
// Lógica de negocio para Devices

import { v7 as uuidv7 } from 'uuid';
import { Op } from 'sequelize';
import * as deviceRepository from './repository.js';
import * as organizationRepository from '../organizations/repository.js';
import * as siteRepository from '../sites/repository.js';
import { cacheDeviceList, getCachedDeviceList, invalidateDeviceCache } from './cache.js';
import { invalidateChannelCache } from '../channels/cache.js';
import { invalidateDeviceTelemetryCache } from '../telemetry/cache.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import { generateHumanId, generatePublicCode } from '../../utils/identifiers.js';
import Device from './models/Device.js';
import Channel from '../channels/models/Channel.js';
import sequelize from '../../db/sql/sequelize.js';
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
    // Convertir organizationId de publicCode a UUID si es necesario
    let organizationUuid = deviceData.organizationId;
    if (!deviceData.organizationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const org = await organizationRepository.findOrganizationByPublicCodeInternal(deviceData.organizationId);
        if (!org) {
            const error = new Error('Organización no encontrada');
            error.status = 404;
            error.code = 'ORGANIZATION_NOT_FOUND';
            throw error;
        }
        organizationUuid = org.id;
    }
    
    // Si se proporciona siteId, validar que existe y pertenece a la misma organización
    let siteUuid = deviceData.siteId;
    if (deviceData.siteId) {
        if (!deviceData.siteId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const site = await siteRepository.findSiteByPublicCodeInternal(deviceData.siteId);
            if (!site) {
                const error = new Error('Site no encontrado');
                error.status = 404;
                error.code = 'SITE_NOT_FOUND';
                throw error;
            }
            // Validar que el site pertenece a la misma organización
            if (site.organizationId !== organizationUuid) {
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
    const publicCode = generatePublicCode('DEV');
    
    const identifiers = {
        id: uuid,
        humanId: humanId,
        publicCode: publicCode
    };
    
    // Crear device
    const device = await deviceRepository.createDevice({
        ...deviceData,
        organizationId: organizationUuid,
        siteId: siteUuid || null,
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
            organizationId: organizationUuid,
            siteId: siteUuid || null,
            deviceTypeId: deviceData.deviceTypeId
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
 * Obtener device por publicCode
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
    const { showAll = false } = filters;
    
    // En modo showAll (God View), no filtramos por organización
    if (showAll) {
        const repoFilters = { ...filters, showAll: true };
        delete repoFilters.organizationId;
        delete repoFilters.organizationIds;
        
        return await deviceRepository.listDevices(repoFilters);
    }
    
    // Preparar filtros de organización
    let organizationUuid = null;
    let organizationUuids = null;

    // Prioridad: organizationIds (array del middleware) > organizationId (singular)
    if (filters.organizationIds && Array.isArray(filters.organizationIds) && filters.organizationIds.length > 0) {
        // Array de UUIDs inyectado por el middleware (ya son UUIDs validados)
        organizationUuids = filters.organizationIds;
    } else if (filters.organizationId) {
        // Convertir organizationId de publicCode a UUID si es necesario
        organizationUuid = filters.organizationId;
        if (!filters.organizationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const org = await organizationRepository.findOrganizationByPublicCodeInternal(filters.organizationId);
            if (!org) {
                const error = new Error('Organización no encontrada');
                error.status = 404;
                error.code = 'ORGANIZATION_NOT_FOUND';
                throw error;
            }
            organizationUuid = org.id;
        }
    }
    
    // Convertir siteId de publicCode a UUID si es necesario
    let siteUuid = filters.siteId;
    if (filters.siteId && !filters.siteId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const site = await siteRepository.findSiteByPublicCodeInternal(filters.siteId);
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
        organizationId: organizationUuid,
        organizationIds: organizationUuids,
        siteId: siteUuid
    });
    
    // Intentar obtener del cache
    const cached = await getCachedDeviceList(cacheKey);
    if (cached) {
        return cached;
    }
    
    // Preparar filtros para el repository
    const repoFilters = {
        ...filters,
        organizationId: organizationUuid,
        organizationIds: organizationUuids,
        siteId: siteUuid
    };

    // Obtener de BD
    const result = await deviceRepository.listDevices(repoFilters);
    
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
    
    // Si se actualiza siteId, validar que existe y pertenece a la misma organización
    if (updateData.siteId) {
        let siteUuid = updateData.siteId;
        if (!updateData.siteId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const site = await siteRepository.findSiteByPublicCodeInternal(updateData.siteId);
            if (!site) {
                const error = new Error('Site no encontrado');
                error.status = 404;
                error.code = 'SITE_NOT_FOUND';
                throw error;
            }
            // Validar que el site pertenece a la misma organización
            if (site.organizationId !== deviceInternal.organizationId) {
                const error = new Error('El site no pertenece a la organización del device');
                error.status = 400;
                error.code = 'SITE_ORGANIZATION_MISMATCH';
                throw error;
            }
            siteUuid = site.id;
        }
        updateData.siteId = siteUuid;
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
            organizationId: deviceInternal.organizationId
        },
        ipAddress: ipAddress,
        userAgent: userAgent
    });
    
    // Invalidar cache de devices y telemetría de todos los canales del device
    await invalidateDeviceCache();
    await invalidateDeviceTelemetryCache(deviceInternal.id);
    
    logger.info({ deviceId: updatedDevice.id, userId }, 'Device updated successfully');
    
    return updatedDevice;
};

/**
 * Eliminar device (soft delete) con cascade a channels
 * Al borrar un device, todos sus channels asociados se marcan como inactivos
 * @param {string} publicCode - Public code del device
 * @param {string} userId - ID del usuario que elimina
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Resultado con device eliminado y channels actualizados
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
    
    // Iniciar transacción para garantizar consistencia
    const transaction = await sequelize.transaction();
    
    try {
        // 1. Buscar TODOS los channels asociados al device (no solo activos)
        const allChannels = await Channel.findAll({
            where: {
                deviceId: deviceInternal.id
            },
            transaction
        });
        
        logger.info(
            { deviceId: deviceInternal.id, channelsCount: allChannels.length },
            'Found channels to cascade inactivate'
        );
        
        // 2. Marcar TODOS los channels como inactivos (cascade soft-delete)
        const channelUpdates = [];
        for (const channel of allChannels) {
            const oldStatus = channel.status;
            
            // Solo actualizar si el status no es ya 'inactive'
            if (oldStatus !== 'inactive') {
                await channel.update(
                    { status: 'inactive' },
                    { transaction }
                );
            }
            
            // Audit log para TODOS los channels (incluso si ya estaban inactive)
            await logAuditAction({
                entityType: 'channel',
                entityId: channel.id,
                action: 'update',
                performedBy: userId,
                changes: {
                    status: {
                        old: oldStatus,
                        new: 'inactive'
                    }
                },
                metadata: {
                    deviceId: deviceInternal.id,
                    organizationId: deviceInternal.organizationId,
                    cascadeFrom: 'device_delete',
                    reason: 'Cascade from device soft-delete'
                },
                ipAddress: ipAddress,
                userAgent: userAgent
            });
            
            channelUpdates.push({
                id: channel.publicCode,
                name: channel.name,
                oldStatus: oldStatus,
                newStatus: 'inactive'
            });
        }
        
        // 3. Soft delete del device usando repository layer
        const deletedDevice = await deviceRepository.softDeleteDevice(deviceInternal.id, transaction);
        const deletionTimestamp = deletedDevice.deletedAt;
        
        // 4. Audit log para device con información completa del cambio
        await logAuditAction({
            entityType: 'device',
            entityId: deviceInternal.id,
            action: 'delete',
            performedBy: userId,
            changes: {
                deletedAt: {
                    old: null,
                    new: deletionTimestamp
                },
                isActive: {
                    old: true,
                    new: false
                }
            },
            metadata: {
                organizationId: deviceInternal.organizationId,
                channelsAffected: allChannels.length,
                channelUpdates: channelUpdates,
                deviceName: deviceInternal.name,
                deviceTypeId: deviceInternal.deviceTypeId
            },
            ipAddress: ipAddress,
            userAgent: userAgent
        });
        
        // Commit de transacción
        await transaction.commit();
        
        // Invalidar caches (después del commit)
        await Promise.all([
            invalidateDeviceCache(),
            invalidateChannelCache(),
            invalidateDeviceTelemetryCache(deviceInternal.id)
        ]);
        
        logger.info(
            { 
                deviceId: deviceInternal.id, 
                userId,
                channelsAffected: allChannels.length 
            }, 
            'Device soft-deleted successfully with cascade to channels'
        );
        
        // Retornar respuesta canónica: device serializado + deletionStatus + cascade
        return {
            device: deletedDevice, // Serializado sin deletedAt (DTO público estándar)
            cascade: {
                channelsAffected: allChannels.length,
                channelUpdates: channelUpdates
            },
            deletionStatus: {
                deleted: true,
                deletedAt: deletionTimestamp
            }
        };
        
    } catch (error) {
        // Rollback en caso de error
        await transaction.rollback();
        logger.error({ error, deviceId: deviceInternal.id }, 'Error deleting device with cascade');
        throw error;
    }
};
