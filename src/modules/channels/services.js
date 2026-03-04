// modules/channels/services.js
// Lógica de negocio para Channels

import { v7 as uuidv7 } from 'uuid';
import * as channelRepository from './repository.js';
import * as deviceRepository from '../devices/repository.js';
import { cacheChannelList, getCachedChannelList, invalidateChannelCache } from './cache.js';
import { invalidateChannelTelemetryCache } from '../telemetry/cache.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import { generateHumanId, generatePublicCode } from '../../utils/identifiers.js';
import Channel from './models/Channel.js';
import Device from '../devices/models/Device.js';
import logger from '../../utils/logger.js';

/**
 * Crear un nuevo channel
 * @param {Object} channelData - Datos del channel
 * @param {string} userId - ID del usuario que crea el channel
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Channel creado
 */
export const createChannel = async (channelData, userId, ipAddress, userAgent) => {
    let deviceUuid = channelData.deviceId;
    let device = null;
    
    if (!channelData.deviceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        device = await deviceRepository.findDeviceByPublicCodeInternal(channelData.deviceId);
        if (!device) {
            const error = new Error('Device no encontrado');
            error.status = 404;
            error.code = 'DEVICE_NOT_FOUND';
            throw error;
        }
        deviceUuid = device.id;
    } else {
        device = await Device.findByPk(deviceUuid);
        if (!device) {
            const error = new Error('Device no encontrado');
            error.status = 404;
            error.code = 'DEVICE_NOT_FOUND';
            throw error;
        }
    }
    
    const organizationUuid = device.organizationId;
    
    if (channelData.organizationId) {
        const error = new Error('No se debe proporcionar organizationId. Este se deriva automáticamente del Device.');
        error.status = 400;
        error.code = 'ORGANIZATION_ID_NOT_ALLOWED';
        throw error;
    }
    
    const uuid = uuidv7();
    const humanId = await generateHumanId(Channel, null, null);
    const publicCode = generatePublicCode('CHN');
    
    const identifiers = {
        id: uuid,
        humanId: humanId,
        publicCode: publicCode
    };
    
    const channel = await channelRepository.createChannel({
        ...channelData,
        deviceId: deviceUuid,
        organizationId: organizationUuid,
        ...identifiers
    });
    
    await logAuditAction({
        entityType: 'channel',
        entityId: channel.id,
        action: 'create',
        performedBy: userId,
        changes: { new: channel },
        metadata: {
            deviceId: deviceUuid,
            organizationId: organizationUuid
        },
        ipAddress: ipAddress,
        userAgent: userAgent
    });
    
    await invalidateChannelCache();
    
    logger.info({ channelId: channel.id, userId }, 'Channel created successfully');
    
    return channel;
};

/**
 * Obtener channel por publicCode
 * @param {string} publicCode - Public code del channel
 * @returns {Promise<Object>} - Channel encontrado
 */
export const getChannelByPublicCode = async (publicCode) => {
    const channel = await channelRepository.findChannelByPublicCode(publicCode);
    
    if (!channel) {
        const error = new Error('Channel no encontrado');
        error.status = 404;
        error.code = 'CHANNEL_NOT_FOUND';
        throw error;
    }
    
    return channel;
};

/**
 * Listar channels con filtros y paginación
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Object>} - Lista de channels paginada
 */
