// modules/channels/services.js
// Lógica de negocio para Channels

import { v7 as uuidv7 } from 'uuid';
import * as channelRepository from './repository.js';
import * as deviceRepository from '../devices/repository.js';
import { cacheChannelList, getCachedChannelList, invalidateChannelCache } from './cache.js';
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
    // Convertir device_id de public_code a UUID si es necesario
    let deviceUuid = channelData.device_id;
    let device = null;
    
    if (!channelData.device_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        device = await deviceRepository.findDeviceByPublicCodeInternal(channelData.device_id);
        if (!device) {
            const error = new Error('Device no encontrado');
            error.status = 404;
            error.code = 'DEVICE_NOT_FOUND';
            throw error;
        }
        deviceUuid = device.id;
    } else {
        // Si se proporciona UUID, obtener el device para validación
        device = await Device.findByPk(deviceUuid);
        if (!device) {
            const error = new Error('Device no encontrado');
            error.status = 404;
            error.code = 'DEVICE_NOT_FOUND';
            throw error;
        }
    }
    
    // CRÍTICO: Obtener organization_id del Device y asignar automáticamente
    const organizationUuid = device.organization_id;
    
    // VALIDACIÓN EXPLÍCITA: Rechazar si se proporciona organization_id (debe derivarse del Device)
    if (channelData.organization_id) {
        const error = new Error('No se debe proporcionar organization_id. Este se deriva automáticamente del Device.');
        error.status = 400;
        error.code = 'ORGANIZATION_ID_NOT_ALLOWED';
        throw error;
    }
    
    // Generar identificadores usando el helper centralizado
    const uuid = uuidv7();
    const humanId = await generateHumanId(Channel, null, null);
    const publicCode = generatePublicCode('CHN', uuid);
    
    const identifiers = {
        id: uuid,
        human_id: humanId,
        public_code: publicCode
    };
    
    // Crear channel con organization_id del Device
    const channel = await channelRepository.createChannel({
        ...channelData,
        device_id: deviceUuid,
        organization_id: organizationUuid, // Asignar automáticamente del Device
        ...identifiers
    });
    
    // Audit log
    await logAuditAction({
        entityType: 'channel',
        entityId: channel.id,
        action: 'create',
        performedBy: userId,
        changes: { new: channel },
        metadata: {
            device_id: deviceUuid,
            organization_id: organizationUuid,
            channel_type: channelData.channel_type
        },
        ipAddress: ipAddress,
        userAgent: userAgent
    });
    
    // Invalidar cache
    await invalidateChannelCache();
    
    logger.info({ channelId: channel.id, userId }, 'Channel created successfully');
    
    return channel;
};

/**
 * Obtener channel por public_code
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
    // Convertir device_id de public_code a UUID si es necesario
    let deviceUuid = filters.device_id;
    if (filters.device_id && !filters.device_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const device = await deviceRepository.findDeviceByPublicCodeInternal(filters.device_id);
        if (!device) {
            const error = new Error('Device no encontrado');
            error.status = 404;
            error.code = 'DEVICE_NOT_FOUND';
            throw error;
        }
        deviceUuid = device.id;
    }
    
    // Convertir organization_id de public_code a UUID si es necesario
    let organizationUuid = filters.organization_id;
    if (filters.organization_id && !filters.organization_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Importar organizationRepository para convertir public_code
        const { findOrganizationByPublicCodeInternal } = await import('../organizations/repository.js');
        const org = await findOrganizationByPublicCodeInternal(filters.organization_id);
        if (!org) {
            const error = new Error('Organización no encontrada');
            error.status = 404;
            error.code = 'ORGANIZATION_NOT_FOUND';
            throw error;
        }
        organizationUuid = org.id;
    }
    
    // Generar cache key basada en filtros
    const cacheKey = JSON.stringify({
        ...filters,
        device_id: deviceUuid,
        organization_id: organizationUuid
    });
    
    // Intentar obtener del cache
    const cached = await getCachedChannelList(cacheKey);
    if (cached) {
        return cached;
    }
    
    // Obtener de BD
    const result = await channelRepository.listChannels({
        ...filters,
        device_id: deviceUuid,
        organization_id: organizationUuid
    });
    
    // Cachear resultado
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
    // Buscar channel por public_code
    const existingChannel = await channelRepository.findChannelByPublicCodeInternal(publicCode);
    
    if (!existingChannel) {
        const error = new Error('Channel no encontrado');
        error.status = 404;
        error.code = 'CHANNEL_NOT_FOUND';
        throw error;
    }
    
    // Guardar estado anterior para audit log
    const oldData = existingChannel.toJSON();
    
    // Actualizar channel
    const updatedChannel = await channelRepository.updateChannel(existingChannel.id, updateData);
    
    // Audit log
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
            updated_fields: Object.keys(updateData)
        },
        ipAddress: ipAddress,
        userAgent: userAgent
    });
    
    // Invalidar cache
    await invalidateChannelCache();
    
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
    // Buscar channel por public_code
    const existingChannel = await channelRepository.findChannelByPublicCodeInternal(publicCode);
    
    if (!existingChannel) {
        const error = new Error('Channel no encontrado');
        error.status = 404;
        error.code = 'CHANNEL_NOT_FOUND';
        throw error;
    }
    
    // Guardar datos para audit log
    const channelData = existingChannel.toJSON();
    
    // Soft delete
    const deleted = await channelRepository.deleteChannel(existingChannel.id);
    
    if (deleted) {
        // Audit log
        await logAuditAction({
            entityType: 'channel',
            entityId: existingChannel.id,
            action: 'delete',
            performedBy: userId,
            changes: { 
                old: channelData 
            },
            metadata: {
                device_id: existingChannel.device_id,
                organization_id: existingChannel.organization_id
            },
            ipAddress: ipAddress,
            userAgent: userAgent
        });
        
        // Invalidar cache
        await invalidateChannelCache();
        
        logger.info({ channelId: existingChannel.id, userId }, 'Channel deleted successfully');
    }
    
    return deleted;
};
