import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const RefreshToken = sequelize.define(
    'RefreshToken',
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            comment: 'UUID v7 - clave primaria time-ordered'
        },
        userId: {
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
        tokenHash: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
            comment: 'SHA-256 hash del refresh token (nunca almacenar en claro)'
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
            comment: 'Fecha de expiración absoluta del token (14 días desde creación)'
        },
        lastUsedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: 'Última vez que se usó para refresh (para idle timeout de 7 días)'
        },
        isRevoked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            comment: 'Token revocado manualmente (logout, password change, detección de robo)'
        },
        revokedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp de revocación (null si no revocado)'
        },
        revokedReason: {
            type: DataTypes.ENUM('logout', 'logout_all', 'password_change', 'suspicious_activity', 'expired', 'idle_timeout', 'rotated'),
            allowNull: true,
            comment: 'Motivo de revocación para auditoría'
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'User agent del navegador (solo para auditoría, no validación)'
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            comment: 'IP del cliente en formato IPv4 o IPv6 (solo para auditoría, no validación)'
        },
        rememberMe: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            comment: 'Si true, el token usa duración extendida (90 días refresh, 30 días idle) en lugar de la normal (14 días refresh, 7 días idle)'
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
                fields: ['is_revoked', 'expires_at'],
                name: 'idx_refresh_tokens_cleanup'
            }
        ]
    }
);

RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
    });
};

export default RefreshToken;
