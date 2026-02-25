// modules/sites/services.js
// Lógica de negocio para Sites

import { v7 as uuidv7 } from 'uuid';
import * as siteRepository from './repository.js';
import * as organizationRepository from '../organizations/repository.js';
import * as countryRepository from '../countries/repository.js';
import { cacheSiteList, getCachedSiteList, invalidateSiteCache } from './cache.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import { generateHumanId, generatePublicCode } from '../../utils/identifiers.js';
import Site from './models/Site.js';
import logger from '../../utils/logger.js';

/**
 * Crear un nuevo site
 * @param {Object} siteData - Datos del site
 * @param {string} userId - ID del usuario que crea el site
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Site creado
 */
export const createSite = async (siteData, userId, ipAddress, userAgent) => {
    // Convertir organizationId de publicCode a UUID si es necesario
    let organizationUuid = siteData.organizationId;
    if (!siteData.organizationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const org = await organizationRepository.findOrganizationByPublicCodeInternal(siteData.organizationId);
        if (!org) {
            const error = new Error('Organización no encontrada');
            error.status = 404;
            error.code = 'ORGANIZATION_NOT_FOUND';
            throw error;
        }
        organizationUuid = org.id;
    }
    
    // Validar que el countryCode existe
    const country = await countryRepository.findCountryByCode(siteData.countryCode);
    if (!country) {
        const error = new Error('País no encontrado');
        error.status = 404;
        error.code = 'COUNTRY_NOT_FOUND';
        throw error;
    }
    
    // Generar identificadores usando el helper centralizado
    const uuid = uuidv7();
    const humanId = await generateHumanId(Site, null, null);
    const publicCode = generatePublicCode('SITE');
    
    const identifiers = {
        id: uuid,
        humanId,
        publicCode
    };
    
    // Crear site
    const site = await siteRepository.createSite({
        ...siteData,
        organizationId: organizationUuid,
        ...identifiers
    });
    
    // Audit log
    await logAuditAction({
        entityType: 'site',
        entityId: site.id,
        action: 'create',
        performedBy: userId,
        changes: { new: site },
        metadata: {
            organizationId: organizationUuid,
            countryCode: siteData.countryCode
        },
        ipAddress: ipAddress,
        userAgent: userAgent
    });
    
    // Invalidar cache
    await invalidateSiteCache();
    
    logger.info({ siteId: site.id, userId }, 'Site created successfully');
    
    return site;
};

/**
 * Obtener site por publicCode
 * @param {string} publicCode - Public code del site
 * @returns {Promise<Object>} - Site encontrado
 */
export const getSiteByPublicCode = async (publicCode) => {
    const site = await siteRepository.findSiteByPublicCode(publicCode);
    
    if (!site) {
        const error = new Error('Site no encontrado');
        error.status = 404;
        error.code = 'SITE_NOT_FOUND';
        throw error;
    }
    
    return site;
};

/**
 * Listar sites con filtros y paginación
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Object>} - Lista de sites paginada
 */
export const listSites = async (filters) => {
    const { showAll = false } = filters;
    
    // En modo showAll (God View), no filtramos por organización
    if (showAll) {
        // Preparar filtros para el repository sin organización
        const repoFilters = { ...filters, showAll: true };
        delete repoFilters.organizationId;
        delete repoFilters.organizationIds;
        
        return await siteRepository.listSites(repoFilters);
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
    
    // Generar cache key basada en filtros
    const cacheKey = JSON.stringify({
        ...filters,
        organizationId: organizationUuid,
        organizationIds: organizationUuids
    });
    
    // Intentar obtener del cache
    const cached = await getCachedSiteList(cacheKey);
    if (cached) {
        return cached;
    }
    
    // Preparar filtros para el repository
    const repoFilters = {
        ...filters,
        organizationId: organizationUuid,
        organizationIds: organizationUuids
    };

    // Obtener de BD
    const result = await siteRepository.listSites(repoFilters);
    
    // Cachear resultado
    await cacheSiteList(cacheKey, result);
    
    return result;
};

/**
 * Actualizar site
 * @param {string} publicCode - Public code del site
 * @param {Object} updateData - Datos a actualizar
 * @param {string} userId - ID del usuario que actualiza
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Site actualizado
 */
export const updateSite = async (publicCode, updateData, userId, ipAddress, userAgent) => {
    // Obtener site actual
    const siteInternal = await siteRepository.findSiteByPublicCodeInternal(publicCode);
    
    if (!siteInternal) {
        const error = new Error('Site no encontrado');
        error.status = 404;
        error.code = 'SITE_NOT_FOUND';
        throw error;
    }
    
    // Si se actualiza countryCode, validar que existe
    if (updateData.countryCode) {
        const country = await countryRepository.findCountryByCode(updateData.countryCode);
        if (!country) {
            const error = new Error('País no encontrado');
            error.status = 404;
            error.code = 'COUNTRY_NOT_FOUND';
            throw error;
        }
    }
    
    // Guardar estado anterior para audit
    const oldData = { ...siteInternal.dataValues };
    
    // Actualizar site
    const updatedSite = await siteRepository.updateSite(siteInternal.id, updateData);
    
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
        entityType: 'site',
        entityId: updatedSite.id,
        action: 'update',
        performedBy: userId,
        changes,
        metadata: {
            organizationId: siteInternal.organizationId
        },
        ipAddress: ipAddress,
        userAgent: userAgent
    });
    
    // Invalidar cache
    await invalidateSiteCache();
    
    logger.info({ siteId: updatedSite.id, userId }, 'Site updated successfully');
    
    return updatedSite;
};

/**
 * Eliminar site (soft delete)
 * @param {string} publicCode - Public code del site
 * @param {string} userId - ID del usuario que elimina
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<boolean>} - true si se eliminó
 */
export const deleteSite = async (publicCode, userId, ipAddress, userAgent) => {
    // Obtener site actual
    const siteInternal = await siteRepository.findSiteByPublicCodeInternal(publicCode);
    
    if (!siteInternal) {
        const error = new Error('Site no encontrado');
        error.status = 404;
        error.code = 'SITE_NOT_FOUND';
        throw error;
    }
    
    // Eliminar (soft delete)
    const deleted = await siteRepository.deleteSite(siteInternal.id);
    
    if (deleted) {
        // Audit log
        await logAuditAction({
            entityType: 'site',
            entityId: siteInternal.id,
            action: 'delete',
            performedBy: userId,
            changes: {
                deletedAt: {
                    old: null,
                    new: new Date()
                }
            },
            metadata: {
                organizationId: siteInternal.organizationId
            },
            ipAddress: ipAddress,
            userAgent: userAgent
        });
        
        // Invalidar cache
        await invalidateSiteCache();
        
        logger.info({ siteId: siteInternal.id, userId }, 'Site deleted successfully');
    }
    
    return deleted;
};
