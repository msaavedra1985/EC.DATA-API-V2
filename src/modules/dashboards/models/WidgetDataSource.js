import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const WidgetDataSource = sequelize.define('WidgetDataSource', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    widgetId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'widgets',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a widgets - widget que consume este recurso'
    },
    entityType: {
        type: DataTypes.STRING(30),
        allowNull: false,
        comment: 'Tipo de recurso: channel, device, site, resource_hierarchy'
    },
    entityId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Public code del recurso (CHN-xxx, DEV-xxx, SIT-xxx, RES-xxx)'
    },
    label: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Etiqueta personalizada para esta fuente de datos en el widget'
    },
    seriesConfig: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Config específica de esta serie: color override, eje Y, agregación, variable_id, etc.'
    },
    orderIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden de la serie dentro del widget'
    },
    orderNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID público secuencial del data source dentro del widget (1, 2, 3...)'
    }
}, {
    tableName: 'widget_data_sources',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['widget_id'], name: 'widget_data_sources_widget_id_idx' },
        { fields: ['entity_type', 'entity_id'], name: 'widget_data_sources_entity_idx' }
    ]
});

WidgetDataSource.associate = (models) => {
    WidgetDataSource.belongsTo(models.Widget, {
        foreignKey: 'widgetId',
        as: 'widget'
    });
};

export default WidgetDataSource;
