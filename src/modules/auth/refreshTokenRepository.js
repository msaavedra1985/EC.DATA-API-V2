// modules/auth/refreshTokenRepository.js
// Repositorio de RefreshToken - Capa de acceso a datos para gestión de sesiones

import { Op } from 'sequelize';
import crypto from 'crypto';
import RefreshToken from './models/RefreshToken.js';
import { generateUuidV7 } from '../../utils/identifiers.js';
import { config } from '../../config/env.js';

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
 * @returns {Promise<Object>} - Refresh token creado
 */
export const createRefreshToken = async ({ userId, token, expiresAt, userAgent = null, ipAddress = null }) => {
    try {
        const id = generateUuidV7();
        const tokenHash = hashToken(token);

        const refreshToken = await RefreshToken.create({
            id,
            user_id: userId,
            token_hash: tokenHash,
            expires_at: expiresAt,
            last_used_at: new Date(),
            user_agent: userAgent,
            ip_address: ipAddress
        });

        return refreshToken.toJSON();
    } catch (error) {
        console.error('Error creating refresh token:', error);
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
            where: { token_hash: tokenHash },
            paranoid: !includeDeleted // paranoid: false permite buscar tokens soft-deleted
        });

        return refreshToken ? refreshToken.toJSON() : null;
    } catch (error) {
        console.error('Error finding refresh token:', error);
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
                is_revoked: true,
                revoked_at: new Date(),
                revoked_reason: reason
            },
            {
                where: {
                    token_hash: tokenHash,
                    is_revoked: false
                }
            }
        );

        // Luego hacer soft delete (paranoid: true) para liberar el constraint unique
        const affectedRows = await RefreshToken.destroy({
            where: {
                token_hash: tokenHash
            }
        });

        return affectedRows > 0;
    } catch (error) {
        console.error('Error revoking refresh token:', error);
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
                is_revoked: true,
                revoked_at: new Date(),
                revoked_reason: reason
            },
            {
                where: {
                    user_id: userId,
                    is_revoked: false
                }
            }
        );

        // Luego hacer soft delete (paranoid: true) para liberar el constraint unique
        const affectedRows = await RefreshToken.destroy({
            where: {
                user_id: userId
            }
        });

        return affectedRows;
    } catch (error) {
        console.error('Error revoking all user tokens:', error);
        throw error;
    }
};

/**
 * Actualizar last_used_at de un token
 * @param {string} token - Token en texto plano
 * @returns {Promise<boolean>} - true si se actualizó
 */
export const updateLastUsed = async (token) => {
    try {
        const tokenHash = hashToken(token);
        
        const [affectedRows] = await RefreshToken.update(
            { last_used_at: new Date() },
            {
                where: {
                    token_hash: tokenHash,
                    is_revoked: false
                }
            }
        );

        return affectedRows > 0;
    } catch (error) {
        console.error('Error updating last_used_at:', error);
        throw error;
    }
};

/**
 * Verificar si un token está en idle timeout (no usado en X días)
 * @param {Object} refreshToken - Objeto refresh token de BD
 * @returns {boolean} - true si está en idle timeout
 */
export const isIdleTimeout = (refreshToken) => {
    const idleDays = config.jwt.refreshIdleDays;
    const idleMs = idleDays * 24 * 60 * 60 * 1000;
    const lastUsed = new Date(refreshToken.last_used_at);
    const now = new Date();
    
    return (now - lastUsed) > idleMs;
};

/**
 * Limpiar tokens expirados o en idle timeout
 * Se ejecuta periódicamente para mantener la BD limpia
 * @returns {Promise<number>} - Número de tokens eliminados
 */
export const cleanupExpiredTokens = async () => {
    try {
        const idleDays = config.jwt.refreshIdleDays;
        const idleCutoff = new Date();
        idleCutoff.setDate(idleCutoff.getDate() - idleDays);

        const deletedCount = await RefreshToken.destroy({
            where: {
                [Op.or]: [
                    // Tokens expirados
                    {
                        expires_at: {
                            [Op.lt]: new Date()
                        }
                    },
                    // Tokens en idle timeout
                    {
                        last_used_at: {
                            [Op.lt]: idleCutoff
                        }
                    },
                    // Tokens revocados hace más de 30 días (mantener historial limitado)
                    {
                        is_revoked: true,
                        revoked_at: {
                            [Op.lt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        }
                    }
                ]
            }
        });

        return deletedCount;
    } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
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
                user_id: userId,
                is_revoked: false,
                expires_at: {
                    [Op.gt]: new Date()
                }
            },
            attributes: ['id', 'created_at', 'last_used_at', 'expires_at', 'user_agent', 'ip_address'],
            order: [['last_used_at', 'DESC']]
        });

        return sessions.map(s => s.toJSON());
    } catch (error) {
        console.error('Error getting user active sessions:', error);
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
                is_revoked: true,
                revoked_at: new Date(),
                revoked_reason: reason
            },
            {
                where: {
                    id: sessionId,
                    user_id: userId,
                    is_revoked: false
                }
            }
        );

        return affectedRows > 0;
    } catch (error) {
        console.error('Error revoking session by ID:', error);
        throw error;
    }
};
