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
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Código slug inmutable con prefijo del tipo (ej: ee_power, iot_temperature)'
    },
    measurementTypeId: {
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
    columnName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Nombre de columna en Cassandra (ej: e, p, val1, val2)'
    },
    unit: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Unidad de medida (ej: Wh, W, °C, %)'
    },
    chartType: {
        type: DataTypes.ENUM('column', 'spline', 'line', 'area', 'bar', 'pie', 'scatter', 'gauge', 'none'),
        allowNull: true,
        defaultValue: 'spline',
        comment: 'Tipo de gráfico recomendado para visualización'
    },
    axisName: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Nombre del eje para gráficos (ej: Energia (Wh))'
    },
    axisId: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'ID del eje para agrupar variables en el mismo eje'
    },
    axisMin: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Valor mínimo del eje (null = auto)'
    },
    axisFunction: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Función de agregación para tablas (total, avg, etc.)'
    },
    aggregationType: {
        type: DataTypes.ENUM('sum', 'avg', 'min', 'max', 'count', 'last', 'first', 'none'),
        allowNull: true,
        defaultValue: 'none',
        comment: 'Tipo de agregación por defecto para esta variable'
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Orden de visualización en listas y gráficos'
    },
    showInBilling: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Mostrar en sección de facturación'
    },
    showInAnalysis: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Mostrar en sección de análisis'
    },
    isRealtime: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si la variable soporta visualización en tiempo real'
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si es la variable por defecto del tipo de medición'
    },
    mqttKey: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: null,
        comment: 'Key exacta como llega en el payload MQTT (ej: PF, E, P). NULL si no aplica para realtime'
    },
    decimalPlaces: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 2,
        comment: 'Cantidad de decimales para formatear el valor en UI (ej: 2 para 1.23 kWh)'
    },
    icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: null,
        comment: 'Nombre del ícono para representar la variable (lucide, heroicons, etc.)'
    },
    color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        defaultValue: null,
        comment: 'Color hex para la variable en gráficos y UI (ej: #3B82F6)'
    },
    isActive: {
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
    Variable.belongsTo(models.MeasurementType, {
        foreignKey: 'measurementTypeId',
        as: 'measurementType'
    });

    Variable.hasMany(models.VariableTranslation, {
        foreignKey: 'variableId',
        as: 'translations'
    });

    Variable.belongsToMany(models.Channel, {
        through: models.ChannelVariable,
        foreignKey: 'variableId',
        otherKey: 'channelId',
        as: 'channels'
    });
};

export default Variable;
