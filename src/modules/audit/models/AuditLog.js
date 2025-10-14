// modules/audit/models/AuditLog.js
// Modelo global de auditoría - Logs de todas las operaciones CUD del sistema

import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo AuditLog - Tabla global de auditoría
 * 
 * MANDATORY: Toda operación CREATE, UPDATE, DELETE debe registrarse aquí
 * 
 * Campos principales:
 * - entity_type: Tipo de entidad (organization, user, product, etc.)
 * - entity_id: Identificador de la entidad (preferentemente public_code)
 * - action: Acción realizada (created, updated, deleted, activated, etc.)
 * - performed_by: UUID del usuario que realizó la acción
 * - changes: JSONB con los cambios { field: { old: "...", new: "..." } }
 * - metadata: JSONB con información contextual adicional
 * - ip_address: IP del cliente
 * - user_agent: User agent del navegador/cliente
 * 
 * Índices optimizados para:
 * - Consultas por entidad (entity_type + entity_id)
 * - Consultas por usuario (performed_by + performed_at DESC)
 * - Consultas por fecha (performed_at DESC)
 * - Consultas por acción (entity_type + action)
 */
const AuditLog = sequelize.define(
    'AuditLog',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV7,
            primaryKey: true,
            comment: 'UUID v7 - clave primaria time-ordered'
        },
        entity_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Tipo de entidad afectada (organization, user, product, order, etc.)'
        },
        entity_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Identificador de la entidad (preferentemente public_code o UUID)'
        },
        action: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Acción realizada (created, updated, deleted, activated, deactivated, etc.)'
        },
        performed_by: {
            type: DataTypes.UUID,
            allowNull: true, // null = sistema automático
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            comment: 'Usuario que realizó la acción (null = sistema automático)'
        },
        performed_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: 'Timestamp exacto de la acción'
        },
        ip_address: {
            type: DataTypes.INET,
            allowNull: true,
            comment: 'Dirección IP del cliente'
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'User agent del navegador/cliente para tracking de seguridad'
        },
        changes: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Cambios realizados: { field: { old: value, new: value } }'
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Información contextual adicional (nombres, descripciones, etc.)'
        },
        correlation_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'ID de correlación para vincular auditorías con errores (opcional)'
        }
    },
    {
        tableName: 'audit_logs',
        timestamps: false, // Usamos performed_at manualmente
        underscored: true,
        paranoid: false, // No soft delete en logs de auditoría
        indexes: [
            {
                name: 'idx_audit_entity',
                fields: ['entity_type', 'entity_id'],
                comment: 'Índice para consultar logs de una entidad específica'
            },
            {
                name: 'idx_audit_user',
                fields: ['performed_by', { name: 'performed_at', order: 'DESC' }],
                comment: 'Índice para consultar acciones de un usuario ordenadas por fecha'
            },
            {
                name: 'idx_audit_date',
                fields: [{ name: 'performed_at', order: 'DESC' }],
                comment: 'Índice para consultas de actividad reciente'
            },
            {
                name: 'idx_audit_action',
                fields: ['entity_type', 'action'],
                comment: 'Índice para filtrar por tipo de acción'
            },
            {
                name: 'idx_audit_correlation_id',
                fields: ['correlation_id'],
                comment: 'Índice para correlación con error_logs'
            }
        ]
    }
);

/**
 * Hook para asegurar que performed_at siempre esté presente
 */
AuditLog.beforeCreate((auditLog) => {
    if (!auditLog.performed_at) {
        auditLog.performed_at = new Date();
    }
});

export default AuditLog;
