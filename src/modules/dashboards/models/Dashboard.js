import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo Dashboard
 * Entidad principal del módulo de dashboards y analytics.
 * Soporta múltiples páginas (pestañas), widgets y sistema de permisos granular.
 * 
 * - id: UUID v7 (clave primaria, interno)
 * - public_code: ID opaco público (formato: DSH-XXXXX-Y)
 */
const Dashboard = sequelize.define('Dashboard', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    public_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: DSH-7K9D2-X) - previene enumeración'
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
        comment: 'FK a organizations - organización dueña del dashboard'
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
        comment: 'FK a users - usuario creador del dashboard'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre del dashboard'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del dashboard'
    },
    icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Icono del dashboard (nombre o clase CSS)'
    },
    is_public: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si el dashboard es visible para todos los usuarios de la org'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft delete flag'
    }
}, {
    tableName: 'dashboards',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
        { fields: ['organization_id'], name: 'dashboards_organization_id_idx' },
        { fields: ['owner_id'], name: 'dashboards_owner_id_idx' },
        { fields: ['is_public'], name: 'dashboards_is_public_idx' },
        { fields: ['is_active'], name: 'dashboards_is_active_idx' }
    ]
});

/**
 * Relaciones del modelo Dashboard
 */
Dashboard.associate = (models) => {
    Dashboard.belongsTo(models.Organization, {
        foreignKey: 'organization_id',
        as: 'organization'
    });

    Dashboard.belongsTo(models.User, {
        foreignKey: 'owner_id',
        as: 'owner'
    });

    Dashboard.hasMany(models.DashboardPage, {
        foreignKey: 'dashboard_id',
        as: 'pages',
        onDelete: 'CASCADE'
    });

    Dashboard.hasMany(models.DashboardCollaborator, {
        foreignKey: 'dashboard_id',
        as: 'collaborators',
        onDelete: 'CASCADE'
    });

    Dashboard.belongsToMany(models.DashboardGroup, {
        through: models.DashboardGroupItem,
        foreignKey: 'dashboard_id',
        otherKey: 'dashboard_group_id',
        as: 'groups'
    });
};

export default Dashboard;
