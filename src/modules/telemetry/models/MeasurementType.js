import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de MeasurementType (Tipo de Medición)
 * 
 * Define los tipos de medición disponibles y su mapeo a tablas de Cassandra.
 * El campo 'table_prefix' indica el prefijo de tabla en Cassandra:
 * - '' (vacío): tablas de energía eléctrica (1m_t_datos, 60m_t_datos)
 * - 'sim': tablas IoT (sim1m_t_datos, sim60m_t_datos)
 */
const MeasurementType = sequelize.define('MeasurementType', {
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
        comment: 'Código slug inmutable en inglés (ej: electric_energy, iot_control)'
    },
    tablePrefix: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '',
        comment: 'Prefijo de tablas en Cassandra (vacío=energía, sim=IoT)'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el tipo de medición está activo'
    }
}, {
    tableName: 'measurement_types',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            fields: ['table_prefix']
        },
        {
            fields: ['is_active']
        }
    ],
    comment: 'Tipos de medición con mapeo a tablas de Cassandra'
});

/**
 * Relaciones del modelo MeasurementType
 */
MeasurementType.associate = (models) => {
    MeasurementType.hasMany(models.MeasurementTypeTranslation, {
        foreignKey: 'measurementTypeId',
        as: 'translations'
    });

    MeasurementType.hasMany(models.Variable, {
        foreignKey: 'measurementTypeId',
        as: 'variables'
    });

    MeasurementType.hasMany(models.Channel, {
        foreignKey: 'measurementTypeId',
        as: 'channels'
    });
};

export default MeasurementType;
