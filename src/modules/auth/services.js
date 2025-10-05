// modules/auth/services.js
// Servicios de Auth - Lógica de negocio para autenticación

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import * as authRepository from './repository.js';
import * as refreshTokenRepository from './refreshTokenRepository.js';

// Configuración de bcrypt
const SALT_ROUNDS = 10;

// Configuración de JWT - Secrets separados para access y refresh
const JWT_ACCESS_SECRET = config.jwt.accessSecret;
const JWT_ACCESS_EXPIRES_IN = config.jwt.accessExpiresIn;
const JWT_REFRESH_SECRET = config.jwt.refreshSecret;
const JWT_REFRESH_EXPIRES_IN = config.jwt.refreshExpiresIn;

/**
 * Registrar un nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @param {string} userData.email - Email
 * @param {string} userData.password - Password en texto plano (será hasheado)
 * @param {string} userData.first_name - Nombre
 * @param {string} userData.last_name - Apellido
 * @param {string} [userData.organization_id] - ID de la organización
 * @param {Object} [sessionData] - Datos de la sesión (userAgent, ipAddress)
 * @returns {Promise<Object>} - Usuario creado y token JWT
 */
export const register = async (userData, sessionData = {}) => {
    const { email, password, first_name, last_name, organization_id } = userData;

    // Verificar si el email ya existe
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
        const error = new Error('auth.register.email_exists');
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

    // Generar tokens JWT y guardar refresh token en BD
    const tokens = await generateTokens(newUser, sessionData);

    return {
        user: newUser,
        ...tokens
    };
};

/**
 * Login de usuario
 * @param {string} email - Email del usuario
 * @param {string} password - Password en texto plano
 * @param {Object} [sessionData] - Datos de la sesión (userAgent, ipAddress)
 * @returns {Promise<Object>} - Usuario y token JWT
 */
export const login = async (email, password, sessionData = {}) => {
    // Buscar usuario con password incluido (para verificación)
    const user = await authRepository.findUserByEmail(email, true);

    if (!user) {
        const error = new Error('auth.login.invalid_credentials');
        error.status = 401; // Unauthorized
        error.code = 'INVALID_CREDENTIALS';
        throw error;
    }

    // Verificar que el usuario esté activo
    if (!user.is_active) {
        const error = new Error('auth.login.account_disabled');
        error.status = 403; // Forbidden
        error.code = 'USER_INACTIVE';
        throw error;
    }

    // Verificar password con bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
        const error = new Error('auth.login.invalid_credentials');
        error.status = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
    }

    // Actualizar último login
    await authRepository.updateLastLogin(user.id);

    // Eliminar password_hash antes de devolver
    delete user.password_hash;

    // Generar tokens JWT y guardar refresh token en BD
    const tokens = await generateTokens(user, sessionData);

    return {
        user,
        ...tokens
    };
};

/**
 * Verificar token JWT (access token)
 * @param {string} token - Access token JWT
 * @returns {Promise<Object>} - Payload del token decodificado
 */
export const verifyToken = async (token) => {
    try {
        // Verificar y decodificar el access token con su secret
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

        // Verificar que sea un access token
        if (decoded.type !== 'access') {
            const error = new Error('auth.token.invalid');
            error.status = 401;
            error.code = 'INVALID_TOKEN_TYPE';
            throw error;
        }

        // Verificar que el usuario aún existe y está activo
        const user = await authRepository.findUserById(decoded.userId);

        if (!user) {
            const error = new Error('auth.profile.not_found');
            error.status = 401;
            error.code = 'USER_NOT_FOUND';
            throw error;
        }

        if (!user.is_active) {
            const error = new Error('auth.login.account_disabled');
            error.status = 403;
            error.code = 'USER_INACTIVE';
            throw error;
        }

        return {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            organization_id: decoded.organization_id
        };
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            const authError = new Error('auth.token.invalid');
            authError.status = 401;
            authError.code = 'INVALID_TOKEN';
            throw authError;
        }

        if (error.name === 'TokenExpiredError') {
            const authError = new Error('auth.token.expired');
            authError.status = 401;
            authError.code = 'TOKEN_EXPIRED';
            throw authError;
        }

        throw error;
    }
};

