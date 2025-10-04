// modules/auth/models/User.js
// Modelo de Usuario con Sequelize - Autenticación y autorización

import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo User - Usuarios del sistema con autenticación JWT
 * Sistema de identificadores: UUID v7 + human_id + public_code
 * 
 * Campos principales:
 * - id: UUID v7 (clave primaria, time-ordered)
 * - human_id: Incremental por organization_id (solo uso interno/soporte)
 * - public_code: ID público opaco (formato: EC-XXXXX-Y)
 * - email: Único, usado para login
 * - password_hash: bcrypt hash (nunca devolver al cliente)
 * - first_name, last_name: Nombre completo
 * - role: admin | manager | user (para autorización basada en roles)
 * - organization_id: FK a organizations (multi-tenancy)
 * - is_active: Habilitar/deshabilitar usuarios sin eliminar
 * - last_login_at: Tracking de actividad
 * - email_verified_at: Verificación de email
 */
const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            comment: 'UUID v7 - clave primaria time-ordered'
        },
        human_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'ID incremental scoped por organization_id (solo uso interno/soporte)'
        },
        public_code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'ID público opaco (ej: EC-7K9D2-X) - previene enumeración'
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: {
                    msg: 'Debe ser un email válido'
                }
            },
            comment: 'Email único para login'
        },
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'Hash bcrypt de la contraseña (nunca devolver al cliente)'
        },
        first_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Nombre del usuario'
        },
        last_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Apellido del usuario'
        },
        role: {
            type: DataTypes.ENUM('admin', 'manager', 'user'),
            defaultValue: 'user',
            allowNull: false,
            comment: 'Rol para control de acceso basado en roles (RBAC)'
        },
        organization_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'organizations',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
            comment: 'FK a organizations para multi-tenancy (null = usuario global)'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            comment: 'Usuario activo/inactivo (soft disable)'
        },
        last_login_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Última fecha de login exitoso'
        },
        email_verified_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Fecha de verificación de email (null = no verificado)'
        }
    },
    {
        tableName: 'users',
        comment: 'Usuarios del sistema con autenticación JWT',
        indexes: [
            {
                unique: true,
                fields: ['email'],
                name: 'users_email_unique'
            },
            {
                unique: true,
                fields: ['public_code'],
                name: 'users_public_code_unique'
            },
            {
                unique: true,
                fields: ['organization_id', 'human_id'],
                name: 'users_org_human_id_unique',
                comment: 'human_id es único dentro de cada organización'
            },
            {
                fields: ['organization_id'],
                name: 'users_organization_id_idx'
            },
            {
                fields: ['role'],
                name: 'users_role_idx'
            },
            {
                fields: ['is_active'],
                name: 'users_is_active_idx'
            }
        ]
    }
);

/**
 * Método de instancia para verificar si el usuario es admin
 * @returns {boolean}
 */
User.prototype.isAdmin = function () {
    return this.role === 'admin';
};

/**
 * Método de instancia para verificar si el usuario es manager
 * @returns {boolean}
 */
User.prototype.isManager = function () {
    return this.role === 'manager' || this.role === 'admin';
};

/**
 * Método de instancia para obtener nombre completo
 * @returns {string}
 */
User.prototype.getFullName = function () {
    return `${this.first_name} ${this.last_name}`.trim();
};

export default User;
