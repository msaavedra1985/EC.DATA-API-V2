import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const Dashboard = sequelize.define('Dashboard', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    publicCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: DSH-7K9D2-X) - previene enumeración'
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
        comment: 'FK a organizations - organización dueña del dashboard'
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
    size: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'FREE',
        comment: 'Resolución del canvas: FREE, HD (1920x1080), VERTICAL (1080x1920), CUSTOM'
    },
    positioning: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'AUTO',
        comment: 'Modo de posicionamiento de widgets: AUTO (grid), FLOAT (libre)'
    },
    customWidth: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Ancho personalizado en px (solo cuando size=CUSTOM, rango 800-3840)'
    },
    customHeight: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Alto personalizado en px (solo cuando size=CUSTOM, rango 600-2160)'
    },
    isHome: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si este dashboard es el home del usuario en la organización'
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si el dashboard es visible para todos los usuarios de la org'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft delete flag'
    },
    settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Configuración extensible del dashboard (forceK, backgroundImage, etc.)'
    },
    pageCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Contador de páginas en el dashboard (denormalizado para performance)'
    },
    widgetCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Contador total de widgets en el dashboard (denormalizado para performance)'
    },
    templateId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Referencia a template usado para crear el dashboard (sin FK por ahora)'
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

Dashboard.associate = (models) => {
    Dashboard.belongsTo(models.Organization, {
        foreignKey: 'organizationId',
        as: 'organization'
    });

    Dashboard.belongsTo(models.User, {
        foreignKey: 'ownerId',
        as: 'owner'
    });

    Dashboard.hasMany(models.DashboardPage, {
        foreignKey: 'dashboardId',
        as: 'pages',
        onDelete: 'CASCADE'
    });

    Dashboard.hasMany(models.DashboardCollaborator, {
        foreignKey: 'dashboardId',
        as: 'collaborators',
        onDelete: 'CASCADE'
    });

    Dashboard.belongsToMany(models.DashboardGroup, {
        through: models.DashboardGroupItem,
        foreignKey: 'dashboardId',
        otherKey: 'dashboardGroupId',
        as: 'groups'
    });
};

export default Dashboard;
