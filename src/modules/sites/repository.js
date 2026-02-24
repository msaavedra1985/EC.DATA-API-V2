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
                attributes: ['id', 'publicCode', 'slug', 'name', 'logoUrl']
            },
            {
                model: Country,
                as: 'country',
                attributes: ['id', 'isoAlpha2', 'isoAlpha3', 'phoneCode']
            }
        ]
    });
    
    return toPublicSiteDto(site);
};

/**
 * Buscar site por ID público (publicCode)
 * Retorna DTO público - uso externo
 * @param {string} publicCode - Public code del site (ej: SITE-abc123-1)
 * @returns {Promise<Object|null>} - Site DTO o null
 */
export const findSiteByPublicCode = async (publicCode) => {
    const site = await Site.findOne({
        where: { publicCode },
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'publicCode', 'slug', 'name', 'logoUrl']
            },
            {
                model: Country,
                as: 'country',
                attributes: ['id', 'isoAlpha2', 'isoAlpha3', 'phoneCode']
            }
        ]
    });
    
    if (!site) {
        return null;
    }
    
    return toPublicSiteDto(site);
};

/**
 * Buscar site por ID público (publicCode) - VERSIÓN INTERNA
 * Retorna modelo Sequelize completo - uso interno
 * @param {string} publicCode - Public code del site
 * @returns {Promise<Site|null>} - Modelo Site o null
 */
export const findSiteByPublicCodeInternal = async (publicCode) => {
    return await Site.findOne({
        where: { publicCode }
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
                attributes: ['id', 'publicCode', 'slug', 'name', 'logoUrl']
            },
            {
                model: Country,
                as: 'country',
                attributes: ['id', 'isoAlpha2', 'isoAlpha3', 'phoneCode']
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
 * Soporta filtro notInHierarchy para excluir sites ya en jerarquía
 * 
 * @param {Object} options - Opciones de filtrado y paginación
 * @param {boolean} options.notInHierarchy - Si true, excluye sites que ya están en resource_hierarchy
 * @returns {Promise<Object>} - { items: [...], total, page, limit }
 */
export const listSites = async ({ 
    organizationId,
    organizationIds,
    countryCode,
    isActive,
    city,
    notInHierarchy = false,
    limit = 20, 
    offset = 0 
}) => {
    // Si se requiere filtrar por notInHierarchy, usamos raw SQL
    if (notInHierarchy) {
        return await listSitesNotInHierarchy({
            organizationId,
            organizationIds,
            countryCode,
            isActive,
            city,
            limit,
            offset
        });
    }
    
    // Flujo normal con Sequelize ORM
    const where = {};
    
    if (organizationIds !== undefined && Array.isArray(organizationIds) && organizationIds.length > 0) {
        where.organizationId = { [Op.in]: organizationIds };
    } else if (organizationId !== undefined && organizationId !== null) {
        where.organizationId = organizationId;
    }
    
    if (countryCode !== undefined) {
        where.countryCode = countryCode;
    }
    
    if (isActive !== undefined) {
        where.isActive = isActive;
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
                attributes: ['id', 'publicCode', 'slug', 'name', 'logoUrl']
            },
            {
                model: Country,
                as: 'country',
                attributes: ['id', 'isoAlpha2', 'isoAlpha3', 'phoneCode']
            }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC'], ['id', 'ASC']],
        distinct: true
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
    organizationId,
    organizationIds,
    countryCode,
    isActive,
    city,
    limit = 20,
    offset = 0
}) => {
    const conditions = ['s.deleted_at IS NULL'];
    const bindings = [];
    let bindIndex = 1;
    
    // Filtros de organización
    if (organizationIds && Array.isArray(organizationIds) && organizationIds.length > 0) {
        conditions.push(`s.organization_id = ANY($${bindIndex}::uuid[])`);
        bindings.push(organizationIds);
        bindIndex++;
    } else if (organizationId) {
        conditions.push(`s.organization_id = $${bindIndex}`);
        bindings.push(organizationId);
        bindIndex++;
    }
    
    if (countryCode !== undefined) {
        conditions.push(`s.country_code = $${bindIndex}`);
        bindings.push(countryCode);
        bindIndex++;
    }
    
    if (isActive !== undefined) {
        conditions.push(`s.is_active = $${bindIndex}`);
        bindings.push(isActive);
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
    
    // Transformar resultados raw SQL a formato DTO camelCase
    // NOTA: raw queries devuelven columnas DB en snake_case
    const items = dataResult.map(row => ({
        id: row.public_code,
        name: row.name,
        siteType: row.site_type,
        address: row.address,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        latitude: row.latitude,
        longitude: row.longitude,
        timezone: row.timezone,
        contactName: row.contact_name,
        contactPhone: row.contact_phone,
        contactEmail: row.contact_email,
        metadata: row.metadata,
        isActive: row.is_active,
        organization: row.org_id_rel ? {
            id: row.org_public_code,
            slug: row.org_slug,
            name: row.org_name,
            logoUrl: row.org_logo_url
        } : null,
        country: row.country_code_rel ? {
            code: row.country_code_rel,
            isoAlpha3: row.country_iso_alpha3,
            phoneCode: row.country_phone_code
        } : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
    
    return {
        items,
        total,
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit)
    };
};
