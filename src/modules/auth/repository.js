// modules/auth/repository.js
// Repositorio de Auth - Capa de acceso a datos con Sequelize

import User from './models/User.js';
import { generateUuidV7, generateHumanId, generatePublicCode } from '../../utils/identifiers.js';

/**
 * Crear un nuevo usuario en la base de datos
 * Genera automáticamente: UUID v7, human_id (scoped por organization_id), public_code (prefijo EC-)
 * 
 * @param {Object} userData - Datos del usuario a crear
 * @param {string} userData.email - Email único
 * @param {string} userData.password_hash - Hash de la contraseña (ya hasheado con bcrypt)
 * @param {string} userData.first_name - Nombre
 * @param {string} userData.last_name - Apellido
 * @param {string} [userData.organization_id] - ID de la organización (opcional)
 * @param {string} [userData.role='user'] - Rol del usuario
 * @returns {Promise<Object>} - Usuario creado (sin password_hash)
 */
export const createUser = async (userData) => {
    try {
        // Generar UUID v7
        const id = generateUuidV7();
        
        // Generar human_id con scope por organization_id
        const humanId = await generateHumanId(
            User,
            'organization_id',
            userData.organization_id || null
        );
        
        // Generar public_code con prefijo EC-
        const publicCode = generatePublicCode('EC', humanId);
        
        // Crear usuario con identificadores
        const user = await User.create({
            id,
            human_id: humanId,
            public_code: publicCode,
            ...userData
        });
        
        // Eliminar password_hash de la respuesta
        const userJson = user.toJSON();
        delete userJson.password_hash;
        
        return userJson;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

/**
 * Buscar usuario por email
 * @param {string} email - Email del usuario
 * @param {boolean} includePassword - Si incluir password_hash (para verificación de login)
 * @returns {Promise<Object|null>} - Usuario encontrado o null
 */
export const findUserByEmail = async (email, includePassword = false) => {
    try {
        const user = await User.findOne({
            where: { email: email.toLowerCase() },
            // Si includePassword es true, necesitamos el campo para verificar login
            attributes: includePassword 
                ? undefined // Incluir todos los campos
                : { exclude: ['password_hash'] }
        });
        
        return user ? user.toJSON() : null;
    } catch (error) {
        console.error('Error finding user by email:', error);
        throw error;
    }
};

/**
 * Buscar usuario por ID
 * @param {string} userId - UUID del usuario
 * @returns {Promise<Object|null>} - Usuario encontrado o null
 */
export const findUserById = async (userId) => {
    try {
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password_hash'] }
        });
        
        return user ? user.toJSON() : null;
    } catch (error) {
        console.error('Error finding user by ID:', error);
        throw error;
    }
};

/**
 * Actualizar último login del usuario
 * @param {string} userId - UUID del usuario
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 */
export const updateLastLogin = async (userId) => {
    try {
        const [affectedRows] = await User.update(
            { last_login_at: new Date() },
            { where: { id: userId } }
        );
        
        return affectedRows > 0;
    } catch (error) {
        console.error('Error updating last login:', error);
        throw error;
    }
};

/**
 * Actualizar password de usuario
 * @param {string} userId - UUID del usuario
 * @param {string} newPasswordHash - Nuevo hash de password
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 */
export const updatePassword = async (userId, newPasswordHash) => {
    try {
        const [affectedRows] = await User.update(
            { password_hash: newPasswordHash },
            { where: { id: userId } }
        );
        
        return affectedRows > 0;
    } catch (error) {
        console.error('Error updating password:', error);
        throw error;
    }
};

/**
 * Verificar email del usuario
 * @param {string} userId - UUID del usuario
 * @returns {Promise<boolean>} - true si se verificó correctamente
 */
export const verifyEmail = async (userId) => {
    try {
        const [affectedRows] = await User.update(
            { email_verified_at: new Date() },
            { where: { id: userId } }
        );
        
        return affectedRows > 0;
    } catch (error) {
        console.error('Error verifying email:', error);
        throw error;
    }
};

/**
 * Activar/Desactivar usuario
 * @param {string} userId - UUID del usuario
 * @param {boolean} isActive - Estado activo/inactivo
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 */
export const setUserActiveStatus = async (userId, isActive) => {
    try {
        const [affectedRows] = await User.update(
            { is_active: isActive },
            { where: { id: userId } }
        );
        
        return affectedRows > 0;
    } catch (error) {
        console.error('Error setting user active status:', error);
        throw error;
    }
};

/**
 * Buscar usuario por public_code
 * @param {string} publicCode - public_code del usuario (ej: EC-7K9D2-X)
 * @returns {Promise<Object|null>} - Usuario encontrado o null
 */
export const findUserByPublicCode = async (publicCode) => {
    try {
        const user = await User.findOne({
            where: { public_code: publicCode },
            attributes: { exclude: ['password_hash'] }
        });
        
        return user ? user.toJSON() : null;
    } catch (error) {
        console.error('Error finding user by public code:', error);
        throw error;
    }
};

/**
 * Buscar usuario por human_id + organization_id (solo uso interno/admin)
 * @param {number} humanId - human_id del usuario
 * @param {string} organizationId - UUID de la organización
 * @returns {Promise<Object|null>} - Usuario encontrado o null
 */
export const findUserByHumanId = async (humanId, organizationId) => {
    try {
        const user = await User.findOne({
            where: { 
                human_id: humanId,
                organization_id: organizationId
            },
            attributes: { exclude: ['password_hash'] }
        });
        
        return user ? user.toJSON() : null;
    } catch (error) {
        console.error('Error finding user by human ID:', error);
        throw error;
    }
};

/**
 * Listar usuarios con paginación y filtros
 * @param {Object} options - Opciones de búsqueda
 * @param {number} [options.limit=50] - Límite de resultados
 * @param {number} [options.offset=0] - Offset para paginación
 * @param {string} [options.role] - Filtrar por rol
 * @param {string} [options.organization_id] - Filtrar por organización
 * @param {boolean} [options.is_active] - Filtrar por estado activo
 * @returns {Promise<Object>} - { users: Array, total: number }
 */
export const listUsers = async (options = {}) => {
    try {
        const {
            limit = 50,
            offset = 0,
            role,
            organization_id,
            is_active
        } = options;

        // Construir filtros dinámicos
        const where = {};
        if (role) where.role = role;
        if (organization_id !== undefined) where.organization_id = organization_id;
        if (is_active !== undefined) where.is_active = is_active;

        const { count, rows } = await User.findAndCountAll({
            where,
            limit,
            offset,
            attributes: { exclude: ['password_hash'] },
            order: [['created_at', 'DESC']]
        });

        return {
            users: rows.map(user => user.toJSON()),
            total: count
        };
    } catch (error) {
        console.error('Error listing users:', error);
        throw error;
    }
};

/**
 * Eliminar usuario (soft delete - paranoid)
 * @param {string} userId - UUID del usuario
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
export const deleteUser = async (userId) => {
    try {
        const affectedRows = await User.destroy({
            where: { id: userId }
        });
        
        return affectedRows > 0;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};
