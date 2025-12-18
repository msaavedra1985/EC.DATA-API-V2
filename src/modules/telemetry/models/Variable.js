import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Variable (Diccionario de Variables de Medición)
 * 
 * Define las variables disponibles para cada tipo de medición.
 * El campo 'column_name' indica qué columna leer en Cassandra.
 * 
 * Ejemplos:
 * - Energía: column_name='e' → columna 'e' en 1m_t_datos
 * - Temperatura: column_name='val1' → columna 'val1' en sim1m_t_datos
 */
const Variable = sequelize.define('Variable', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID incremental - clave primaria'
    },
    measurement_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'measurement_types',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a measurement_types - tipo de medición al que pertenece'
    },
    column_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Nombre de columna en Cassandra (ej: e, p, val1, val2)'
    },
    unit: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Unidad de medida (ej: Wh, W, °C, %)'
    },
    chart_type: {
        type: DataTypes.ENUM('column', 'spline', 'line', 'area', 'bar', 'pie', 'scatter', 'gauge', 'none'),
        allowNull: true,
        defaultValue: 'spline',
        comment: 'Tipo de gráfico recomendado para visualización'
    },
    axis_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Nombre del eje para gráficos (ej: Energia (Wh))'
    },
    axis_id: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'ID del eje para agrupar variables en el mismo eje'
    },
    axis_min: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Valor mínimo del eje (null = auto)'
    },
    axis_function: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Función de agregación para tablas (total, avg, etc.)'
    },
    aggregation_type: {
        type: DataTypes.ENUM('sum', 'avg', 'min', 'max', 'count', 'last', 'first', 'none'),
        allowNull: true,
        defaultValue: 'none',
        comment: 'Tipo de agregación por defecto para esta variable'
    },
    display_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Orden de visualización en listas y gráficos'
    },
    show_in_billing: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Mostrar en sección de facturación'
    },
    show_in_analysis: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Mostrar en sección de análisis'
    },
    is_realtime: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si la variable soporta visualización en tiempo real'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si es la variable por defecto del tipo de medición'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la variable está activa'
    }
}, {
    tableName: 'variables',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            fields: ['measurement_type_id']
        },
        {
            fields: ['measurement_type_id', 'column_name'],
            name: 'variables_type_column_idx'
        },
        {
            fields: ['is_active']
        },
        {
            fields: ['display_order']
        }
    ],
    comment: 'Diccionario de variables de medición con mapeo a columnas de Cassandra'
});

/**
 * Relaciones del modelo Variable
 */
Variable.associate = (models) => {
    // Variable pertenece a MeasurementType
    Variable.belongsTo(models.MeasurementType, {
        foreignKey: 'measurement_type_id',
        as: 'measurementType'
    });

    // Variable tiene muchas traducciones
    Variable.hasMany(models.VariableTranslation, {
        foreignKey: 'variable_id',
        as: 'translations'
    });

    // Variable tiene muchas relaciones con channels
    Variable.belongsToMany(models.Channel, {
        through: models.ChannelVariable,
        foreignKey: 'variable_id',
        otherKey: 'channel_id',
        as: 'channels'
    });
};

export default Variable;
