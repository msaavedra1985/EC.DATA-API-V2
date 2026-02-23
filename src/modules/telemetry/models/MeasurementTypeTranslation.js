import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de MeasurementTypeTranslation (Traducciones de Tipos de Medición)
 * 
 * Almacena las traducciones de nombres de tipos de medición.
 * Sigue el patrón de internacionalización usado en country_translations.
 */
const MeasurementTypeTranslation = sequelize.define('MeasurementTypeTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID incremental - clave primaria'
    },
    measurementTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'measurement_types',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a tabla measurement_types'
    },
    lang: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'Código de idioma (es, en, pt, etc.)'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del tipo de medición en el idioma especificado'
    }
}, {
    tableName: 'measurement_type_translations',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            unique: true,
            fields: ['measurement_type_id', 'lang'],
            name: 'unique_measurement_type_lang'
        },
        {
            fields: ['lang']
        }
    ],
    comment: 'Traducciones de tipos de medición en múltiples idiomas'
});

/**
 * Relaciones del modelo MeasurementTypeTranslation
 */
MeasurementTypeTranslation.associate = (models) => {
    MeasurementTypeTranslation.belongsTo(models.MeasurementType, {
        foreignKey: 'measurementTypeId',
        as: 'measurementType'
    });
};

export default MeasurementTypeTranslation;
