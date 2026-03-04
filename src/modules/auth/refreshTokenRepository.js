// modules/auth/refreshTokenRepository.js
// Repositorio de RefreshToken - Capa de acceso a datos para gestión de sesiones

import { Op } from 'sequelize';
import crypto from 'crypto';
import RefreshToken from './models/RefreshToken.js';
import { generateUuidV7 } from '../../utils/identifiers.js';
import { config } from '../../config/env.js';
import { authLogger } from '../../utils/logger.js';

/**
 * Hashear un refresh token con SHA-256
 * @param {string} token - Token en texto plano
 * @returns {string} - Hash hexadecimal del token
 */
export const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Crear y guardar un refresh token en la base de datos
 * @param {Object} data - Datos del token
 * @param {string} data.userId - ID del usuario
 * @param {string} data.token - Refresh token en texto plano (será hasheado)
 * @param {Date} data.expiresAt - Fecha de expiración
 * @param {string} [data.userAgent] - User agent del navegador
 * @param {string} [data.ipAddress] - IP del cliente
 * @param {boolean} [data.rememberMe=false] - Si true, el token usa duración extendida
 * @returns {Promise<Object>} - Refresh token creado
 */
export const createRefreshToken = async ({ userId, token, expiresAt, userAgent = null, ipAddress = null, rememberMe = false }) => {
    try {
        const id = generateUuidV7();
        const tokenHash = hashToken(token);

        const refreshToken = await RefreshToken.create({
            id,
            userId,
            tokenHash,
            expiresAt,
            lastUsedAt: new Date(),
            userAgent,
            ipAddress,
            rememberMe
        });

        return refreshToken.toJSON();
    } catch (error) {
        authLogger.error(error, 'Error creating refresh token');
        throw error;
    }
};

/**
 * Buscar refresh token por hash
 * @param {string} token - Token en texto plano
 * @param {boolean} includeDeleted - Si debe incluir tokens soft-deleted (para detección de robo)
 * @returns {Promise<Object|null>} - Refresh token encontrado o null
 */
export const findByTokenHash = async (token, includeDeleted = false) => {
    try {
        const tokenHash = hashToken(token);
        
        const refreshToken = await RefreshToken.findOne({
            where: { tokenHash },
            paranoid: !includeDeleted // paranoid: false permite buscar tokens soft-deleted
        });

        return refreshToken ? refreshToken.toJSON() : null;
    } catch (error) {
        authLogger.error(error, 'Error finding refresh token');
        throw error;
    }
};

/**
 * Revocar un refresh token específico
 * @param {string} token - Token en texto plano
 * @param {string} reason - Motivo de revocación
 * @returns {Promise<boolean>} - true si se revocó, false si no se encontró
 */
export const revokeToken = async (token, reason = 'logout') => {
    try {
        const tokenHash = hashToken(token);
        
        // Primero actualizar el motivo de revocación
        await RefreshToken.update(
            {
                isRevoked: true,
                revokedAt: new Date(),
                revokedReason: reason
            },
            {
                where: {
                    tokenHash,
                    isRevoked: false
                }
            }
        );

        // Luego hacer soft delete (paranoid: true) para liberar el constraint unique
        const affectedRows = await RefreshToken.destroy({
            where: {
                tokenHash
            }
        });

        return affectedRows > 0;
    } catch (error) {
        authLogger.error(error, 'Error revoking refresh token');
        throw error;
    }
};

/**
 * Revocar todos los refresh tokens de un usuario
 * @param {string} userId - ID del usuario
 * @param {string} reason - Motivo de revocación
 * @returns {Promise<number>} - Número de tokens revocados
 */
export const revokeAllUserTokens = async (userId, reason = 'logout_all') => {
    try {
        // Primero actualizar el motivo de revocación
        await RefreshToken.update(
            {
                isRevoked: true,
                revokedAt: new Date(),
                revokedReason: reason
            },
            {
                where: {
                    userId,
                    isRevoked: false
                }
            }
        );

        // Luego hacer soft delete (paranoid: true) para liberar el constraint unique
        const affectedRows = await RefreshToken.destroy({
            where: {
                userId
            }
        });

        return affectedRows;
    } catch (error) {
        authLogger.error(error, 'Error revoking all user tokens');
        throw error;
    }
};

/**
 * Actualizar lastUsedAt de un token
 * @param {string} token - Token en texto plano
 * @returns {Promise<boolean>} - true si se actualizó
 */
