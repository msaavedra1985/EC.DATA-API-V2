import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import Country from './Country.js';

/**
 * Modelo de Traducciones de País
 * Soporta nombres de países en múltiples idiomas (español, inglés, etc.)
 * FK: country_code → countries.iso_alpha2
 */
const CountryTranslation = sequelize.define('CountryTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    countryCode: {
        type: DataTypes.STRING(2),
        allowNull: false,
        references: {
            model: 'countries',
            key: 'iso_alpha2'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a countries.iso_alpha2'
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
    officialName: {
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
            fields: ['country_code', 'lang'],
            name: 'unique_country_code_lang'
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
    foreignKey: 'countryCode',
    sourceKey: 'isoAlpha2',
    as: 'translations',
    onDelete: 'CASCADE'
});

CountryTranslation.belongsTo(Country, {
    foreignKey: 'countryCode',
    targetKey: 'isoAlpha2',
    as: 'country'
});

export default CountryTranslation;
