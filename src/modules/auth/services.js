// modules/auth/services.js
// Servicios de Auth - Lógica de negocio para autenticación

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config/env.js';
import * as authRepository from './repository.js';
import * as refreshTokenRepository from './refreshTokenRepository.js';
import * as authCache from './cache.js';
import Role from './models/Role.js';

// Configuración de bcrypt
const SALT_ROUNDS = 10;

// Configuración de JWT - Secrets separados para access y refresh
const JWT_ACCESS_SECRET = config.jwt.accessSecret;
const JWT_ACCESS_EXPIRES_IN = config.jwt.accessExpiresIn;
const JWT_REFRESH_SECRET = config.jwt.refreshSecret;
const JWT_REFRESH_EXPIRES_IN = config.jwt.refreshExpiresIn;
const JWT_ISSUER = config.jwt.issuer;
const JWT_AUDIENCE = config.jwt.audience;

/**
 * Registrar un nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @param {string} userData.email - Email
 * @param {string} userData.password - Password en texto plano (será hasheado)
 * @param {string} userData.first_name - Nombre
 * @param {string} userData.last_name - Apellido
 * @param {string} [userData.organization_id] - ID de la organización
 * @param {string} [userData.role_id] - ID del rol (si no se provee, usa 'user' por defecto)
 * @param {Object} [sessionData] - Datos de la sesión (userAgent, ipAddress)
 * @returns {Promise<Object>} - Usuario creado y token JWT
 */
