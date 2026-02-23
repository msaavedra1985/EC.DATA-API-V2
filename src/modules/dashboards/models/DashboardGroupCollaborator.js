import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const DashboardGroupCollaborator = sequelize.define('DashboardGroupCollaborator', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria'
    },
    dashboardGroupId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'dashboard_groups',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a dashboard_groups'
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
        comment: 'FK a users - usuario colaborador'
    },
    role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'viewer',
        comment: 'Rol del colaborador: viewer, editor'
    }
}, {
    tableName: 'dashboard_group_collaborators',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['dashboard_group_id'], name: 'dg_collaborators_group_id_idx' },
        { fields: ['user_id'], name: 'dg_collaborators_user_id_idx' },
        {
            fields: ['dashboard_group_id', 'user_id'],
            unique: true,
            name: 'dg_collaborators_unique_pair'
        }
    ]
});

DashboardGroupCollaborator.associate = (models) => {
    DashboardGroupCollaborator.belongsTo(models.DashboardGroup, {
        foreignKey: 'dashboardGroupId',
        as: 'group'
    });

    DashboardGroupCollaborator.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
    });
};

export default DashboardGroupCollaborator;
