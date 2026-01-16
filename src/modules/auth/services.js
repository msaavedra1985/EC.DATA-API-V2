// modules/auth/services.js
// Servicios de Auth - Lógica de negocio para autenticación

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config/env.js';
import { authLogger } from '../../utils/logger.js';
import * as authRepository from './repository.js';
import * as refreshTokenRepository from './refreshTokenRepository.js';
import * as authCache from './cache.js';
import * as rolesCache from './rolesCache.js';
import * as organizationService from '../organizations/services.js';
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
 * Obtiene un rol por nombre usando cache de Redis (TTL: 30 min)
 * @param {string} roleName - Nombre del rol (ej: 'user', 'system-admin')
 * @returns {Promise<Object|null>} Role object o null
 */
const getRoleByName = async (roleName) => {
    // Intentar obtener desde cache
    const cached = await rolesCache.getCachedRole(roleName);
    if (cached) {
        return cached;
    }
    
    // Si no está en cache, buscar en BD
    const role = await Role.findOne({ where: { name: roleName } });
    
    if (role) {
        // Guardar en cache para futuras consultas
        await rolesCache.cacheRole(role);
        return role;
    }
    
    return null;
};

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

    // Si no se provee role_id, buscar el rol 'user' por defecto (usa cache)
    let finalRoleId = role_id;
    if (!finalRoleId) {
        const defaultRole = await getRoleByName('user');
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
 * Verificar token de Cloudflare Turnstile (Captcha)
 * Solo se ejecuta si TURNSTILE_SECRET_KEY está configurado
 * 
 * @param {string} captchaToken - Token del captcha enviado por el cliente
 * @param {string} remoteIp - IP del cliente
 * @returns {Promise<boolean>} - true si válido, lanza error si inválido
 */
export const verifyTurnstileToken = async (captchaToken, remoteIp) => {
    const { config } = await import('../../config/env.js');
    
    // Si no hay secret key configurada O el captcha está deshabilitado, no es obligatorio
    if (!config.turnstile.secretKey || !config.turnstile.enabled) {
        return true;
    }

    // Si hay secret key pero no hay token, rechazar
    if (!captchaToken) {
        const error = new Error('auth.login.captcha_required');
        error.status = 400;
        error.code = 'CAPTCHA_REQUIRED';
        throw error;
    }

    try {
        const response = await fetch(config.turnstile.verifyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                secret: config.turnstile.secretKey,
                response: captchaToken,
                remoteip: remoteIp || ''
            })
        });

        const result = await response.json();

        if (!result.success) {
            authLogger.warn({
                errorCodes: result['error-codes'],
                remoteIp
            }, 'Turnstile verification failed');

            const error = new Error('auth.login.captcha_invalid');
            error.status = 400;
            error.code = 'CAPTCHA_INVALID';
            throw error;
        }

        return true;
    } catch (error) {
        // Si ya es nuestro error, re-lanzarlo
        if (error.code === 'CAPTCHA_INVALID' || error.code === 'CAPTCHA_REQUIRED') {
            throw error;
        }

        // SEGURIDAD FAIL-CLOSED: Error de red/otro - rechazar login
        // Previene bypass intencional bloqueando acceso a Cloudflare
        authLogger.error(error, 'Turnstile API error - rejecting login (fail-closed)');
        
        const captchaError = new Error('auth.login.captcha_service_unavailable');
        captchaError.status = 503;
        captchaError.code = 'CAPTCHA_SERVICE_UNAVAILABLE';
        throw captchaError;
    }
};

/**
 * Login de usuario (híbrido: email o username)
 * @param {string} identifier - Email o username del usuario
 * @param {string} password - Password en texto plano
 * @param {Object} [sessionData] - Datos de la sesión (userAgent, ipAddress, rememberMe, captchaToken)
 * @param {boolean} [sessionData.rememberMe=false] - Si true, genera tokens con duración extendida
 * @param {string} [sessionData.captchaToken] - Token de Cloudflare Turnstile para validación
 * @returns {Promise<Object>} - Usuario y token JWT
 */