/**
 * Refresh de token JWT con rotación automática
 * Implementa:
 * - Rotación real (el refresh token viejo se revoca)
 * - Validación de idle timeout (no usado en 7 días)
 * - Detección de robo (intento de usar token revocado)
 * 
 * @param {string} refreshToken - Refresh token
 * @param {Object} [sessionData] - Datos de la sesión (userAgent, ipAddress)
 * @returns {Promise<Object>} - Nuevos tokens
 */
export const refreshAccessToken = async (refreshToken, sessionData = {}) => {
    try {
        // Verificar refresh token JWT con su secret
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

        if (decoded.type !== 'refresh') {
            const error = new Error('auth.token.invalid');
            error.status = 401;
            error.code = 'INVALID_TOKEN_TYPE';
            throw error;
        }

        // Buscar el refresh token en la base de datos (incluyendo soft-deleted para detectar robo)
        const storedToken = await refreshTokenRepository.findByTokenHash(refreshToken, true);

        if (!storedToken) {
            const error = new Error('auth.refresh.token_invalid');
            error.status = 401;
            error.code = 'INVALID_REFRESH_TOKEN';
            throw error;
        }

        // DETECCIÓN DE ROBO: Si el token ya fue revocado, alguien está intentando reusarlo
        if (storedToken.is_revoked) {
            // Revocar TODOS los tokens del usuario (posible robo)
            await refreshTokenRepository.revokeAllUserTokens(decoded.userId, 'suspicious_activity');
            
            const error = new Error('auth.refresh.token_theft_detected');
            error.status = 401;
            error.code = 'TOKEN_REUSE_DETECTED';
            throw error;
        }

        // Verificar expiración absoluta
        if (new Date(storedToken.expires_at) < new Date()) {
            await refreshTokenRepository.revokeToken(refreshToken, 'expired');
            const error = new Error('auth.refresh.token_expired');
            error.status = 401;
            error.code = 'REFRESH_TOKEN_EXPIRED';
            throw error;
        }

        // Verificar idle timeout (no usado en 7 días)
        if (refreshTokenRepository.isIdleTimeout(storedToken)) {
            await refreshTokenRepository.revokeToken(refreshToken, 'idle_timeout');
            const error = new Error('auth.refresh.token_expired');
            error.status = 401;
            error.code = 'IDLE_TIMEOUT';
            throw error;
        }

        // Verificar que el usuario aún existe y está activo
        const user = await authRepository.findUserById(decoded.userId);

        if (!user) {
            const error = new Error('auth.profile.not_found');
            error.status = 401;
            error.code = 'USER_NOT_FOUND';
            throw error;
        }

        if (!user.is_active) {
            const error = new Error('auth.login.account_disabled');
            error.status = 403;
            error.code = 'USER_INACTIVE';
            throw error;
        }

        // ROTACIÓN: Revocar el refresh token viejo ANTES de generar uno nuevo
        await refreshTokenRepository.revokeToken(refreshToken, 'rotated');

        // Generar nuevos tokens (esto creará un nuevo refresh token en BD)
        const tokens = await generateTokens(user, sessionData);

        return tokens;
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            const authError = new Error('auth.refresh.token_invalid');
            authError.status = 401;
            authError.code = 'INVALID_REFRESH_TOKEN';
            throw authError;
        }

        if (error.name === 'TokenExpiredError') {
            const authError = new Error('Refresh token expirado');
            authError.status = 401;
            authError.code = 'REFRESH_TOKEN_EXPIRED';
            throw authError;
        }

        throw error;
    }
};

