import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo DashboardGroupItem
 * Tabla intermedia N:M ordenada entre Dashboard y DashboardGroup.
 * Permite que un dashboard pertenezca a múltiples grupos con orden independiente.
 */
const DashboardGroupItem = sequelize.define('DashboardGroupItem', {
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
    order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden del dashboard dentro del grupo'
    }
}, {
    tableName: 'dashboard_group_items',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
        { fields: ['dashboard_group_id'], name: 'dashboard_group_items_group_id_idx' },
        { fields: ['dashboard_id'], name: 'dashboard_group_items_dashboard_id_idx' },
        {
            fields: ['dashboard_group_id', 'dashboard_id'],
            unique: true,
            name: 'dashboard_group_items_unique_pair'
        }
    ]
});

/**
 * Relaciones del modelo DashboardGroupItem
 */
DashboardGroupItem.associate = (models) => {
    DashboardGroupItem.belongsTo(models.DashboardGroup, {
        foreignKey: 'dashboard_group_id',
        as: 'group'
    });

    DashboardGroupItem.belongsTo(models.Dashboard, {
        foreignKey: 'dashboard_id',
        as: 'dashboard'
    });
};

export default DashboardGroupItem;
