// helpers/serializers.js
// Sistema de DTOs para serialización segura de respuestas API
// CRITICAL: Nunca exponer UUIDs internos o human_id en APIs públicas

/**
 * Serializa una organización para consumo público (API externa)
 * 
 * POLÍTICA DE SEGURIDAD:
 * - 'id' SIEMPRE es public_code (nunca UUID interno)
 * - 'human_id' NUNCA se expone (solo uso interno/soporte)
 * - Relaciones (parent, etc.) usan public_code, no UUIDs
 * - Previene ataques de enumeración
 * 
 * @param {Object} org - Modelo de organización de Sequelize
 * @param {Object} options - Opciones de serialización
 * @param {boolean} options.includeParent - Incluir datos del parent (default: false)
 * @param {boolean} options.includeTimestamps - Incluir created_at/updated_at (default: true)
 * @returns {Object} - DTO público seguro
 * 
 * @example
 * const publicOrg = toPublicOrganizationDto(org, { includeParent: true });
 * // {
 * //   id: "ORG-7K9D2-X",  // public_code, NO UUID
 * //   slug: "ec-data",
 * //   name: "EC.DATA",
 * //   parent: { id: "ORG-ABC12-Y", slug: "global-corp" },
 * //   ...
 * // }
 */
export const toPublicOrganizationDto = (org, options = {}) => {
    const {
        includeParent = false,
        includeTimestamps = true
    } = options;

    if (!org) {
        return null;
    }

    const dto = {
        // ID PÚBLICO (public_code, NO el UUID interno)
        id: org.public_code,
        
        // Datos básicos
        slug: org.slug,
        name: org.name,
        description: org.description || null,
        
        // Metadata
        logo_url: org.logo_url || null,
        website: org.website || null,
        country_id: org.country_id || null,
        
        // Estado
        is_active: org.is_active
    };

    // Parent organization (si está incluido en la query)
    if (includeParent && org.parent) {
        dto.parent = {
            id: org.parent.public_code,  // public_code del parent
            slug: org.parent.slug,
            name: org.parent.name
        };
    } else if (org.parent_id) {
        // Si tenemos parent_id pero no el objeto, indicar que existe
        dto.has_parent = true;
    }

    // Timestamps (opcional)
    if (includeTimestamps) {
        dto.created_at = org.created_at;
        dto.updated_at = org.updated_at;
    }

    return dto;
};

/**
 * Serializa una organización para uso administrativo/interno
 * 
 * SOLO USAR EN ENDPOINTS ADMIN (system-admin, soporte)
 * Expone identificadores internos para debugging y operaciones administrativas
 * 
 * @param {Object} org - Modelo de organización de Sequelize
 * @param {Object} options - Opciones de serialización
 * @returns {Object} - DTO administrativo con datos internos
 */
export const toAdminOrganizationDto = (org, options = {}) => {
    if (!org) {
        return null;
    }

    // Incluir todo del DTO público
    const publicDto = toPublicOrganizationDto(org, options);

    // Agregar campos internos para admin
    return {
        ...publicDto,
        
        // Identificadores internos (SOLO ADMIN)
        internal_id: org.id,           // UUID interno
        human_id: org.human_id,        // ID incremental
        
        // Parent UUID interno (para operaciones admin)
        parent_internal_id: org.parent_id || null,
        
        // Metadata adicional
        deleted_at: org.deleted_at || null
    };
};

/**
 * Serializa una lista de organizaciones para consumo público
 * 
 * @param {Array} organizations - Array de modelos de organización
 * @param {Object} options - Opciones de serialización
 * @returns {Array} - Array de DTOs públicos
 */
export const toPublicOrganizationListDto = (organizations, options = {}) => {
    if (!Array.isArray(organizations)) {
        return [];
    }

    return organizations.map(org => toPublicOrganizationDto(org, options));
};

/**
 * Serializa un usuario para consumo público (API externa)
 * 
 * POLÍTICA DE SEGURIDAD:
 * - 'id' SIEMPRE es public_code (nunca UUID interno)
 * - 'password_hash' NUNCA se expone
 * - 'human_id' NUNCA se expone
 * - Datos sensibles (email completo) solo si es el propio usuario
 * 
 * @param {Object} user - Modelo de usuario de Sequelize
 * @param {Object} options - Opciones de serialización
 * @param {boolean} options.isSelf - Es el propio usuario (muestra más datos)
 * @param {boolean} options.includeRole - Incluir información del rol
 * @param {boolean} options.includeOrganization - Incluir organización primaria
 * @returns {Object} - DTO público seguro
 */
