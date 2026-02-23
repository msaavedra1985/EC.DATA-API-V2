import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import { v7 as uuidv7 } from 'uuid';

/**
 * Modelo de Error Log
 * Registra todos los errores de la plataforma (frontend y backend)
 * Usado para auditoría, debugging y monitoreo
 */
const ErrorLog = sequelize.define('ErrorLog', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv7(),
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    source: {
        type: DataTypes.ENUM('frontend', 'backend'),
        allowNull: false,
        comment: 'Origen del error: frontend o backend'
    },
    level: {
        type: DataTypes.ENUM('error', 'warning', 'critical'),
        allowNull: false,
        defaultValue: 'error',
        comment: 'Nivel de severidad del error'
    },
    errorCode: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Código de error (ej: VALIDATION_ERROR, DATABASE_ERROR)'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Mensaje descriptivo del error'
    },
    stackTrace: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Stack trace completo del error (si está disponible)'
    },
    endpoint: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Endpoint de la API (ej: /api/v1/organizations)'
    },
    method: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Método HTTP (GET, POST, PUT, DELETE, etc)'
    },
    statusCode: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Código de estado HTTP (400, 500, etc)'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a users - usuario que generó el error (null = sistema/anónimo)'
    },
    organizationId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'organizations',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a organizations - organización del usuario (null = sin contexto org)'
    },
    sessionId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID de sesión para rastrear múltiples errores de una sesión'
    },
    ipAddress: {
        type: DataTypes.INET,
        allowNull: true,
        comment: 'Dirección IP del cliente'
    },
    userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'User agent del navegador/cliente'
    },
    requestId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID único de request para correlación con logs de Pino'
    },
    correlationId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID de correlación para vincular errores con auditorías (opcional)'
    },
    context: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Contexto adicional del error (URL, componente, acción, query params, etc)'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadata adicional (browser, OS, screen size, API version, etc)'
    }
}, {
    tableName: 'error_logs',
    underscored: true,
    timestamps: true,
    updatedAt: false,
    paranoid: false,
    indexes: [
        {
            fields: ['source'],
            name: 'idx_error_logs_source'
        },
        {
            fields: ['level'],
            name: 'idx_error_logs_level'
        },
        {
            fields: ['error_code'],
            name: 'idx_error_logs_error_code'
        },
        {
            fields: ['user_id'],
            name: 'idx_error_logs_user_id'
        },
        {
            fields: ['organization_id'],
            name: 'idx_error_logs_organization_id'
        },
        {
            fields: ['created_at'],
            name: 'idx_error_logs_created_at'
        },
        {
            fields: ['status_code'],
            name: 'idx_error_logs_status_code'
        },
        {
            fields: ['endpoint'],
            name: 'idx_error_logs_endpoint'
        },
        {
            fields: ['correlation_id'],
            name: 'idx_error_logs_correlation_id'
        }
    ]
});

export default ErrorLog;
