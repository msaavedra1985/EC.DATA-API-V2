// modules/sites/services.js
// Lógica de negocio para Sites

import { v7 as uuidv7 } from 'uuid';
import Hashids from 'hashids';
import * as siteRepository from './repository.js';
import * as organizationRepository from '../organizations/repository.js';
import * as countryRepository from '../countries/repository.js';
import { cacheSiteList, getCachedSiteList, invalidateSiteCache } from './cache.js';
import { auditLog } from '../../helpers/audit.js';
import logger from '../../config/logger.js';

const hashids = new Hashids('ec-site-salt', 10);

/**
 * Generar identificadores para un nuevo site
 * @param {number} humanId - ID incremental del site
 * @returns {Object} - { id: UUID, human_id, public_code }
 */
const generateSiteIdentifiers = (humanId) => {
    const uuid = uuidv7();
    const hash = hashids.encode(humanId);
    const checksum = humanId % 10;
    const publicCode = `SITE-${hash}-${checksum}`;
    
    return {
        id: uuid,
        human_id: humanId,
        public_code: publicCode
    };
};

/**
 * Crear un nuevo site
 * @param {Object} siteData - Datos del site
 * @param {string} userId - ID del usuario que crea el site
 * @param {string} ipAddress - IP del usuario
 * @param {string} userAgent - User agent del usuario
 * @returns {Promise<Object>} - Site creado
 */
export const createSite = async (siteData, userId, ipAddress, userAgent) => {
    // Convertir organization_id de public_code a UUID si es necesario
    let organizationUuid = siteData.organization_id;
    if (!siteData.organization_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const org = await organizationRepository.findOrganizationByPublicCodeInternal(siteData.organization_id);
        if (!org) {
            const error = new Error('Organización no encontrada');
            error.status = 404;
            error.code = 'ORGANIZATION_NOT_FOUND';
            throw error;
        }
        organizationUuid = org.id;
    }
    
    // Validar que el country_id existe
    const country = await countryRepository.findCountryById(siteData.country_id);
    if (!country) {
        const error = new Error('País no encontrado');
        error.status = 404;
        error.code = 'COUNTRY_NOT_FOUND';
        throw error;
    }
    
    // Generar human_id secuencial (esto requiere una secuencia o contador)
    // Por simplicidad, usamos timestamp + random
    const humanId = Date.now() % 1000000000;
    
    // Generar identificadores
    const identifiers = generateSiteIdentifiers(humanId);
    
    // Crear site
    const site = await siteRepository.createSite({
        ...siteData,
        organization_id: organizationUuid,
        ...identifiers
    });
    
    // Audit log
    await auditLog({
        entity_type: 'site',
        entity_id: site.id,
        action: 'create',
        performed_by: userId,
        changes: { new: site },
        metadata: {
            organization_id: organizationUuid,
            country_id: siteData.country_id
        },
        ip_address: ipAddress,
        user_agent: userAgent
    });
    
    // Invalidar cache
    await invalidateSiteCache();
    
    logger.info({ siteId: site.id, userId }, 'Site created successfully');
    
    return site;
};

/**
 * Obtener site por public_code
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
    
    // Generar cache key basada en filtros
    const cacheKey = JSON.stringify({
        ...filters,
        organization_id: organizationUuid
    });
    
    // Intentar obtener del cache
    const cached = await getCachedSiteList(cacheKey);
    if (cached) {
        return cached;
    }
    
    // Obtener de BD
    const result = await siteRepository.listSites({
        ...filters,
        organization_id: organizationUuid
    });
    
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
    
    // Si se actualiza country_id, validar que existe
    if (updateData.country_id) {
        const country = await countryRepository.findCountryById(updateData.country_id);
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
    
    await auditLog({
        entity_type: 'site',
        entity_id: updatedSite.id,
        action: 'update',
        performed_by: userId,
        changes,
        metadata: {
            organization_id: siteInternal.organization_id
        },
        ip_address: ipAddress,
        user_agent: userAgent
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
        await auditLog({
            entity_type: 'site',
            entity_id: siteInternal.id,
            action: 'delete',
            performed_by: userId,
            changes: {
                deleted_at: {
                    old: null,
                    new: new Date()
                }
            },
            metadata: {
                organization_id: siteInternal.organization_id
            },
            ip_address: ipAddress,
            user_agent: userAgent
        });
        
        // Invalidar cache
        await invalidateSiteCache();
        
        logger.info({ siteId: siteInternal.id, userId }, 'Site deleted successfully');
    }
    
    return deleted;
};
