import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo DashboardPage
 * Representa una pestaña/página dentro de un dashboard (similar a tabs de Excel).
 * Cada página contiene widgets independientes.
 */
const DashboardPage = sequelize.define('DashboardPage', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
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
        comment: 'FK a dashboards - dashboard padre'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre de la pestaña (ej: Energía, Clima)'
    },
    order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden de la pestaña dentro del dashboard'
    }
}, {
    tableName: 'dashboard_pages',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['dashboard_id'], name: 'dashboard_pages_dashboard_id_idx' },
        { fields: ['dashboard_id', 'order_index'], name: 'dashboard_pages_order_idx' }
    ]
});

/**
 * Relaciones del modelo DashboardPage
 */
DashboardPage.associate = (models) => {
    DashboardPage.belongsTo(models.Dashboard, {
        foreignKey: 'dashboard_id',
        as: 'dashboard'
    });

    DashboardPage.hasMany(models.Widget, {
        foreignKey: 'dashboard_page_id',
        as: 'widgets',
        onDelete: 'CASCADE'
    });
};

export default DashboardPage;
