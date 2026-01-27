import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import City from './City.js';

/**
 * Modelo de Traducciones de Ciudad
 * Soporta nombres en múltiples idiomas (español, inglés, etc.)
 */
const CityTranslation = sequelize.define('CityTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    city_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'cities',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a cities.id'
    },
    lang: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'Código de idioma (es, en, pt)'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre de la ciudad en el idioma'
    }
}, {
    tableName: 'city_translations',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            unique: true,
            fields: ['city_id', 'lang'],
            name: 'unique_city_id_lang'
        },
        {
            fields: ['lang']
        }
    ],
    comment: 'Traducciones de nombres de ciudades'
});

/**
 * Relaciones
 */
City.hasMany(CityTranslation, {
    foreignKey: 'city_id',
    as: 'translations',
    onDelete: 'CASCADE'
});

CityTranslation.belongsTo(City, {
    foreignKey: 'city_id',
    as: 'city'
});

export default CityTranslation;
