// modules/auth/services.js
// Servicios de Auth - Lógica de negocio para autenticación

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import * as authRepository from './repository.js';

// Configuración de bcrypt
const SALT_ROUNDS = 10;

// Configuración de JWT
const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRES_IN = config.jwt.expiresIn;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Registrar un nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @param {string} userData.email - Email
 * @param {string} userData.password - Password en texto plano (será hasheado)
 * @param {string} userData.first_name - Nombre
 * @param {string} userData.last_name - Apellido
 * @param {string} [userData.organization_id] - ID de la organización
 * @returns {Promise<Object>} - Usuario creado y token JWT
 */
export const register = async (userData) => {
    const { email, password, first_name, last_name, organization_id } = userData;

    // Verificar si el email ya existe
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
        const error = new Error('El email ya está registrado');
        error.status = 409; // Conflict
        error.code = 'EMAIL_ALREADY_EXISTS';
        throw error;
    }

    // Hashear password con bcrypt
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Crear usuario en la base de datos
    const newUser = await authRepository.createUser({
        email,
        password_hash,
        first_name,
        last_name,
        organization_id,
        role: 'user' // Por defecto todos son 'user'
    });

    // Generar tokens JWT
    const tokens = generateTokens(newUser);

    return {
        user: newUser,
        ...tokens
    };
};

/**
 * Login de usuario
 * @param {string} email - Email del usuario
 * @param {string} password - Password en texto plano
 * @returns {Promise<Object>} - Usuario y token JWT
 */
export const login = async (email, password) => {
    // Buscar usuario con password incluido (para verificación)
    const user = await authRepository.findUserByEmail(email, true);

    if (!user) {
        const error = new Error('Credenciales inválidas');
        error.status = 401; // Unauthorized
        error.code = 'INVALID_CREDENTIALS';
        throw error;
    }

    // Verificar que el usuario esté activo
    if (!user.is_active) {
        const error = new Error('Usuario desactivado');
        error.status = 403; // Forbidden
        error.code = 'USER_INACTIVE';
        throw error;
    }

    // Verificar password con bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
        const error = new Error('Credenciales inválidas');
        error.status = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
    }

    // Actualizar último login
    await authRepository.updateLastLogin(user.id);

    // Eliminar password_hash antes de devolver
    delete user.password_hash;

    // Generar tokens JWT
    const tokens = generateTokens(user);

    return {
        user,
        ...tokens
    };
};

/**
 * Verificar token JWT
 * @param {string} token - Token JWT
 * @returns {Promise<Object>} - Payload del token decodificado
 */
export const verifyToken = async (token) => {
    try {
        // Verificar y decodificar el token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verificar que el usuario aún existe y está activo
        const user = await authRepository.findUserById(decoded.userId);

        if (!user) {
            const error = new Error('Usuario no encontrado');
            error.status = 401;
            error.code = 'USER_NOT_FOUND';
            throw error;
        }

        if (!user.is_active) {
            const error = new Error('Usuario desactivado');
            error.status = 403;
            error.code = 'USER_INACTIVE';
            throw error;
        }

        return {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            tenant_id: decoded.tenant_id
        };
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            const authError = new Error('Token inválido');
            authError.status = 401;
            authError.code = 'INVALID_TOKEN';
            throw authError;
        }

        if (error.name === 'TokenExpiredError') {
            const authError = new Error('Token expirado');
            authError.status = 401;
            authError.code = 'TOKEN_EXPIRED';
            throw authError;
        }

        throw error;
    }
};

/**
 * Refresh de token JWT
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} - Nuevos tokens
 */
export const refreshAccessToken = async (refreshToken) => {
    try {
        // Verificar refresh token
        const decoded = jwt.verify(refreshToken, JWT_SECRET);

        if (decoded.type !== 'refresh') {
            const error = new Error('Token inválido');
            error.status = 401;
            error.code = 'INVALID_TOKEN_TYPE';
            throw error;
        }

        // Verificar que el usuario aún existe y está activo
        const user = await authRepository.findUserById(decoded.userId);

        if (!user) {
            const error = new Error('Usuario no encontrado');
            error.status = 401;
            error.code = 'USER_NOT_FOUND';
            throw error;
        }

        if (!user.is_active) {
            const error = new Error('Usuario desactivado');
            error.status = 403;
            error.code = 'USER_INACTIVE';
            throw error;
        }

        // Generar nuevos tokens
        const tokens = generateTokens(user);

        return tokens;
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            const authError = new Error('Refresh token inválido o expirado');
            authError.status = 401;
            authError.code = 'INVALID_REFRESH_TOKEN';
            throw authError;
        }

        throw error;
    }
};

/**
 * Cambiar password del usuario
 * @param {string} userId - ID del usuario
 * @param {string} currentPassword - Password actual
 * @param {string} newPassword - Nuevo password
 * @returns {Promise<boolean>} - true si se cambió correctamente
 */
export const changePassword = async (userId, currentPassword, newPassword) => {
    // Buscar usuario con password incluido
    const user = await authRepository.findUserById(userId);

    if (!user) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
    }

    // Obtener el password_hash actual (necesitamos hacer query directa)
    const userWithPassword = await authRepository.findUserByEmail(user.email, true);

    // Verificar password actual
    const isPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password_hash);

    if (!isPasswordValid) {
        const error = new Error('Password actual incorrecto');
        error.status = 401;
        error.code = 'INVALID_CURRENT_PASSWORD';
        throw error;
    }

    // Hashear nuevo password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Actualizar en la base de datos
    const updated = await authRepository.updatePassword(userId, newPasswordHash);

    return updated;
};

/**
 * Generar tokens JWT (access + refresh)
 * @param {Object} user - Datos del usuario
 * @returns {Object} - { access_token, refresh_token, expires_in }
 */
const generateTokens = (user) => {
    // Payload del token
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id
    };

    // Access token (corta duración)
    const access_token = jwt.sign(
        { ...payload, type: 'access' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    // Refresh token (larga duración)
    const refresh_token = jwt.sign(
        { ...payload, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    return {
        access_token,
        refresh_token,
        expires_in: JWT_EXPIRES_IN,
        token_type: 'Bearer'
    };
};
