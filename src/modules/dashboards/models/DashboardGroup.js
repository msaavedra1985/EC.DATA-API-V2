import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo DashboardGroup (Playlist)
 * Permite agrupar dashboards para presentaciones secuenciales o categorización.
 * 
 * - id: UUID v7 (clave primaria, interno)
 * - public_code: ID opaco público (formato: DGR-XXXXX-Y)
 */
const DashboardGroup = sequelize.define('DashboardGroup', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    public_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: DGR-7K9D2-X) - previene enumeración'
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
        comment: 'FK a organizations - organización dueña del grupo'
    },
    owner_id: {
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
    is_active: {
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

/**
 * Relaciones del modelo DashboardGroup
 */
DashboardGroup.associate = (models) => {
    DashboardGroup.belongsTo(models.Organization, {
        foreignKey: 'organization_id',
        as: 'organization'
    });

    DashboardGroup.belongsTo(models.User, {
        foreignKey: 'owner_id',
        as: 'owner'
    });

    DashboardGroup.belongsToMany(models.Dashboard, {
        through: models.DashboardGroupItem,
        foreignKey: 'dashboard_group_id',
        otherKey: 'dashboard_id',
        as: 'dashboards'
    });

    DashboardGroup.hasMany(models.DashboardGroupCollaborator, {
        foreignKey: 'dashboard_group_id',
        as: 'collaborators',
        onDelete: 'CASCADE'
    });
};

export default DashboardGroup;
