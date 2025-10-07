// modules/auth/models/Role.js
// Modelo de Roles - Sistema RBAC (Role-Based Access Control)

import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo Role - Roles del sistema para control de acceso
 * 
 * Roles disponibles:
 * - system-admin: Control total de la plataforma (todas las organizaciones)
 * - org-admin: Administrador de su organización
 * - org-manager: Gestión operativa avanzada dentro de la org
 * - user: Usuario interno estándar
 * - viewer: Solo lectura (dashboards y reportes)
 * - guest: Acceso temporal o limitado
 * - demo: Usuario de entorno demostración (read-only)
 */
const Role = sequelize.define(
    'Role',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV7,
            primaryKey: true,
            comment: 'UUID v7 - clave primaria time-ordered'
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Nombre único del rol (system-admin, org-admin, etc.)'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'Descripción detallada de las responsabilidades del rol'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            comment: 'Habilitar/deshabilitar roles sin eliminar'
        }
    },
    {
        tableName: 'roles',
        timestamps: true,
        underscored: true,
        paranoid: false,
        indexes: [
            {
                unique: true,
                fields: ['name']
            }
        ]
    }
);

export default Role;
