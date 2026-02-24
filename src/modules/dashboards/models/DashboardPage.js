import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const DashboardPage = sequelize.define('DashboardPage', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
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
        comment: 'FK a dashboards - dashboard padre'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre de la pestaña (ej: Energía, Clima)'
    },
    orderIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden de la pestaña dentro del dashboard'
    },
    orderNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID público secuencial de la página dentro del dashboard (1, 2, 3...)'
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

DashboardPage.associate = (models) => {
    DashboardPage.belongsTo(models.Dashboard, {
        foreignKey: 'dashboardId',
        as: 'dashboard'
    });

    DashboardPage.hasMany(models.Widget, {
        foreignKey: 'dashboardPageId',
        as: 'widgets',
        onDelete: 'CASCADE'
    });
};

export default DashboardPage;
