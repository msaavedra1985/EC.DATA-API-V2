import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import Country from './Country.js';

/**
 * Modelo de Traducciones de País
 * Soporta nombres de países en múltiples idiomas (español, inglés, etc.)
 * Patrón: entidad + traducciones en tabla separada
 */
const CountryTranslation = sequelize.define('CountryTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    country_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'countries',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a tabla countries'
    },
    lang: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'Código de idioma (es, en, pt, etc.)'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del país en el idioma especificado'
    },
    official_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Nombre oficial completo del país'
    }
}, {
    tableName: 'country_translations',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            unique: true,
            fields: ['country_id', 'lang'],
            name: 'unique_country_lang'
        },
        {
            fields: ['lang']
        }
    ],
    comment: 'Traducciones de nombres de países en múltiples idiomas'
});

/**
 * Relaciones entre Country y CountryTranslation
 */
Country.hasMany(CountryTranslation, {
    foreignKey: 'country_id',
    as: 'translations',
    onDelete: 'CASCADE'
});

CountryTranslation.belongsTo(Country, {
    foreignKey: 'country_id',
    as: 'country'
});

export default CountryTranslation;