export const updateLastUsed = async (token) => {
    try {
        const tokenHash = hashToken(token);
        
        const [affectedRows] = await RefreshToken.update(
            { lastUsedAt: new Date() },
            {
                where: {
                    tokenHash,
                    isRevoked: false
                }
            }
        );

        return affectedRows > 0;
    } catch (error) {
        authLogger.error(error, 'Error updating lastUsedAt');
        throw error;
    }
};

/**
 * Verificar si un token está en idle timeout (no usado en X días)
 * @param {Object} refreshToken - Objeto refresh token de BD
 * @returns {boolean} - true si está en idle timeout
 */
export const isIdleTimeout = (refreshToken) => {
    // Usar idle timeout extendido si el token se creó con rememberMe
    const idleDays = refreshToken.rememberMe 
        ? config.jwt.refreshIdleDaysLong  // 30 días
        : config.jwt.refreshIdleDays;     // 7 días
    
    const idleMs = idleDays * 24 * 60 * 60 * 1000;
    const lastUsed = new Date(refreshToken.lastUsedAt);
    const now = new Date();
    
    return (now - lastUsed) > idleMs;
};

/**
 * Limpiar tokens expirados o en idle timeout
 * Se ejecuta periódicamente para mantener la BD limpia
 * Respeta el idle timeout dinámico según rememberMe (7 días vs 30 días)
 * @returns {Promise<number>} - Número de tokens eliminados
 */
export const cleanupExpiredTokens = async () => {
    try {
        const normalIdleDays = config.jwt.refreshIdleDays;      // 7 días para sesiones normales
        const extendedIdleDays = config.jwt.refreshIdleDaysLong; // 30 días para rememberMe
        
        const normalIdleCutoff = new Date();
        normalIdleCutoff.setDate(normalIdleCutoff.getDate() - normalIdleDays);
        
        const extendedIdleCutoff = new Date();
        extendedIdleCutoff.setDate(extendedIdleCutoff.getDate() - extendedIdleDays);

        const deletedCount = await RefreshToken.destroy({
            where: {
                [Op.or]: [
                    // Tokens expirados (por fecha absoluta)
                    {
                        expiresAt: {
                            [Op.lt]: new Date()
                        }
                    },
                    // Tokens normales (rememberMe = false) en idle timeout después de 7 días
                    {
                        rememberMe: false,
                        lastUsedAt: {
                            [Op.lt]: normalIdleCutoff
                        }
                    },
                    // Tokens extendidos (rememberMe = true) en idle timeout después de 30 días
                    {
                        rememberMe: true,
                        lastUsedAt: {
                            [Op.lt]: extendedIdleCutoff
                        }
                    },
                    // Tokens revocados hace más de 30 días (mantener historial limitado)
                    {
                        isRevoked: true,
                        revokedAt: {
                            [Op.lt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        }
                    }
                ]
            }
        });

        return deletedCount;
    } catch (error) {
        authLogger.error(error, 'Error cleaning up expired tokens');
        throw error;
    }
};

/**
 * Obtener todas las sesiones activas de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} - Lista de sesiones activas
 */
export const getUserActiveSessions = async (userId) => {
    try {
        const sessions = await RefreshToken.findAll({
            where: {
                userId,
                isRevoked: false,
                expiresAt: {
                    [Op.gt]: new Date()
                }
            },
            attributes: ['id', 'createdAt', 'lastUsedAt', 'expiresAt', 'userAgent', 'ipAddress'],
            order: [['lastUsedAt', 'DESC']]
        });

        return sessions.map(s => s.toJSON());
    } catch (error) {
        authLogger.error(error, 'Error getting user active sessions');
        throw error;
    }
};

/**
 * Revocar una sesión específica por ID
 * @param {string} sessionId - ID del refresh token
 * @param {string} userId - ID del usuario (para verificar ownership)
 * @param {string} reason - Motivo de revocación
 * @returns {Promise<boolean>} - true si se revocó
 */
export const revokeSessionById = async (sessionId, userId, reason = 'logout') => {
    try {
        const [affectedRows] = await RefreshToken.update(
            {
                isRevoked: true,
                revokedAt: new Date(),
                revokedReason: reason
            },
            {
                where: {
                    id: sessionId,
                    userId,
                    isRevoked: false
                }
            }
        );

        return affectedRows > 0;
    } catch (error) {
        authLogger.error(error, 'Error revoking session by ID');
        throw error;
    }
};