/**
 * Cambiar password del usuario
 * Auto-revoca TODOS los refresh tokens al cambiar password (cierra todas las sesiones)
 * 
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
        const error = new Error('auth.password.current_incorrect');
        error.status = 401;
        error.code = 'INVALID_CURRENT_PASSWORD';
        throw error;
    }

    // Hashear nuevo password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Actualizar en la base de datos
    const updated = await authRepository.updatePassword(userId, newPasswordHash);

    // SEGURIDAD: Revocar TODOS los refresh tokens al cambiar password
    // Esto cierra todas las sesiones y obliga a re-login
    await refreshTokenRepository.revokeAllUserTokens(userId, 'password_change');

    return updated;
};

/**
 * Generar tokens JWT (access + refresh) con rotación y persistencia
 * 
 * @param {Object} user - Datos del usuario
 * @param {Object} [sessionData] - Datos de la sesión
 * @param {string} [sessionData.userAgent] - User agent del navegador
 * @param {string} [sessionData.ipAddress] - IP del cliente
 * @returns {Promise<Object>} - { access_token, refresh_token, expires_in }
 */
const generateTokens = async (user, sessionData = {}) => {
    // Payload del token
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id
    };

    // Access token (corta duración - 15 minutos)
    const access_token = jwt.sign(
        { ...payload, type: 'access' },
        JWT_ACCESS_SECRET,
        { expiresIn: JWT_ACCESS_EXPIRES_IN }
    );

    // Refresh token (larga duración - 14 días)
    // Agregar jti (JWT ID) único para evitar colisiones de hash
    const refresh_token = jwt.sign(
        { 
            ...payload, 
            type: 'refresh',
            jti: crypto.randomUUID() // Garantiza unicidad del token
        },
        JWT_REFRESH_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    // Calcular fecha de expiración del refresh token
    const expiresAt = new Date();
    const daysMatch = JWT_REFRESH_EXPIRES_IN.match(/(\d+)d/);
    if (daysMatch) {
        expiresAt.setDate(expiresAt.getDate() + parseInt(daysMatch[1], 10));
    }

    // Guardar refresh token hasheado en la base de datos
    await refreshTokenRepository.createRefreshToken({
        userId: user.id,
        token: refresh_token,
        expiresAt,
        userAgent: sessionData.userAgent || null,
        ipAddress: sessionData.ipAddress || null
    });

    return {
        access_token,
        refresh_token,
        expires_in: JWT_ACCESS_EXPIRES_IN,
        token_type: 'Bearer'
    };
};

/**
 * Logout - Revocar refresh token actual
 * @param {string} refreshToken - Refresh token a revocar
 * @returns {Promise<boolean>} - true si se revocó exitosamente
 */
export const logout = async (refreshToken) => {
    const revoked = await refreshTokenRepository.revokeToken(refreshToken, 'logout');
    
    if (!revoked) {
        const error = new Error('auth.refresh.token_invalid');
        error.status = 404;
        error.code = 'TOKEN_NOT_FOUND';
        throw error;
    }
    
    return true;
};

/**
 * Logout All - Revocar todas las sesiones de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<number>} - Número de sesiones cerradas
 */
export const logoutAll = async (userId) => {
    const revokedCount = await refreshTokenRepository.revokeAllUserTokens(userId, 'logout_all');
    return revokedCount;
};

/**
 * Obtener sesiones activas del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} - Lista de sesiones activas
 */
export const getUserSessions = async (userId) => {
    const sessions = await refreshTokenRepository.getUserActiveSessions(userId);
    return sessions;
};

/**
 * Revocar sesión específica por ID
 * @param {string} sessionId - ID de la sesión (refresh token ID)
 * @param {string} userId - ID del usuario (para verificar ownership)
 * @returns {Promise<boolean>} - true si se revocó
 */
export const revokeSession = async (sessionId, userId) => {
    const revoked = await refreshTokenRepository.revokeSessionById(sessionId, userId, 'logout');
    
    if (!revoked) {
        const error = new Error('auth.logout.session_not_found');
        error.status = 404;
        error.code = 'SESSION_NOT_FOUND';
        throw error;
    }
    
    return true;
};
