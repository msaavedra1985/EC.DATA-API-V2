// modules/users/repository.js
// Repositorio de usuarios - acceso a datos y serialización

import { Op } from 'sequelize';
import User from '../auth/models/User.js';
import Role from '../auth/models/Role.js';
import Organization from '../organizations/models/Organization.js';
import UserOrganization from '../auth/models/UserOrganization.js';
import { getCachedUser, cacheUser, invalidateUserCache, getCachedUserList, cacheUserList } from './cache.js';

/**
 * Serializa un modelo User a DTO público
 * NUNCA expone: passwordHash, id (UUID), humanId
 * SIEMPRE usa publicCode como "id"
 * 
 * @param {Object} user - Instancia de Sequelize User
 * @returns {Object} - DTO público para API responses
 */
export const toPublicUserDto = (user) => {
    if (!user) return null;
    
    const dto = {
        id: user.publicCode, // publicCode como "id" (NUNCA UUID)
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        emailVerified: user.emailVerifiedAt !== null,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
    
    // Campos opcionales
    if (user.phone) dto.phone = user.phone;
    if (user.avatarUrl) dto.avatarUrl = user.avatarUrl;
    if (user.language) dto.language = user.language;
    if (user.timezone) dto.timezone = user.timezone;
    
    // Incluir rol si está cargado
    if (user.role) {
        dto.role = {
            name: user.role.name,
            description: user.role.description
        };
    }
    
    // Incluir organización primaria si está cargada
    // Se carga desde UserOrganizations where isPrimary = true
    if (user.UserOrganizations && user.UserOrganizations.length > 0) {
        const primaryOrgRelation = user.UserOrganizations.find(uo => uo.isPrimary);
        if (primaryOrgRelation && primaryOrgRelation.organization) {
            dto.primaryOrganization = {
                id: primaryOrgRelation.organization.publicCode,
                name: primaryOrgRelation.organization.name,
                slug: primaryOrgRelation.organization.slug
            };
        }
        
        // Incluir todas las organizaciones del usuario (organizationMemberships)
        // Filtrar solo aquellas que tengan la organización cargada para evitar errores
        dto.organizationMemberships = user.UserOrganizations
            .filter(uo => uo.organization)
            .map(uo => ({
                id: uo.organization.publicCode,
                slug: uo.organization.slug,
                name: uo.organization.name,
                logoUrl: uo.organization.logoUrl,
                isPrimary: uo.isPrimary,
                joinedAt: uo.joinedAt
            }));
    } else {
        // Siempre incluir organizationMemberships, incluso si está vacío
        // Esto mantiene el contrato de la API consistente
        dto.organizationMemberships = [];
    }
    
    return dto;
};

/**
 * Serializa un modelo User a DTO admin (más datos internos)
 * Solo para system-admin - incluye metadata adicional
 * 
 * @param {Object} user - Instancia de Sequelize User
 * @returns {Object} - DTO admin con datos extendidos
 */
export const toAdminUserDto = (user) => {
    if (!user) return null;
    
    const publicDto = toPublicUserDto(user);
    
    return {
        ...publicDto,
        internalId: user.id, // UUID solo para admins
        humanId: user.humanId, // ID incremental solo para admins
        organizationId: user.organizationId, // UUID de org para queries
        roleId: user.roleId // UUID de role para queries
    };
};

/**
 * Buscar usuario por ID (publicCode o UUID)
 * Cache: 15 minutos | Key: user:{id}
 * 
 * @param {string} id - Public code o UUID del usuario
 * @param {boolean} includeRelations - Incluir role y organization
 * @param {boolean} useCache - Usar cache de Redis (default: true)
 * @returns {Promise<Object|null>} - Usuario o null si no existe
 */
export const findUserById = async (id, includeRelations = true, useCache = true) => {
    // Intentar desde cache
    if (useCache) {
        const cached = await getCachedUser(id);
        if (cached) return cached;
    }
    
    const where = {};
    
    // Detectar si es publicCode (formato: USR-XXX-XXX) o UUID
    if (/^USR-[A-Z2-9]{3}-[A-Z2-9]{3}$/.test(id)) {
        where.publicCode = id;
    } else {
        where.id = id;
    }
    
    const include = includeRelations ? [
        { model: Role, as: 'role' },
        {
            model: UserOrganization,
            as: 'UserOrganizations',
            where: { isPrimary: true },
            required: false, // LEFT JOIN para no excluir usuarios sin org primaria
            include: [
                {
                    model: Organization,
                    as: 'organization',
                    attributes: ['publicCode', 'name', 'slug']
                }
            ]
        }
    ] : [];
    
    const user = await User.findOne({
        where,
        include
    });
    
    if (!user) return null;
    
    const dto = toPublicUserDto(user);
    
    // Guardar en cache
    if (useCache) {
        await cacheUser(user.publicCode, dto);
    }
    
    return dto;
};

/**
 * Buscar usuario por email
 * 
 * @param {string} email - Email del usuario
 * @param {boolean} includeRelations - Incluir role y organization
 * @returns {Promise<Object|null>} - Usuario o null si no existe
 */
export const findUserByEmail = async (email, includeRelations = true) => {
    const include = includeRelations ? [
        { model: Role, as: 'role' },
        {
            model: UserOrganization,
            as: 'UserOrganizations',
            where: { isPrimary: true },
            required: false,
            include: [
                {
                    model: Organization,
                    as: 'organization',
                    attributes: ['publicCode', 'name', 'slug']
                }
            ]
        }
    ] : [];
    
    const user = await User.findOne({
        where: { email: email.toLowerCase().trim() },
        include
    });
    
    return user ? toPublicUserDto(user) : null;
};

/**
 * Listar usuarios con paginación y filtros
 * Cache: 5 minutos | Key: user:list:{limit}:{offset}:{filtersHash}
 * 
 * @param {number} limit - Límite de resultados
 * @param {number} offset - Offset para paginación
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Object>} - Lista de usuarios y total
 */
export const listUsers = async (limit = 50, offset = 0, filters = {}) => {
    // Intentar desde cache
    const cached = await getCachedUserList(limit, offset, filters);
    if (cached) return cached;
    
    const where = {};
    
    // Filtro de estado activo
    if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
    }
    
    // Filtro de scope - usuarios permitidos por organización
    if (filters.userIds && Array.isArray(filters.userIds)) {
        where.id = { [Op.in]: filters.userIds };
    }
    
    // Filtro por organización
    if (filters.organizationId) {
        where.organizationId = filters.organizationId;
    }
    
    // Filtro por rol
    if (filters.roleId) {
        where.roleId = filters.roleId;
    }
    
    // Búsqueda por nombre, apellido o email
    if (filters.search) {
        where[Op.or] = [
            { firstName: { [Op.iLike]: `%${filters.search}%` } },
            { lastName: { [Op.iLike]: `%${filters.search}%` } },
            { email: { [Op.iLike]: `%${filters.search}%` } }
        ];
    }
    
    const { count, rows } = await User.findAndCountAll({
        where,
        limit,
        offset,
        include: [
            { model: Role, as: 'role' },
            {
                model: UserOrganization,
                as: 'UserOrganizations',
                where: { isPrimary: true },
                required: false, // LEFT JOIN para no excluir usuarios sin org primaria
                include: [
                    {
                        model: Organization,
                        as: 'organization',
                        attributes: ['publicCode', 'name', 'slug']
                    }
                ]
            }
        ],
        order: [['createdAt', 'DESC'], ['id', 'ASC']],
        distinct: true
    });
    
    const result = {
        total: count,
        users: rows.map(user => toPublicUserDto(user))
    };
    
    // Guardar en cache
    await cacheUserList(limit, offset, filters, result);
    
    return result;
};

