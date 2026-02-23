import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const DashboardCollaborator = sequelize.define('DashboardCollaborator', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria'
    },
    dashboardId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'dashboards',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a dashboards'
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
    tableName: 'dashboard_collaborators',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['dashboard_id'], name: 'dashboard_collaborators_dashboard_id_idx' },
        { fields: ['user_id'], name: 'dashboard_collaborators_user_id_idx' },
        {
            fields: ['dashboard_id', 'user_id'],
            unique: true,
            name: 'dashboard_collaborators_unique_pair'
        }
    ]
});

DashboardCollaborator.associate = (models) => {
    DashboardCollaborator.belongsTo(models.Dashboard, {
        foreignKey: 'dashboardId',
        as: 'dashboard'
    });

    DashboardCollaborator.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
    });
};

export default DashboardCollaborator;