export const listChannels = async (filters) => {
    const { showAll = false } = filters;
    
    let deviceUuid = filters.deviceId;
    if (filters.deviceId && !filters.deviceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const device = await deviceRepository.findDeviceByPublicCodeInternal(filters.deviceId);
        if (!device) {
            const error = new Error('Device no encontrado');
            error.status = 404;
            error.code = 'DEVICE_NOT_FOUND';
            throw error;
        }
        deviceUuid = device.id;
    }
    
    if (showAll) {
        const repoFilters = { ...filters, deviceId: deviceUuid, showAll: true };
        delete repoFilters.organizationId;
        delete repoFilters.organizationIds;
        
        return await channelRepository.listChannels(repoFilters);
    }
    
    let organizationUuid = null;
    let organizationUuids = null;

    if (filters.organizationIds && Array.isArray(filters.organizationIds) && filters.organizationIds.length > 0) {
        organizationUuids = filters.organizationIds;
    } else if (filters.organizationId) {
        organizationUuid = filters.organizationId;
        if (!filters.organizationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const { findOrganizationByPublicCodeInternal } = await import('../organizations/repository.js');
            const org = await findOrganizationByPublicCodeInternal(filters.organizationId);
            if (!org) {
                const error = new Error('Organización no encontrada');
                error.status = 404;
                error.code = 'ORGANIZATION_NOT_FOUND';
                throw error;
            }
            organizationUuid = org.id;
        }
    }
    
    const cacheKey = JSON.stringify({
        ...filters,
        deviceId: deviceUuid,
        organizationId: organizationUuid,
        organizationIds: organizationUuids
    });
    
    const cached = await getCachedChannelList(cacheKey);
    if (cached) {
        return cached;
    }
    
    const repoFilters = {
        ...filters,
        deviceId: deviceUuid,
        organizationId: organizationUuid,
        organizationIds: organizationUuids
    };

    const result = await channelRepository.listChannels(repoFilters);
    
    await cacheChannelList(cacheKey, result);
    
    return result;
};

/**
 * Actualizar channel
 * @param {string} publicCode - Public code del channel
 * @param {Object} updateData - Datos a actualizar
 * @param {string} userId - ID del usuario que actualiza
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Channel actualizado
 */
export const updateChannel = async (publicCode, updateData, userId, ipAddress, userAgent) => {
    const existingChannel = await channelRepository.findChannelByPublicCodeInternal(publicCode);
    
    if (!existingChannel) {
        const error = new Error('Channel no encontrado');
        error.status = 404;
        error.code = 'CHANNEL_NOT_FOUND';
        throw error;
    }
    
    const oldData = existingChannel.toJSON();
    
    const updatedChannel = await channelRepository.updateChannel(existingChannel.id, updateData);
    
    await logAuditAction({
        entityType: 'channel',
        entityId: existingChannel.id,
        action: 'update',
        performedBy: userId,
        changes: { 
            old: oldData, 
            new: updatedChannel 
        },
        metadata: {
            updatedFields: Object.keys(updateData)
        },
        ipAddress: ipAddress,
        userAgent: userAgent
    });
    
    await invalidateChannelCache();
    await invalidateChannelTelemetryCache(existingChannel.id);
    
    logger.info({ channelId: existingChannel.id, userId }, 'Channel updated successfully');
    
    return updatedChannel;
};

/**
 * Eliminar channel (soft delete)
 * @param {string} publicCode - Public code del channel
 * @param {string} userId - ID del usuario que elimina
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<boolean>} - true si se eliminó
 */
export const deleteChannel = async (publicCode, userId, ipAddress, userAgent) => {
    const existingChannel = await channelRepository.findChannelByPublicCodeInternal(publicCode);
    
    if (!existingChannel) {
        const error = new Error('Channel no encontrado');
        error.status = 404;
        error.code = 'CHANNEL_NOT_FOUND';
        throw error;
    }
    
    const channelData = existingChannel.toJSON();
    
    const deleted = await channelRepository.deleteChannel(existingChannel.id);
    
    if (deleted) {
        await logAuditAction({
            entityType: 'channel',
            entityId: existingChannel.id,
            action: 'delete',
            performedBy: userId,
            changes: { 
                old: channelData 
            },
            metadata: {
                deviceId: existingChannel.deviceId,
                organizationId: existingChannel.organizationId
            },
            ipAddress: ipAddress,
            userAgent: userAgent
        });
        
        await invalidateChannelCache();
        await invalidateChannelTelemetryCache(existingChannel.id);
        
        logger.info({ channelId: existingChannel.id, userId }, 'Channel deleted successfully');
    }
    
    return deleted;
};
