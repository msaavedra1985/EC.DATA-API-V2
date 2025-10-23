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
 * NUNCA expone: password_hash, id (UUID), human_id
 * SIEMPRE usa public_code como "id"
 * 
 * @param {Object} user - Instancia de Sequelize User
 * @returns {Object} - DTO público para API responses
 */
export const toPublicUserDto = (user) => {
    if (!user) return null;
    
    const dto = {
        id: user.public_code, // public_code como "id" (NUNCA UUID)
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active,
        email_verified: user.email_verified_at !== null,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at
    };
    
    // Campos opcionales
    if (user.phone) dto.phone = user.phone;
    if (user.avatar_url) dto.avatar_url = user.avatar_url;
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
    // Se carga desde UserOrganizations where is_primary = true
    if (user.UserOrganizations && user.UserOrganizations.length > 0) {
        const primaryOrgRelation = user.UserOrganizations.find(uo => uo.is_primary);
        if (primaryOrgRelation && primaryOrgRelation.organization) {
            dto.primary_organization = {
                id: primaryOrgRelation.organization.public_code,
                name: primaryOrgRelation.organization.name,
                slug: primaryOrgRelation.organization.slug
            };
        }
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
        internal_id: user.id, // UUID solo para admins
        human_id: user.human_id, // ID incremental solo para admins
        organization_id: user.organization_id, // UUID de org para queries
        role_id: user.role_id // UUID de role para queries
    };
};

/**
 * Buscar usuario por ID (public_code o UUID)
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
    
    // Detectar si es public_code (formato: USR-XXXXX-X) o UUID
    if (/^USR-[A-Z0-9]{5}-[A-Z0-9]$/.test(id)) {
        where.public_code = id;
    } else {
        where.id = id;
    }
    
    const include = includeRelations ? [
        { model: Role, as: 'role' },
        {
            model: UserOrganization,
            as: 'UserOrganizations',
            where: { is_primary: true },
            required: false, // LEFT JOIN para no excluir usuarios sin org primaria
            include: [
                {
                    model: Organization,
                    as: 'organization',
                    attributes: ['public_code', 'name', 'slug']
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
        await cacheUser(user.public_code, dto);
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
            where: { is_primary: true },
            required: false,
            include: [
                {
                    model: Organization,
                    as: 'organization',
                    attributes: ['public_code', 'name', 'slug']
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
    if (filters.is_active !== undefined) {
        where.is_active = filters.is_active;
    }
    
    // Filtro de scope - usuarios permitidos por organización
    if (filters.user_ids && Array.isArray(filters.user_ids)) {
        where.id = { [Op.in]: filters.user_ids };
    }
    
    // Filtro por organización
    if (filters.organization_id) {
        where.organization_id = filters.organization_id;
    }
    
    // Filtro por rol
    if (filters.role_id) {
        where.role_id = filters.role_id;
    }
    
    // Búsqueda por nombre, apellido o email
    if (filters.search) {
        where[Op.or] = [
            { first_name: { [Op.iLike]: `%${filters.search}%` } },
            { last_name: { [Op.iLike]: `%${filters.search}%` } },
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
                where: { is_primary: true },
                required: false, // LEFT JOIN para no excluir usuarios sin org primaria
                include: [
                    {
                        model: Organization,
                        as: 'organization',
                        attributes: ['public_code', 'name', 'slug']
                    }
                ]
            }
        ],
        order: [['created_at', 'DESC']]
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
                where: { is_primary: true },
                required: false,
                include: [
                    {
                        model: Organization,
                        as: 'organization',
                        attributes: ['public_code', 'name', 'slug']
                    }
                ]
            }
        ]
    });
    
    const dto = toPublicUserDto(user);
    
    // Cachear usuario creado
    await cacheUser(user.public_code, dto);
    
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
                where: { is_primary: true },
                required: false,
                include: [
                    {
                        model: Organization,
                        as: 'organization',
                        attributes: ['public_code', 'name', 'slug']
                    }
                ]
            }
        ]
    });
    
    const dto = toPublicUserDto(user);
    
    // Invalidar cache del usuario
    await invalidateUserCache(user.public_code);
    
    // Re-cachear con datos actualizados
    await cacheUser(user.public_code, dto);
    
    return dto;
};

/**
 * Soft delete de usuario (is_active = false)
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
    
    await user.update({ is_active: false });
    
    // Invalidar cache
    await invalidateUserCache(user.public_code);
    
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
    
    if (/^USR-[A-Z0-9]{5}-[A-Z0-9]$/.test(id)) {
        where.public_code = id;
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
            organization_id: { [Op.in]: organizationIds }
        },
        attributes: ['id']
    });
};
