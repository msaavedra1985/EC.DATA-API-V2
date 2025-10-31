import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import Organization from '../../organizations/models/Organization.js';
import User from './User.js';

/**
 * Modelo de relación Usuario-Organización (many-to-many)
 * Permite que un usuario pertenezca a múltiples organizaciones
 * 
 * Sistema Híbrido de Roles:
 * - users.role_id (global): system-admin, org-admin, user, etc.
 * - user_organizations.role_in_org (por organización): admin, member, viewer
 * 
 * Lógica de Permisos:
 * - system-admin: acceso total a todas las organizaciones
 * - org-admin (global) + role_in_org='admin': acceso a esa org + todas sus sub-organizaciones
 * - user (global) + role_in_org='admin': acceso a esa org + todas sus sub-organizaciones
 * - user (global) + role_in_org='member': acceso solo a esa organización específica
 * - user (global) + role_in_org='viewer': solo lectura de esa organización
 * 
 * Reglas:
 * - Un usuario SIEMPRE debe tener al menos 1 organización
 * - Solo puede tener 1 organización marcada como primaria (is_primary=true)
 */
const UserOrganization = sequelize.define('UserOrganization', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        comment: 'UUID v7 - clave primaria'
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
        comment: 'FK a users - usuario'
    },
    organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'organizations',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a organizations - organización'
    },
    is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si es la organización primaria del usuario'
    },
    joined_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha cuando el usuario se unió a la organización'
    },
    role_in_org: {
        type: DataTypes.ENUM('admin', 'member', 'viewer'),
        allowNull: false,
        defaultValue: 'member',
        comment: 'Rol del usuario dentro de esta organización específica'
    }
}, {
    tableName: 'user_organizations',
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft delete
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'organization_id'],
            where: { deleted_at: null },
            name: 'user_org_unique'
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['organization_id']
        },
        {
            fields: ['is_primary']
        },
        {
            fields: ['joined_at']
        },
        {
            fields: ['role_in_org']
        }
    ],
    comment: 'Relación many-to-many entre usuarios y organizaciones'
});

// Definir asociaciones inmediatamente después de crear el modelo
UserOrganization.belongsTo(Organization, {
    foreignKey: 'organization_id',
    as: 'organization'
});

UserOrganization.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

export default UserOrganization;
