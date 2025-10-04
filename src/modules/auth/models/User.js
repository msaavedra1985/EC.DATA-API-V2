// modules/auth/models/User.js
// Modelo de Usuario con Sequelize - Autenticación y autorización

import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo User - Usuarios del sistema con autenticación JWT
 * 
 * Campos principales:
 * - id: UUID generado automáticamente
 * - email: Único, usado para login
 * - password_hash: bcrypt hash (nunca devolver al cliente)
 * - first_name, last_name: Nombre completo
 * - role: admin | manager | user (para autorización basada en roles)
 * - tenant_id: Soporte multi-tenancy (null para usuarios globales)
 * - is_active: Habilitar/deshabilitar usuarios sin eliminar
 * - last_login_at: Tracking de actividad
 * - email_verified_at: Verificación de email
 */
const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            comment: 'Identificador único del usuario'
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
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'ID del tenant para multi-tenancy (null = usuario global)'
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
                fields: ['tenant_id'],
                name: 'users_tenant_id_idx'
            },
            {
                fields: ['role'],
                name: 'users_role_idx'
            },
            {
                fields: ['is_active'],
                name: 'users_is_active_idx'
            }
        ],
        // Hook para asegurar que password_hash nunca se serialice en JSON
        hooks: {
            afterFind: (instances) => {
                // Si es un array de instancias
                if (Array.isArray(instances)) {
                    instances.forEach((instance) => {
                        if (instance) {
                            delete instance.dataValues.password_hash;
                        }
                    });
                } else if (instances) {
                    // Si es una sola instancia
                    delete instances.dataValues.password_hash;
                }
            }
        }
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
