import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo DashboardCollaborator
 * ACL granular: vincula un usuario con un dashboard y define su nivel de acceso.
 * Un usuario solo puede tener un rol por dashboard (constraint unique).
 * 
 * Roles: viewer (solo lectura), editor (puede modificar widgets y config)
 */
const DashboardCollaborator = sequelize.define('DashboardCollaborator', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria'
    },
    dashboard_id: {
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
    user_id: {
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

/**
 * Relaciones del modelo DashboardCollaborator
 */
DashboardCollaborator.associate = (models) => {
    DashboardCollaborator.belongsTo(models.Dashboard, {
        foreignKey: 'dashboard_id',
        as: 'dashboard'
    });

    DashboardCollaborator.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
};

export default DashboardCollaborator;
