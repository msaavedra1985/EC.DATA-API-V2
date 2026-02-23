import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const DashboardGroup = sequelize.define('DashboardGroup', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    publicCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: DGR-7K9D2-X) - previene enumeración'
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
        comment: 'FK a organizations - organización dueña del grupo'
    },
    ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a users - usuario creador del grupo'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre del grupo/playlist'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del grupo'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft delete flag'
    }
}, {
    tableName: 'dashboard_groups',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
        { fields: ['organization_id'], name: 'dashboard_groups_organization_id_idx' },
        { fields: ['owner_id'], name: 'dashboard_groups_owner_id_idx' },
        { fields: ['is_active'], name: 'dashboard_groups_is_active_idx' }
    ]
});

DashboardGroup.associate = (models) => {
    DashboardGroup.belongsTo(models.Organization, {
        foreignKey: 'organizationId',
        as: 'organization'
    });

    DashboardGroup.belongsTo(models.User, {
        foreignKey: 'ownerId',
        as: 'owner'
    });

    DashboardGroup.belongsToMany(models.Dashboard, {
        through: models.DashboardGroupItem,
        foreignKey: 'dashboardGroupId',
        otherKey: 'dashboardId',
        as: 'dashboards'
    });

    DashboardGroup.hasMany(models.DashboardGroupCollaborator, {
        foreignKey: 'dashboardGroupId',
        as: 'collaborators',
        onDelete: 'CASCADE'
    });
};

export default DashboardGroup;
