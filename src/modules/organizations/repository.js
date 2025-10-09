import Organization from './models/Organization.js';
import { generateUuidV7, generateHumanId, generatePublicCode } from '../../utils/identifiers.js';

/**
 * Repository para Organizations
 * Capa de acceso a datos con lógica de generación de identificadores
 */

/**
 * Crear nueva organización con identificadores UUID v7
 * 
 * @param {Object} data - Datos de la organización
 * @returns {Promise<Object>} - Organización creada (sin campos sensibles)
 */
export const createOrganization = async (data) => {
    // Generar UUID v7
    const id = generateUuidV7();
    
    // Generar human_id (scope global para organizations)
    const humanId = await generateHumanId(Organization, null, null);
    
    // Generar public_code con prefijo ORG-
    const publicCode = generatePublicCode('ORG', humanId);
    
    // Crear organización
    const organization = await Organization.create({
        id,
        human_id: humanId,
        public_code: publicCode,
        ...data
    });
    
    // Retornar sin campos sensibles
    return {
        id: organization.id,
        public_code: organization.public_code,
        human_id: organization.human_id,
        slug: organization.slug,
        name: organization.name,
        country_id: organization.country_id,
        tax_id: organization.tax_id,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        settings: organization.settings,
        is_active: organization.is_active,
        created_at: organization.created_at,
        updated_at: organization.updated_at
    };
};

/**
 * Buscar organización por public_code
 * 
 * @param {string} publicCode - public_code de la organización
 * @returns {Promise<Object|null>} - Organización o null
 */
export const findOrganizationByPublicCode = async (publicCode) => {
    const organization = await Organization.findOne({
        where: { public_code: publicCode }
    });
    
    if (!organization) {
        return null;
    }
    
    return {
        id: organization.id,
        public_code: organization.public_code,
        human_id: organization.human_id,
        slug: organization.slug,
        name: organization.name,
        country_id: organization.country_id,
        tax_id: organization.tax_id,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        settings: organization.settings,
        is_active: organization.is_active,
        created_at: organization.created_at,
        updated_at: organization.updated_at
    };
};

/**
 * Buscar organización por human_id (solo uso interno/admin)
 * 
 * @param {number} humanId - human_id de la organización
 * @returns {Promise<Object|null>} - Organización o null
 */
export const findOrganizationByHumanId = async (humanId) => {
    const organization = await Organization.findOne({
        where: { human_id: humanId }
    });
    
    if (!organization) {
        return null;
    }
    
    return {
        id: organization.id,
        public_code: organization.public_code,
        human_id: organization.human_id,
        slug: organization.slug,
        name: organization.name,
        country_id: organization.country_id,
        tax_id: organization.tax_id,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        settings: organization.settings,
        is_active: organization.is_active,
        created_at: organization.created_at,
        updated_at: organization.updated_at
    };
};

/**
 * Buscar organización por ID (UUID v7)
 * 
 * @param {string} id - UUID de la organización
 * @returns {Promise<Object|null>} - Organización o null
 */
export const findOrganizationById = async (id) => {
    const organization = await Organization.findByPk(id);
    
    if (!organization) {
        return null;
    }
    
    return {
        id: organization.id,
        public_code: organization.public_code,
        human_id: organization.human_id,
        slug: organization.slug,
        name: organization.name,
        country_id: organization.country_id,
        tax_id: organization.tax_id,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        settings: organization.settings,
        is_active: organization.is_active,
        created_at: organization.created_at,
        updated_at: organization.updated_at
    };
};

/**
 * Buscar organización por slug
 * 
 * @param {string} slug - Slug de la organización
 * @returns {Promise<Object|null>} - Organización o null
 */
export const findOrganizationBySlug = async (slug) => {
    const organization = await Organization.findOne({
        where: { slug }
    });
    
    if (!organization) {
        return null;
    }
    
    return {
        id: organization.id,
        public_code: organization.public_code,
        human_id: organization.human_id,
        slug: organization.slug,
        name: organization.name,
        country_id: organization.country_id,
        tax_id: organization.tax_id,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        settings: organization.settings,
        is_active: organization.is_active,
        created_at: organization.created_at,
        updated_at: organization.updated_at
    };
};

