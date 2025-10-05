// modules/auth/models/RefreshToken.js
// Modelo de Refresh Token - Gestión de sesiones y rotación de tokens

import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo RefreshToken - Tokens de refresco para autenticación JWT
 * Implementa rotación de tokens y detección de robo
 * 
 * Campos principales:
 * - id: UUID v7 (clave primaria)
 * - user_id: FK a users (dueño de la sesión)
 * - token_hash: SHA-256 del refresh token (nunca almacenar en claro)
 * - expires_at: Fecha de expiración absoluta (14 días desde creación)
 * - last_used_at: Última vez que se usó para refresh (para idle timeout)
 * - is_revoked: Token revocado manualmente (logout, cambio password, etc)
 * - revoked_at: Timestamp de revocación
 * - revoked_reason: Motivo (logout, password_change, suspicious_activity, expired)
 * - user_agent: User agent del navegador (solo auditoría)
 * - ip_address: IP del cliente (solo auditoría)
 * 
 * Reglas de seguridad:
 * - Tokens hasheados en BD (SHA-256) para prevenir robo de BD
 * - Rotación automática: al hacer refresh, el token viejo se revoca
 * - Idle timeout: si no se usa en 7 días, se auto-revoca
 * - Detección de robo: si se intenta usar un token revocado, se revocan todos
 */
const RefreshToken = sequelize.define(
    'RefreshToken',
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            comment: 'UUID v7 - clave primaria time-ordered'
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            comment: 'FK a users - dueño de la sesión'
        },
        token_hash: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
            comment: 'SHA-256 hash del refresh token (nunca almacenar en claro)'
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
            comment: 'Fecha de expiración absoluta del token (14 días desde creación)'
        },
        last_used_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: 'Última vez que se usó para refresh (para idle timeout de 7 días)'
        },
        is_revoked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            comment: 'Token revocado manualmente (logout, password change, detección de robo)'
        },
        revoked_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp de revocación (null si no revocado)'
        },
        revoked_reason: {
            type: DataTypes.ENUM('logout', 'logout_all', 'password_change', 'suspicious_activity', 'expired', 'idle_timeout', 'rotated'),
            allowNull: true,
            comment: 'Motivo de revocación para auditoría'
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'User agent del navegador (solo para auditoría, no validación)'
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
            comment: 'IP del cliente en formato IPv4 o IPv6 (solo para auditoría, no validación)'
        }
    },
    {
        tableName: 'refresh_tokens',
        comment: 'Refresh tokens para rotación y gestión de sesiones JWT',
        timestamps: true,
        underscored: true,
        paranoid: true,
        indexes: [
            {
                fields: ['user_id'],
                name: 'idx_refresh_tokens_user_id'
            },
            {
                fields: ['token_hash'],
                unique: true,
                name: 'idx_refresh_tokens_token_hash'
            },
            {
                fields: ['expires_at'],
                name: 'idx_refresh_tokens_expires_at'
            },
            {
                fields: ['is_revoked'],
                name: 'idx_refresh_tokens_is_revoked'
            },
            {
                // Índice compuesto para limpieza de tokens expirados/revocados
                fields: ['is_revoked', 'expires_at'],
                name: 'idx_refresh_tokens_cleanup'
            }
        ]
    }
);

// Relaciones
RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
};

export default RefreshToken;
