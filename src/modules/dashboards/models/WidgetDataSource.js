import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo WidgetDataSource
 * Vincula un widget con un recurso real del sistema (canal, equipo, sitio, jerarquía).
 * Permite integridad referencial lógica via public_code sin FKs duras a múltiples tablas.
 * 
 * entity_type: 'channel' | 'device' | 'site' | 'resource_hierarchy'
 * entity_id: public_code del recurso (CHN-xxx, DEV-xxx, SIT-xxx, RES-xxx)
 */
const WidgetDataSource = sequelize.define('WidgetDataSource', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    widget_id: {
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
    entity_type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        comment: 'Tipo de recurso: channel, device, site, resource_hierarchy'
    },
    entity_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Public code del recurso (CHN-xxx, DEV-xxx, SIT-xxx, RES-xxx)'
    },
    label: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Etiqueta personalizada para esta fuente de datos en el widget'
    },
    series_config: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Config específica de esta serie: color override, eje Y, agregación, variable_id, etc.'
    },
    order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden de la serie dentro del widget'
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

/**
 * Relaciones del modelo WidgetDataSource
 */
WidgetDataSource.associate = (models) => {
    WidgetDataSource.belongsTo(models.Widget, {
        foreignKey: 'widget_id',
        as: 'widget'
    });
};

export default WidgetDataSource;
