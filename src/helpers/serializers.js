// helpers/serializers.js
// Sistema de DTOs para serialización segura de respuestas API
// CRITICAL: Nunca exponer UUIDs internos o human_id en APIs públicas

/**
 * Serializa una organización para consumo público (API externa)
 * 
 * POLÍTICA DE SEGURIDAD:
 * - 'id' SIEMPRE es publicCode (nunca UUID interno)
 * - 'humanId' NUNCA se expone (solo uso interno/soporte)
 * - Relaciones (parent, etc.) usan publicCode, no UUIDs
 * - Previene ataques de enumeración
 * 
 * @param {Object} org - Modelo de organización de Sequelize
 * @param {Object} options - Opciones de serialización
 * @param {boolean} options.includeParent - Incluir datos del parent (default: false)
 * @param {boolean} options.includeTimestamps - Incluir createdAt/updatedAt (default: true)
 * @returns {Object} - DTO público seguro
 * 
 * @example
 * const publicOrg = toPublicOrganizationDto(org, { includeParent: true });
 * // {
 * //   id: "ORG-7K9D2-X",  // publicCode, NO UUID
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
        // ID PÚBLICO (publicCode, NO el UUID interno)
        id: org.publicCode,
        
        // Datos básicos
        slug: org.slug,
        name: org.name,
        description: org.description || null,
        
        // Metadata
        logoUrl: org.logoUrl || null,
        website: org.website || null,
        
        // Países asociados (relación muchos-a-muchos)
        countries: (org.countries || []).map(oc => ({
            code: oc.countryCode,
            isPrimary: oc.isPrimary
        })),
        primaryCountry: (() => {
            const countries = org.countries || [];
            const primary = countries.find(c => c.isPrimary);
            return primary ? primary.countryCode : (countries.length > 0 ? countries[0].countryCode : null);
        })(),
        
        // Estado
        isActive: org.isActive
    };

    // Parent organization (si está incluido en la query)
    if (includeParent && org.parent) {
        dto.parent = {
            id: org.parent.publicCode,  // publicCode del parent
            slug: org.parent.slug,
            name: org.parent.name
        };
    } else if (org.parentId) {
        // Si tenemos parentId pero no el objeto, indicar que existe
        dto.hasParent = true;
    }

    // Timestamps (opcional)
    if (includeTimestamps) {
        dto.createdAt = org.createdAt;
        dto.updatedAt = org.updatedAt;
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
        internalId: org.id,           // UUID interno
        humanId: org.humanId,        // ID incremental
        
        // Parent UUID interno (para operaciones admin)
        parentInternalId: org.parentId || null,
        
        // Metadata adicional
        deletedAt: org.deletedAt || null
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
 * - 'id' SIEMPRE es publicCode (nunca UUID interno)
 * - 'passwordHash' NUNCA se expone
 * - 'humanId' NUNCA se expone
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
        // ID PÚBLICO (publicCode, NO el UUID interno)
        id: user.publicCode,
        
        // Nombre público
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        
        // Estado
        isActive: user.isActive
    };

    // Email: solo completo si es el propio usuario, sino parcialmente oculto
    if (isSelf) {
        dto.email = user.email;
        dto.emailVerified = !!user.emailVerifiedAt;
        dto.lastLoginAt = user.lastLoginAt;
        
        // Campos adicionales de perfil (solo para el propio usuario)
        dto.phone = user.phone || null;
        dto.language = user.language || 'es';
        dto.timezone = user.timezone || 'America/Argentina/Buenos_Aires';
        dto.avatarUrl = user.avatarUrl || null;
    } else {
        // Ocultar email parcialmente (ej: "j***@example.com")
        const [localPart, domain] = (user.email || '').split('@');
        if (localPart && domain) {
            const masked = localPart[0] + '***';
            dto.emailMasked = `${masked}@${domain}`;
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
        internalId: user.id,          // UUID interno
        humanId: user.humanId,       // ID incremental
        
        // Relaciones internas
        roleId: user.roleId,
        organizationInternalId: user.organizationId,
        
        // Metadata completa
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt || null
    };
};

/**
 * Helper genérico para convertir relaciones parent a formato público
 * Reutilizable para cualquier entidad con parentId
 * 
 * @param {Object} entity - Entidad con parent
 * @param {string} publicCodeField - Nombre del campo publicCode (default: 'publicCode')
 * @returns {Object|null} - Parent serializado o null
 */
export const serializeParentRelation = (entity, publicCodeField = 'publicCode') => {
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
 * Helper para validar y convertir publicCode a UUID interno
 * Usar en endpoints que reciben IDs en la URL o body
 * 
 * @param {Object} Model - Modelo de Sequelize
 * @param {string} publicCode - publicCode recibido del cliente
 * @param {string} errorMessage - Mensaje de error personalizado
 * @returns {Promise<Object>} - Entidad encontrada
 * @throws {Error} - Si no se encuentra la entidad
 */
export const resolvePublicCode = async (Model, publicCode, errorMessage = 'Entity not found') => {
    const entity = await Model.findOne({
        where: { publicCode }
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
 * Usar como alternativa a publicCode
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
