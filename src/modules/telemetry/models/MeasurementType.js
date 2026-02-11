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
    table_prefix: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '',
        comment: 'Prefijo de tablas en Cassandra (vacío=energía, sim=IoT)'
    },
    is_active: {
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
    // MeasurementType tiene muchas traducciones
    MeasurementType.hasMany(models.MeasurementTypeTranslation, {
        foreignKey: 'measurement_type_id',
        as: 'translations'
    });

    // MeasurementType tiene muchas variables
    MeasurementType.hasMany(models.Variable, {
        foreignKey: 'measurement_type_id',
        as: 'variables'
    });

    // MeasurementType tiene muchos channels
    MeasurementType.hasMany(models.Channel, {
        foreignKey: 'measurement_type_id',
        as: 'channels'
    });
};

export default MeasurementType;
