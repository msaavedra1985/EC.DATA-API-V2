// modules/sites/repository.js
// Capa de acceso a datos para Sites

import Site from './models/Site.js';
import Organization from '../organizations/models/Organization.js';
import Country from '../countries/models/Country.js';
import { toPublicSiteDto } from './helpers/serializers.js';

// Definir relaciones de Sequelize
Site.belongsTo(Organization, {
    foreignKey: 'organization_id',
    as: 'organization'
});

Site.belongsTo(Country, {
    foreignKey: 'country_id',
    as: 'country'
});

Organization.hasMany(Site, {
    foreignKey: 'organization_id',
    as: 'sites'
});

Country.hasMany(Site, {
    foreignKey: 'country_id',
    as: 'sites'
});

/**
 * Crear un nuevo site
 * @param {Object} siteData - Datos del site
 * @returns {Promise<Object>} - Site creado con DTO público
 */
export const createSite = async (siteData) => {
    const site = await Site.create(siteData);
    
    // Recargar con relaciones
    await site.reload({
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            },
            {
                model: Country,
                as: 'country',
                attributes: ['id', 'iso_alpha2', 'iso_alpha3', 'phone_code']
            }
        ]
    });
    
    return toPublicSiteDto(site);
};

/**
 * Buscar site por ID público (public_code)
 * Retorna DTO público - uso externo
 * @param {string} publicCode - Public code del site (ej: SITE-abc123-1)
 * @returns {Promise<Object|null>} - Site DTO o null
 */
export const findSiteByPublicCode = async (publicCode) => {
    const site = await Site.findOne({
        where: { public_code: publicCode },
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            },
            {
                model: Country,
                as: 'country',
                attributes: ['id', 'iso_alpha2', 'iso_alpha3', 'phone_code']
            }
        ]
    });
    
    if (!site) {
        return null;
    }
    
    return toPublicSiteDto(site);
};

/**
 * Buscar site por ID público (public_code) - VERSIÓN INTERNA
 * Retorna modelo Sequelize completo - uso interno
 * @param {string} publicCode - Public code del site
 * @returns {Promise<Site|null>} - Modelo Site o null
 */
export const findSiteByPublicCodeInternal = async (publicCode) => {
    return await Site.findOne({
        where: { public_code: publicCode }
    });
};

/**
 * Buscar site por UUID interno
 * Uso interno - NO exponer en APIs públicas
 * @param {string} id - UUID del site
 * @returns {Promise<Site|null>} - Modelo Site o null
 */
export const findSiteById = async (id) => {
    return await Site.findByPk(id);
};

/**
 * Actualizar site
 * @param {string} id - UUID interno del site
 * @param {Object} updateData - Datos a actualizar
 * @returns {Promise<Object>} - Site actualizado con DTO público
 */
export const updateSite = async (id, updateData) => {
    const site = await Site.findByPk(id);
    
    if (!site) {
        return null;
    }
    
    await site.update(updateData);
    
    // Recargar con relaciones
    await site.reload({
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            },
            {
                model: Country,
                as: 'country',
                attributes: ['id', 'iso_alpha2', 'iso_alpha3', 'phone_code']
            }
        ]
    });
    
    return toPublicSiteDto(site);
};

/**
 * Soft delete de site
 * @param {string} id - UUID interno del site
 * @returns {Promise<boolean>} - true si se eliminó
 */
export const deleteSite = async (id) => {
    const site = await Site.findByPk(id);
    
    if (!site) {
        return false;
    }
    
    await site.destroy(); // Soft delete por paranoid: true
    return true;
};

/**
 * Listar sites con filtros y paginación
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Promise<Object>} - { sites: [...], total, page, limit }
 */
export const listSites = async ({ 
    organization_id, 
    country_id,
    is_active,
    city,
    limit = 20, 
    offset = 0 
}) => {
    const where = {};
    
    if (organization_id !== undefined) {
        where.organization_id = organization_id;
    }
    
    if (country_id !== undefined) {
        where.country_id = country_id;
    }
    
    if (is_active !== undefined) {
        where.is_active = is_active;
    }
    
    if (city) {
        where.city = city;
    }
    
    const { count, rows } = await Site.findAndCountAll({
        where,
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url']
            },
            {
                model: Country,
                as: 'country',
                attributes: ['id', 'iso_alpha2', 'iso_alpha3', 'phone_code']
            }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
    });
    
    return {
        sites: rows.map(site => toPublicSiteDto(site)),
        total: count,
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit)
    };
};
