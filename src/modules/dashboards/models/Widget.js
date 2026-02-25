import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const Widget = sequelize.define('Widget', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    dashboardPageId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'dashboard_pages',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a dashboard_pages - página contenedora'
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Tipo de widget: string libre definido por el frontend (snake_case, ej: line_chart, energy_gauge)'
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Título visible del widget'
    },
    layout: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: { x: 0, y: 0, w: 4, h: 2 },
        comment: 'Posición y tamaño en el grid GridStack: {x, y, w, h, minW?, minH?, maxW?, maxH?}'
    },
    styleConfig: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Configuración visual: colores, ejes, títulos, leyendas, etc.'
    },
    dataConfig: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Configuración de datos: agregación, rango temporal, filtros, etc.'
    },
    orderIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden del widget (para renderizado secuencial en mobile)'
    },
    orderNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID público secuencial del widget dentro de la página (1, 2, 3...)'
    }
}, {
    tableName: 'widgets',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['dashboard_page_id'], name: 'widgets_dashboard_page_id_idx' },
        { fields: ['type'], name: 'widgets_type_idx' }
    ]
});

Widget.associate = (models) => {
    Widget.belongsTo(models.DashboardPage, {
        foreignKey: 'dashboardPageId',
        as: 'page'
    });

    Widget.hasMany(models.WidgetDataSource, {
        foreignKey: 'widgetId',
        as: 'dataSources',
        onDelete: 'CASCADE'
    });
};

export default Widget;