export const toPublicUserDto = (user, options = {}) => {
    const {
        isSelf = false,
        includeRole = true,
        includeOrganization = false
    } = options;

    if (!user) {
        return null;
    }

    const dto = {
        // ID PÚBLICO (public_code, NO el UUID interno)
        id: user.public_code,
        
        // Nombre público
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name} ${user.last_name}`.trim(),
        
        // Estado
        is_active: user.is_active
    };

    // Email: solo completo si es el propio usuario, sino parcialmente oculto
    if (isSelf) {
        dto.email = user.email;
        dto.email_verified = !!user.email_verified_at;
        dto.last_login_at = user.last_login_at;
    } else {
        // Ocultar email parcialmente (ej: "j***@example.com")
        const [localPart, domain] = (user.email || '').split('@');
        if (localPart && domain) {
            const masked = localPart[0] + '***';
            dto.email_masked = `${masked}@${domain}`;
        }
    }

    // Rol (si está incluido)
    if (includeRole && user.role) {
        dto.role = {
            name: user.role.name,
            description: user.role.description
        };
    }

    // Organización primaria (si está incluida)
    if (includeOrganization && user.organization) {
        dto.organization = toPublicOrganizationDto(user.organization, { includeTimestamps: false });
    }

    return dto;
};

/**
 * Serializa un usuario para uso administrativo/interno
 * 
 * SOLO USAR EN ENDPOINTS ADMIN (system-admin, soporte)
 * 
 * @param {Object} user - Modelo de usuario de Sequelize
 * @returns {Object} - DTO administrativo con datos internos
 */
export const toAdminUserDto = (user) => {
    if (!user) {
        return null;
    }

    const publicDto = toPublicUserDto(user, { isSelf: true, includeRole: true });

    return {
        ...publicDto,
        
        // Identificadores internos (SOLO ADMIN)
        internal_id: user.id,          // UUID interno
        human_id: user.human_id,       // ID incremental
        
        // Relaciones internas
        role_id: user.role_id,
        organization_internal_id: user.organization_id,
        
        // Metadata completa
        created_at: user.created_at,
        updated_at: user.updated_at,
        deleted_at: user.deleted_at || null
    };
};

/**
 * Helper genérico para convertir relaciones parent a formato público
 * Reutilizable para cualquier entidad con parent_id
 * 
 * @param {Object} entity - Entidad con parent
 * @param {string} publicCodeField - Nombre del campo public_code (default: 'public_code')
 * @returns {Object|null} - Parent serializado o null
 */
export const serializeParentRelation = (entity, publicCodeField = 'public_code') => {
    if (!entity || !entity.parent) {
        return null;
    }

    return {
        id: entity.parent[publicCodeField],
        slug: entity.parent.slug,
        name: entity.parent.name
    };
};

/**
 * Helper para validar y convertir public_code a UUID interno
 * Usar en endpoints que reciben IDs en la URL o body
 * 
 * @param {Object} Model - Modelo de Sequelize
 * @param {string} publicCode - public_code recibido del cliente
 * @param {string} errorMessage - Mensaje de error personalizado
 * @returns {Promise<Object>} - Entidad encontrada
 * @throws {Error} - Si no se encuentra la entidad
 */
export const resolvePublicCode = async (Model, publicCode, errorMessage = 'Entity not found') => {
    const entity = await Model.findOne({
        where: { public_code: publicCode }
    });

    if (!entity) {
        const error = new Error(errorMessage);
        error.status = 404;
        error.code = 'NOT_FOUND';
        throw error;
    }

    return entity;
};

/**
 * Helper para validar y convertir slug a UUID interno
 * Usar como alternativa a public_code
 * 
 * @param {Object} Model - Modelo de Sequelize
 * @param {string} slug - slug recibido del cliente
 * @param {string} errorMessage - Mensaje de error personalizado
 * @returns {Promise<Object>} - Entidad encontrada
 * @throws {Error} - Si no se encuentra la entidad
 */
export const resolveSlug = async (Model, slug, errorMessage = 'Entity not found') => {
    const entity = await Model.findOne({
        where: { slug }
    });

    if (!entity) {
        const error = new Error(errorMessage);
        error.status = 404;
        error.code = 'NOT_FOUND';
        throw error;
    }

    return entity;
};

export default {
    // Organizations
    toPublicOrganizationDto,
    toAdminOrganizationDto,
    toPublicOrganizationListDto,
    
    // Users
    toPublicUserDto,
    toAdminUserDto,
    
    // Helpers
    serializeParentRelation,
    resolvePublicCode,
    resolveSlug
};