export const login = async (identifier, password, sessionData = {}) => {
    // Validar captcha ANTES de verificar credenciales (si está configurado)
    await verifyTurnstileToken(sessionData.captchaToken, sessionData.ipAddress);

    // Buscar usuario por email O username con password incluido (para verificación)
    const user = await authRepository.findUserByIdentifier(identifier, true);

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
    // Pasar rememberMe a generateTokens para usar duración extendida si es necesario
    const tokens = await generateTokens(user, sessionData);
    
    // Guardar session_context en Redis
    const primaryOrg = await organizationService.getPrimaryOrganization(user.id);
    const { setSessionContext } = await import('./sessionContextCache.js');
    await setSessionContext(user.id, {
        activeOrgId: sessionData.activeOrgId || (primaryOrg ? primaryOrg.organization_id : null),
        primaryOrgId: primaryOrg ? primaryOrg.organization_id : null,
        canAccessAllOrgs: user.role && user.role.name === 'system-admin',
        role: user.role ? user.role.name : null,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userId: user.id
    });

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
        
        // Validar que solo system-admin puede tener activeOrgId null
        const isSystemAdmin = decoded.role === 'system-admin';
        if (decoded.activeOrgId === null && !isSystemAdmin) {
            const error = new Error('auth.token.org_required');
            error.status = 403;
            error.code = 'ORGANIZATION_REQUIRED';
            throw error;
        }

        return {
            userId: user.id,
            email: user.email,
            role: decoded.role, // Rol del JWT (string: nombre del rol)
            activeOrgId: decoded.activeOrgId,
            primaryOrgId: decoded.primaryOrgId,
            canAccessAllOrgs: decoded.canAccessAllOrgs || false,
            first_name: user.first_name,
            last_name: user.last_name,
            // impersonating solo para system-admin (indica si está actuando como otra org)
            ...(isSystemAdmin && { impersonating: decoded.impersonating || false })
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
 * Incluye soporte multi-tenant con activeOrgId y primaryOrgId
 * 
 * @param {Object} user - Datos del usuario
 * @param {Object} [sessionData] - Datos de la sesión
 * @param {string} [sessionData.userAgent] - User agent del navegador
 * @param {string} [sessionData.ipAddress] - IP del cliente
 * @param {boolean} [sessionData.rememberMe=false] - Si true, genera tokens con duración extendida (90 días)
 * @param {string} [sessionData.activeOrgId] - ID de la organización activa (si se está haciendo switch)
 * @returns {Promise<Object>} - { access_token, refresh_token, expires_in }
 */
const generateTokens = async (user, sessionData = {}) => {
    const sessionVersion = await authCache.getSessionVersion(user.id);
    const rememberMe = sessionData.rememberMe || false;

    // Determinar expiración del refresh token según remember_me
    const refreshExpiresIn = rememberMe 
        ? config.jwt.refreshExpiresInLong  // 90 días
        : config.jwt.refreshExpiresIn;     // 14 días

    // Obtener organización primaria del usuario
    const primaryOrg = await organizationService.getPrimaryOrganization(user.id);
    
    // Determinar si es system-admin (puede acceder a todas las orgs y tener activeOrgId null)
    const isSystemAdmin = user.role && user.role.name === 'system-admin';
    const canAccessAllOrgs = isSystemAdmin;
    
    // activeOrgId: 
    // - Si es system-admin y no se especifica org, puede ser null (panel admin global)
    // - Para otros roles, siempre usa la org primaria como fallback
    let activeOrgId;
    if (sessionData.activeOrgId !== undefined) {
        // Se especificó explícitamente (puede ser null para system-admin)
        activeOrgId = sessionData.activeOrgId;
    } else {
        // Usar org primaria por defecto
        activeOrgId = primaryOrg ? primaryOrg.organization_id : null;
    }
    
    const primaryOrgId = primaryOrg ? primaryOrg.organization_id : null;
    
    // impersonating: solo para system-admin, indica si está actuando como otra org
    // Es true cuando system-admin tiene activeOrgId pero no es su org primaria
    const impersonating = isSystemAdmin && activeOrgId !== null && activeOrgId !== primaryOrgId;

    const basePayload = {
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        sub: user.id,
        activeOrgId,
        primaryOrgId,
        canAccessAllOrgs,
        sessionVersion,
        role: user.role ? user.role.name : null,
        // impersonating solo se incluye para system-admin
        ...(isSystemAdmin && { impersonating })
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
        { expiresIn: refreshExpiresIn }
    );

    // Calcular fecha de expiración del refresh token
    const expiresAt = new Date();
    const daysMatch = refreshExpiresIn.match(/(\d+)d/);
    if (daysMatch) {
        expiresAt.setDate(expiresAt.getDate() + parseInt(daysMatch[1], 10));
    }

    await refreshTokenRepository.createRefreshToken({
        userId: user.id,
        token: refresh_token,
        expiresAt,
        userAgent: sessionData.userAgent || null,
        ipAddress: sessionData.ipAddress || null,
        rememberMe // Pasar rememberMe al repositorio para idle timeout correcto
    });

    return {
        access_token,
        refresh_token,
        expires_in: JWT_ACCESS_EXPIRES_IN,
        token_type: 'Bearer'
    };
};

/**
 * Logout - Revocar refresh token actual e invalidar sesión
 * 1. Busca el refresh token para obtener el userId
 * 2. Revoca el refresh token de la BD
 * 3. Incrementa sessionVersion (invalida access tokens existentes)
 * 4. Limpia caché Redis del usuario
 * 
 * @param {string} refreshToken - Refresh token a revocar
 * @returns {Promise<boolean>} - true si se revocó exitosamente
 */
export const logout = async (refreshToken) => {
    // Primero buscar el refresh token para obtener el userId
    const tokenData = await refreshTokenRepository.findByTokenHash(refreshToken);
    
    if (!tokenData) {
        const error = new Error('auth.refresh.token_invalid');
        error.status = 404;
        error.code = 'TOKEN_NOT_FOUND';
        throw error;
    }
    
    // Revocar el refresh token
    const revoked = await refreshTokenRepository.revokeToken(refreshToken, 'logout');
    
    if (!revoked) {
        const error = new Error('auth.logout.revoke_failed');
        error.status = 500;
        error.code = 'REVOKE_FAILED';
        throw error;
    }
    
    // Invalidar sesión del usuario (incrementa sessionVersion y limpia caché)
    await authCache.invalidateUserSession(tokenData.user_id);
    
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

/**
 * Cambiar organización activa del usuario
 * Genera nuevos tokens JWT con la nueva activeOrgId
 * 
 * @param {string} userId - ID del usuario
 * @param {string} newActiveOrgId - ID de la nueva organización activa
 * @param {Object} [sessionData] - Datos de la sesión
 * @returns {Promise<Object>} - Nuevos tokens y datos de organización
 */
export const switchOrganization = async (userId, newActiveOrgId, sessionData = {}) => {
    // Obtener usuario con rol incluido
    const user = await authRepository.findUserById(userId);
    
    if (!user) {
        const error = new Error('auth.user.not_found');
        error.status = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
    }
    
    // Verificar que la organización existe y está activa
    // Importación dinámica para evitar dependencias circulares
    const Organization = (await import('../organizations/models/Organization.js')).default;
    const targetOrg = await Organization.findByPk(newActiveOrgId, {
        attributes: ['id', 'is_active', 'name']
    });
    
    // Error 404: Organización no existe
    if (!targetOrg) {
        const error = new Error('auth.organization.not_found');
        error.status = 404;
        error.code = 'ORGANIZATION_NOT_FOUND';
        throw error;
    }
    
    // Error 404: Organización eliminada/desactivada (tratada como no existente para el cliente)
    if (!targetOrg.is_active) {
        const error = new Error('auth.organization.not_found');
        error.status = 404;
        error.code = 'ORGANIZATION_NOT_FOUND';
        throw error;
    }
    
    // Verificar que el usuario puede acceder a la organización
    const canAccess = await organizationService.canAccessOrganization(
        userId, 
        newActiveOrgId, 
        user.role.name
    );
    
    // Error 403: Usuario sin permiso para esta organización
    if (!canAccess) {
        const error = new Error('auth.organization.access_denied');
        error.status = 403;
        error.code = 'ORGANIZATION_ACCESS_DENIED';
        throw error;
    }
    
    // Generar nuevos tokens con la nueva activeOrgId
    sessionData.activeOrgId = newActiveOrgId;
    const tokens = await generateTokens(user, sessionData);
    
    // Invalidar cache de scope organizacional
    await organizationService.invalidateUserOrgScope(userId);
    
    // Actualizar session_context en Redis con la nueva org activa
    const { updateActiveOrg } = await import('./sessionContextCache.js');
    await updateActiveOrg(userId, newActiveOrgId);
    
    return {
        ...tokens,
        active_organization_id: newActiveOrgId
    };
};

/**
 * Obtener organizaciones disponibles del usuario
 * SEGURIDAD: Retorna public_codes en lugar de UUIDs internos
 * 
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} - Lista de organizaciones con detalles (solo public_codes)
 */
export const getUserAvailableOrganizations = async (userId) => {
    const user = await authRepository.findUserById(userId);
    
    if (!user) {
        const error = new Error('auth.user.not_found');
        error.status = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
    }
    
    // Obtener scope organizacional completo
    const scope = await organizationService.getOrganizationScope(userId, user.role.name);
    
    // Importar modelo Organization
    const Organization = (await import('../organizations/models/Organization.js')).default;
    
    // Función helper para mapear org a formato seguro (sin UUIDs)
    // Recibe un Map de parentId -> parentPublicCode para resolver parent_public_code
    const mapOrgToSafeFormat = (org, parentPublicCodeMap, directOrgIds, userOrganizations) => ({
        public_code: org.public_code,
        slug: org.slug,
        name: org.name,
        logo_url: org.logo_url,
        is_primary: userOrganizations.find(uo => uo.organization_id === org.id)?.is_primary || false,
        is_active: org.is_active,
        parent_public_code: org.parent_id ? (parentPublicCodeMap.get(org.parent_id) || null) : null,
        joined_at: userOrganizations.find(uo => uo.organization_id === org.id)?.joined_at || null,
        is_direct_member: directOrgIds.includes(org.id)
    });
    
    let accessibleOrganizations = [];
    const directOrgIds = scope.userOrganizations.map(uo => uo.organization_id);
    
    if (scope.canAccessAll) {
        // system-admin: obtener todas las organizaciones del sistema con detalles
        const allOrgs = await Organization.findAll({
            where: { is_active: true },
            attributes: ['id', 'public_code', 'slug', 'name', 'logo_url', 'is_active', 'parent_id'],
            order: [['name', 'ASC']]
        });
        
        // Crear mapa de id -> public_code para resolver parent_public_code
        const parentPublicCodeMap = new Map(allOrgs.map(org => [org.id, org.public_code]));
        
        // Mapear a formato seguro (sin UUIDs)
        accessibleOrganizations = allOrgs.map(org => 
            mapOrgToSafeFormat(org, parentPublicCodeMap, directOrgIds, scope.userOrganizations)
        );
        
    } else if (user.role.name === 'org-admin' || user.role.name === 'org-manager') {
        // Para org-admin/org-manager: obtener organizaciones accesibles con detalles
        const accessibleOrgs = await Organization.findAll({
            where: { 
                id: scope.organizationIds,
                is_active: true 
            },
            attributes: ['id', 'public_code', 'slug', 'name', 'logo_url', 'is_active', 'parent_id'],
            order: [['name', 'ASC']]
        });
        
        // Obtener parent_ids únicos que no están en el resultado
        const parentIds = [...new Set(accessibleOrgs.map(org => org.parent_id).filter(Boolean))];
        const missingParentIds = parentIds.filter(pid => !accessibleOrgs.some(org => org.id === pid));
        
        // Buscar public_codes de parents faltantes
        let parentPublicCodeMap = new Map(accessibleOrgs.map(org => [org.id, org.public_code]));
        
        if (missingParentIds.length > 0) {
            const parentOrgs = await Organization.findAll({
                where: { id: missingParentIds },
                attributes: ['id', 'public_code']
            });
            parentOrgs.forEach(org => parentPublicCodeMap.set(org.id, org.public_code));
        }
        
        accessibleOrganizations = accessibleOrgs.map(org => 
            mapOrgToSafeFormat(org, parentPublicCodeMap, directOrgIds, scope.userOrganizations)
        );
        
    } else {
        // Para user/viewer: solo sus organizaciones directas
        const userOrgIds = scope.userOrganizations.map(uo => uo.organization_id);
        
        if (userOrgIds.length > 0) {
            const userOrgs = await Organization.findAll({
                where: { 
                    id: userOrgIds,
                    is_active: true 
                },
                attributes: ['id', 'public_code', 'slug', 'name', 'logo_url', 'is_active', 'parent_id'],
                order: [['name', 'ASC']]
            });
            
            // Obtener parent public_codes
            const parentIds = [...new Set(userOrgs.map(org => org.parent_id).filter(Boolean))];
            let parentPublicCodeMap = new Map(userOrgs.map(org => [org.id, org.public_code]));
            
            if (parentIds.length > 0) {
                const missingParentIds = parentIds.filter(pid => !userOrgs.some(org => org.id === pid));
                if (missingParentIds.length > 0) {
                    const parentOrgs = await Organization.findAll({
                        where: { id: missingParentIds },
                        attributes: ['id', 'public_code']
                    });
                    parentOrgs.forEach(org => parentPublicCodeMap.set(org.id, org.public_code));
                }
            }
            
            accessibleOrganizations = userOrgs.map(org => 
                mapOrgToSafeFormat(org, parentPublicCodeMap, directOrgIds, scope.userOrganizations)
            );
        }
    }
    
    return {
        canAccessAll: scope.canAccessAll,
        userOrganizations: accessibleOrganizations,
        totalAccessible: scope.organizationIds.length
    };
};

/**
 * Generar tokens JWT para un usuario (función pública)
 * Útil para operaciones como exit-impersonation donde se necesita generar tokens
 * sin pasar por el flujo de login
 * 
 * @param {Object} user - Objeto usuario con id, role, etc.
 * @param {Object} [sessionData] - Datos de la sesión
 * @param {string} [sessionData.activeOrgId] - ID de org activa (puede ser null para system-admin)
 * @param {string} [sessionData.userAgent] - User agent
 * @param {string} [sessionData.ipAddress] - IP del cliente
 * @returns {Promise<Object>} - { access_token, refresh_token, expires_in, token_type }
 */
export const generateTokensForUser = async (user, sessionData = {}) => {
    return await generateTokens(user, sessionData);
};
