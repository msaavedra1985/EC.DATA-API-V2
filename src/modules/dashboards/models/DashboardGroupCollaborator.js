import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo DashboardGroupCollaborator
 * ACL granular: vincula un usuario con un grupo de dashboards y define su nivel de acceso.
 * Un usuario solo puede tener un rol por grupo (constraint unique).
 * 
 * Roles: viewer (solo lectura), editor (puede modificar el grupo y sus items)
 */
const DashboardGroupCollaborator = sequelize.define('DashboardGroupCollaborator', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria'
    },
    dashboard_group_id: {
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

/**
 * Relaciones del modelo DashboardGroupCollaborator
 */
DashboardGroupCollaborator.associate = (models) => {
    DashboardGroupCollaborator.belongsTo(models.DashboardGroup, {
        foreignKey: 'dashboard_group_id',
        as: 'group'
    });

    DashboardGroupCollaborator.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
};

export default DashboardGroupCollaborator;