/**
 * Listar organizaciones con paginación
 * 
 * @param {number} limit - Límite de resultados
 * @param {number} offset - Offset para paginación
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Object>} - Lista de organizaciones y total
 */
export const listOrganizations = async (limit = 50, offset = 0, filters = {}) => {
    const where = {};
    
    if (filters.is_active !== undefined) {
        where.is_active = filters.is_active;
    }
    
    if (filters.country_id) {
        where.country_id = filters.country_id;
    }
    
    const { count, rows } = await Organization.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']]
    });
    
    return {
        total: count,
        organizations: rows.map(org => ({
            id: org.id,
            public_code: org.public_code,
            human_id: org.human_id,
            slug: org.slug,
            name: org.name,
            country_id: org.country_id,
            is_active: org.is_active,
            created_at: org.created_at,
            updated_at: org.updated_at
        }))
    };
};

/**
 * Actualizar organización
 * 
 * @param {string} id - ID de la organización
 * @param {Object} updates - Datos a actualizar
 * @returns {Promise<Object>} - Organización actualizada
 */
export const updateOrganization = async (id, updates) => {
    const organization = await Organization.findByPk(id);
    
    if (!organization) {
        return null;
    }
    
    // No permitir actualizar id, human_id, o public_code
    delete updates.id;
    delete updates.human_id;
    delete updates.public_code;
    
    await organization.update(updates);
    
    return {
        id: organization.id,
        public_code: organization.public_code,
        human_id: organization.human_id,
        slug: organization.slug,
        name: organization.name,
        country_id: organization.country_id,
        tax_id: organization.tax_id,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        settings: organization.settings,
        is_active: organization.is_active,
        created_at: organization.created_at,
        updated_at: organization.updated_at
    };
};

/**
 * Soft delete de organización
 * 
 * @param {string} id - ID de la organización
 * @returns {Promise<boolean>} - true si se eliminó
 */
export const deleteOrganization = async (id) => {
    const organization = await Organization.findByPk(id);
    
    if (!organization) {
        return false;
    }
    
    await organization.destroy(); // Soft delete por paranoid: true
    
    return true;
};

/**
 * Obtener organización raíz (EC.DATA)
 * 
 * @returns {Promise<Object|null>} - Organización raíz o null
 */
export const getRootOrganization = async () => {
    const organization = await Organization.findOne({
        where: { parent_id: null }
    });
    
    if (!organization) {
        return null;
    }
    
    return {
        id: organization.id,
        public_code: organization.public_code,
        human_id: organization.human_id,
        slug: organization.slug,
        name: organization.name,
        parent_id: organization.parent_id,
        logo_url: organization.logo_url,
        description: organization.description,
        config: organization.config,
        is_active: organization.is_active,
        created_at: organization.created_at
    };
};

/**
 * Obtener hijos directos de una organización
 * 
 * @param {string} parentId - ID de la organización padre
 * @returns {Promise<Array>} - Lista de organizaciones hijas
 */
export const getChildOrganizations = async (parentId) => {
    const organizations = await Organization.findAll({
        where: { parent_id: parentId, is_active: true },
        order: [['name', 'ASC']]
    });
    
    return organizations.map(org => ({
        id: org.id,
        public_code: org.public_code,
        human_id: org.human_id,
        slug: org.slug,
        name: org.name,
        parent_id: org.parent_id,
        logo_url: org.logo_url,
        is_active: org.is_active
    }));
};

/**
 * Obtener todos los descendientes de una organización (recursivo)
 * 
 * @param {string} organizationId - ID de la organización
 * @returns {Promise<Array>} - Lista de IDs de descendientes
 */
export const getOrganizationDescendants = async (organizationId) => {
    const descendants = [];
    
    // Obtener hijos directos
    const children = await Organization.findAll({
        where: { parent_id: organizationId },
        attributes: ['id']
    });
    
    // Agregar hijos a la lista
    for (const child of children) {
        descendants.push(child.id);
        
        // Recursivamente obtener descendientes de cada hijo
        const childDescendants = await getOrganizationDescendants(child.id);
        descendants.push(...childDescendants);
    }
    
    return descendants;
};