/**
 * Crear nuevo usuario
 * Invalidación de cache: lista de usuarios
 * 
 * @param {Object} userData - Datos del usuario
 * @returns {Promise<Object>} - Usuario creado (DTO)
 */
export const createUser = async (userData) => {
    const user = await User.create(userData);
    
    // Cargar relaciones
    await user.reload({
        include: [
            { model: Role, as: 'role' },
            {
                model: UserOrganization,
                as: 'UserOrganizations',
                where: { isPrimary: true },
                required: false,
                include: [
                    {
                        model: Organization,
                        as: 'organization',
                        attributes: ['publicCode', 'name', 'slug']
                    }
                ]
            }
        ]
    });
    
    const dto = toPublicUserDto(user);
    
    // Cachear usuario creado
    await cacheUser(user.publicCode, dto);
    
    return dto;
};

/**
 * Actualizar usuario existente
 * Invalidación de cache: usuario específico + listas
 * 
 * @param {string} userId - UUID del usuario
 * @param {Object} updateData - Datos a actualizar
 * @returns {Promise<Object>} - Usuario actualizado (DTO)
 */
export const updateUser = async (userId, updateData) => {
    const user = await User.findByPk(userId);
    
    if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
    }
    
    await user.update(updateData);
    
    // Recargar relaciones
    await user.reload({
        include: [
            { model: Role, as: 'role' },
            {
                model: UserOrganization,
                as: 'UserOrganizations',
                where: { isPrimary: true },
                required: false,
                include: [
                    {
                        model: Organization,
                        as: 'organization',
                        attributes: ['publicCode', 'name', 'slug']
                    }
                ]
            }
        ]
    });
    
    const dto = toPublicUserDto(user);
    
    // Invalidar cache del usuario
    await invalidateUserCache(user.publicCode);
    
    // Re-cachear con datos actualizados
    await cacheUser(user.publicCode, dto);
    
    return dto;
};