export const register = async (userData, sessionData = {}) => {
    const { email, password, first_name, last_name, organization_id, role_id } = userData;

    // Verificar si el email ya existe
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
        const error = new Error('auth.register.email_exists');
        error.status = 409; // Conflict
        error.code = 'EMAIL_ALREADY_EXISTS';
        throw error;
    }

    // Si no se provee role_id, buscar el rol 'user' por defecto
    let finalRoleId = role_id;
    if (!finalRoleId) {
        const defaultRole = await Role.findOne({ where: { name: 'user' } });
        if (!defaultRole) {
            const error = new Error('auth.register.default_role_not_found');
            error.status = 500;
            error.code = 'DEFAULT_ROLE_NOT_FOUND';
            throw error;
        }
        finalRoleId = defaultRole.id;
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
        role_id: finalRoleId
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
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET, {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE
        });

        if (decoded.tokenType !== 'access') {
            const error = new Error('auth.token.invalid');
            error.status = 401;
            error.code = 'INVALID_TOKEN_TYPE';
            throw error;
        }

        const userId = decoded.sub;

        let user = await authCache.getUserFromCache(userId);

        if (!user) {
            user = await authRepository.findUserById(userId);

            if (!user) {
                const error = new Error('auth.profile.not_found');
                error.status = 401;
                error.code = 'USER_NOT_FOUND';
                throw error;
            }

            await authCache.setUserCache(userId, user);
        }

        if (!user.is_active) {
            const error = new Error('auth.login.account_disabled');
            error.status = 403;
            error.code = 'USER_INACTIVE';
            throw error;
        }

        const currentSessionVersion = await authCache.getSessionVersion(userId);
        if (decoded.sessionVersion !== currentSessionVersion) {
            const error = new Error('auth.token.session_revoked');
            error.status = 401;
            error.code = 'SESSION_REVOKED';
            throw error;
        }

        return {
            userId: user.id,
            email: user.email,
            role: user.role, // Ahora es un objeto con {id, name, description, is_active}
            organization_id: user.organization_id,
            first_name: user.first_name,
            last_name: user.last_name
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
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE
        });

        if (decoded.tokenType !== 'refresh') {
            const error = new Error('auth.token.invalid');
            error.status = 401;
            error.code = 'INVALID_TOKEN_TYPE';
            throw error;
        }

        const userId = decoded.sub;

        const storedToken = await refreshTokenRepository.findByTokenHash(refreshToken, true);

        if (!storedToken) {
            const error = new Error('auth.refresh.token_invalid');
            error.status = 401;
            error.code = 'INVALID_REFRESH_TOKEN';
            throw error;
        }

        if (storedToken.is_revoked) {
            await refreshTokenRepository.revokeAllUserTokens(userId, 'suspicious_activity');
            await authCache.invalidateUserSession(userId);
            
            const error = new Error('auth.refresh.token_theft_detected');
            error.status = 401;
            error.code = 'TOKEN_REUSE_DETECTED';
            throw error;
        }

        if (new Date(storedToken.expires_at) < new Date()) {
            await refreshTokenRepository.revokeToken(refreshToken, 'expired');
            const error = new Error('auth.refresh.token_expired');
            error.status = 401;
            error.code = 'REFRESH_TOKEN_EXPIRED';
            throw error;
        }

        if (refreshTokenRepository.isIdleTimeout(storedToken)) {
            await refreshTokenRepository.revokeToken(refreshToken, 'idle_timeout');
            const error = new Error('auth.refresh.token_expired');
            error.status = 401;
            error.code = 'IDLE_TIMEOUT';
            throw error;
        }

        const currentSessionVersion = await authCache.getSessionVersion(userId);
        if (decoded.sessionVersion !== currentSessionVersion) {
            const error = new Error('auth.token.session_revoked');
            error.status = 401;
            error.code = 'SESSION_REVOKED';
            throw error;
        }

        const user = await authRepository.findUserById(userId);

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

        await refreshTokenRepository.revokeToken(refreshToken, 'rotated');

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
    
    // Invalidar sesión (incrementar sessionVersion y limpiar caché)
    await authCache.invalidateUserSession(userId);

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
    const sessionVersion = await authCache.getSessionVersion(user.id);

    const basePayload = {
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        sub: user.id,
        orgId: user.organization_id,
        sessionVersion,
        role: user.role ? {
            id: user.role.id,
            name: user.role.name,
            description: user.role.description,
            is_active: user.role.is_active
        } : null
    };

    const access_token = jwt.sign(
        {
            ...basePayload,
            tokenType: 'access',
            jti: crypto.randomUUID()
        },
        JWT_ACCESS_SECRET,
        { expiresIn: JWT_ACCESS_EXPIRES_IN }
    );

    const refresh_token = jwt.sign(
        {
            ...basePayload,
            tokenType: 'refresh',
            jti: crypto.randomUUID()
        },
        JWT_REFRESH_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    const expiresAt = new Date();
    const daysMatch = JWT_REFRESH_EXPIRES_IN.match(/(\d+)d/);
    if (daysMatch) {
        expiresAt.setDate(expiresAt.getDate() + parseInt(daysMatch[1], 10));
    }

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
    await authCache.invalidateUserSession(userId);
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

/**
 * Verificar email y limpiar caché del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} - true si se verificó correctamente
 */
export const verifyUserEmail = async (userId) => {
    const updated = await authRepository.verifyEmail(userId);
    if (updated) {
        await authCache.deleteUserCache(userId);
    }
    return updated;
};

/**
 * Activar/Desactivar usuario e invalidar su sesión
 * @param {string} userId - ID del usuario
 * @param {boolean} isActive - Estado activo/inactivo
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 */
export const setUserActiveStatus = async (userId, isActive) => {
    const updated = await authRepository.setUserActiveStatus(userId, isActive);
    if (updated && !isActive) {
        await refreshTokenRepository.revokeAllUserTokens(userId, 'account_disabled');
        await authCache.invalidateUserSession(userId);
    } else if (updated) {
        await authCache.deleteUserCache(userId);
    }
    return updated;
};

/**
 * Invalidar sesión de un usuario (útil para forzar re-login)
 * Exportada para uso externo cuando se actualice información crítica del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} - true si se invalidó correctamente
 */
export const invalidateUserSession = async (userId) => {
    return await authCache.invalidateUserSession(userId);
};
