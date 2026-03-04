import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import Organization from '../../organizations/models/Organization.js';
import User from './User.js';

const UserOrganization = sequelize.define('UserOrganization', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        comment: 'UUID v7 - clave primaria'
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
        comment: 'FK a users - usuario'
    },
    organizationId: {
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
    isPrimary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si es la organización primaria del usuario'
    },
    joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha cuando el usuario se unió a la organización'
    },
    roleInOrg: {
        type: DataTypes.ENUM('admin', 'member', 'viewer'),
        allowNull: false,
        defaultValue: 'member',
        comment: 'Rol del usuario dentro de esta organización específica'
    }
}, {
    tableName: 'user_organizations',
    timestamps: true,
    underscored: true,
    paranoid: true,
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

UserOrganization.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization'
});

UserOrganization.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

export default UserOrganization;