/**
 * Soft delete de usuario (isActive = false)
 * Invalidación de cache: usuario específico + listas
 * 
 * @param {string} userId - UUID del usuario
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
export const deleteUser = async (userId) => {
    const user = await User.findByPk(userId);
    
    if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
    }
    
    await user.update({ isActive: false });
    
    // Invalidar cache
    await invalidateUserCache(user.publicCode);
    
    return true;
};

/**
 * Obtener modelo User interno por ID (para operaciones internas)
 * NO usar en API responses - solo para lógica interna
 * 
 * @param {string} id - Public code o UUID
 * @param {boolean} includeRelations - Incluir relaciones
 * @returns {Promise<Object|null>} - Modelo Sequelize User o null
 */
export const getUserModelById = async (id, includeRelations = true) => {
    const where = {};
    
    if (/^USR-[A-Z2-9]{3}-[A-Z2-9]{3}$/.test(id)) {
        where.publicCode = id;
    } else {
        where.id = id;
    }
    
    const include = includeRelations ? [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization' }
    ] : [];
    
    return await User.findOne({ where, include });
};

/**
 * Obtener modelos User por lista de organization IDs
 * Helper para getUserScope en services.js
 * 
 * @param {Array<string>} organizationIds - Lista de UUIDs de organizaciones
 * @returns {Promise<Array>} - Lista de modelos User
 */
export const getUserModelsByOrganizations = async (organizationIds) => {
    return await User.findAll({
        where: {
            organizationId: { [Op.in]: organizationIds }
        },
        attributes: ['id']
    });
};

/**
 * Validar unicidad de email de usuario
 * Verifica si el email ya está en uso por otro usuario
 * 
 * @param {Object} options - Opciones de validación
 * @param {string} options.email - Email a validar
 * @param {string} [options.excludePublicCode] - Public code del usuario a excluir (para edición)
 * @returns {Promise<Object>} - { valid: boolean, conflict: boolean }
 */
export const validateEmailUniqueness = async ({ email, excludePublicCode }) => {
    // Buscar usuario con el email proporcionado (case-insensitive)
    const where = {
        email: { [Op.iLike]: email }
    };
    
    // Excluir usuario actual si se proporciona excludePublicCode
    if (excludePublicCode) {
        where.publicCode = { [Op.ne]: excludePublicCode };
    }
    
    const existingUser = await User.findOne({
        where,
        attributes: ['email']
    });
    
    // Si existe un usuario con ese email, hay conflicto
    const conflict = existingUser !== null;
    
    return {
        valid: !conflict,
        conflict
    };
};
