// modules/sites/repository.js
// Capa de acceso a datos para Sites

import { Op, QueryTypes } from 'sequelize';
import Site from './models/Site.js';
import Organization from '../organizations/models/Organization.js';
import Country from '../countries/models/Country.js';
import { toPublicSiteDto } from './helpers/serializers.js';
import sequelize from '../../db/sql/sequelize.js';

// Definir relaciones de Sequelize
Site.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization'
});

Site.belongsTo(Country, {
    foreignKey: 'countryCode',
    targetKey: 'isoAlpha2',
    as: 'country'
});

Organization.hasMany(Site, {
    foreignKey: 'organizationId',
    as: 'sites'
});

Country.hasMany(Site, {
    foreignKey: 'countryCode',
    sourceKey: 'isoAlpha2',
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
 * Soporta filtro not_in_hierarchy para excluir sites ya en jerarquía
 * 
 * @param {Object} options - Opciones de filtrado y paginación
 * @param {boolean} options.not_in_hierarchy - Si true, excluye sites que ya están en resource_hierarchy
 * @returns {Promise<Object>} - { items: [...], total, page, limit }
 */
export const listSites = async ({ 
    organization_id,
    organization_ids,
    country_code,
    is_active,
    city,
    not_in_hierarchy = false,
    limit = 20, 
    offset = 0 
}) => {
    // Si se requiere filtrar por not_in_hierarchy, usamos raw SQL
    if (not_in_hierarchy) {
        return await listSitesNotInHierarchy({
            organization_id,
            organization_ids,
            country_code,
            is_active,
            city,
            limit,
            offset
        });
    }
    
    // Flujo normal con Sequelize ORM
    const where = {};
    
    if (organization_ids !== undefined && Array.isArray(organization_ids) && organization_ids.length > 0) {
        where.organization_id = { [Op.in]: organization_ids };
    } else if (organization_id !== undefined && organization_id !== null) {
        where.organization_id = organization_id;
    }
    
    if (country_code !== undefined) {
        where.country_code = country_code;
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
        items: rows.map(site => toPublicSiteDto(site)),
        total: count,
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit)
    };
};

/**
 * Listar sites que NO están en ninguna jerarquía de recursos
 * Usa raw SQL con LEFT JOIN para filtrar eficientemente
 * 
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<Object>} - { items: [...], total, page, limit }
 */
const listSitesNotInHierarchy = async ({
    organization_id,
    organization_ids,
    country_code,
    is_active,
    city,
    limit = 20,
    offset = 0
}) => {
    const conditions = ['s.deleted_at IS NULL'];
    const bindings = [];
    let bindIndex = 1;
    
    // Filtros de organización
    if (organization_ids && Array.isArray(organization_ids) && organization_ids.length > 0) {
        conditions.push(`s.organization_id = ANY($${bindIndex}::uuid[])`);
        bindings.push(organization_ids);
        bindIndex++;
    } else if (organization_id) {
        conditions.push(`s.organization_id = $${bindIndex}`);
        bindings.push(organization_id);
        bindIndex++;
    }
    
    if (country_code !== undefined) {
        conditions.push(`s.country_code = $${bindIndex}`);
        bindings.push(country_code);
        bindIndex++;
    }
    
    if (is_active !== undefined) {
        conditions.push(`s.is_active = $${bindIndex}`);
        bindings.push(is_active);
        bindIndex++;
    }
    
    if (city) {
        conditions.push(`s.city ILIKE $${bindIndex}`);
        bindings.push(`%${city}%`);
        bindIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Query para contar total
    const countQuery = `
        SELECT COUNT(DISTINCT s.id) as total
        FROM sites s
        LEFT JOIN resource_hierarchy rh 
            ON rh.reference_id = s.public_code 
            AND rh.node_type = 'site' 
            AND rh.deleted_at IS NULL
        WHERE ${whereClause}
          AND rh.id IS NULL
    `;
    
    // Query para obtener datos con relaciones
    const dataQuery = `
        SELECT 
            s.*,
            o.id as org_id_rel,
            o.public_code as org_public_code,
            o.slug as org_slug,
            o.name as org_name,
            o.logo_url as org_logo_url,
            c.iso_alpha2 as country_code_rel,
            c.iso_alpha3 as country_iso_alpha3,
            c.phone_code as country_phone_code
        FROM sites s
        LEFT JOIN resource_hierarchy rh 
            ON rh.reference_id = s.public_code 
            AND rh.node_type = 'site' 
            AND rh.deleted_at IS NULL
        LEFT JOIN organizations o ON s.organization_id = o.id
        LEFT JOIN countries c ON s.country_code = c.iso_alpha2
        WHERE ${whereClause}
          AND rh.id IS NULL
        ORDER BY s.created_at DESC
        LIMIT $${bindIndex} OFFSET $${bindIndex + 1}
    `;
    
    const countBindings = [...bindings];
    const dataBindings = [...bindings, parseInt(limit), parseInt(offset)];
    
    const [countResult, dataResult] = await Promise.all([
        sequelize.query(countQuery, { bind: countBindings, type: QueryTypes.SELECT }),
        sequelize.query(dataQuery, { bind: dataBindings, type: QueryTypes.SELECT })
    ]);
    
    const total = parseInt(countResult[0]?.total || 0);
    
    // Transformar resultados a formato DTO
    const items = dataResult.map(row => ({
        id: row.public_code,
        name: row.name,
        site_type: row.site_type,
        address: row.address,
        city: row.city,
        state: row.state,
        postal_code: row.postal_code,
        latitude: row.latitude,
        longitude: row.longitude,
        timezone: row.timezone,
        contact_name: row.contact_name,
        contact_phone: row.contact_phone,
        contact_email: row.contact_email,
        metadata: row.metadata,
        is_active: row.is_active,
        organization: row.org_id_rel ? {
            id: row.org_public_code,
            slug: row.org_slug,
            name: row.org_name,
            logo_url: row.org_logo_url
        } : null,
        country: row.country_code_rel ? {
            code: row.country_code_rel,
            iso_alpha3: row.country_iso_alpha3,
            phone_code: row.country_phone_code
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
