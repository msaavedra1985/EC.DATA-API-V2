import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import Country from '../../countries/models/Country.js';

/**
 * Modelo de Estado/Provincia
 * PK: code (natural key, formato: country_iso2 + "-" + state_code)
 * Ejemplo: AR-B (Buenos Aires), US-CA (California)
 */
const State = sequelize.define('State', {
    code: {
        type: DataTypes.STRING(10),
        primaryKey: true,
        allowNull: false,
        comment: 'Código único: country_code + "-" + state_code (ej: AR-B, US-CA)'
    },
    countryCode: {
        type: DataTypes.STRING(2),
        allowNull: false,
        references: {
            model: 'countries',
            key: 'iso_alpha2'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a countries.iso_alpha2'
    },
    stateCode: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Código del estado dentro del país (ej: B, CA)'
    },
    type: {
        type: DataTypes.ENUM('state', 'province', 'department', 'region', 'territory', 'district', 'other'),
        allowNull: true,
        comment: 'Tipo de división administrativa'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Latitud del centroide'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitud del centroide'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el estado está activo'
    }
}, {
    tableName: 'states',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            fields: ['country_code']
        },
        {
            fields: ['is_active']
        }
    ],
    comment: 'Estados/Provincias con PK natural (country_code-state_code)'
});

/**
 * Relaciones
 */
Country.hasMany(State, {
    foreignKey: 'countryCode',
    sourceKey: 'isoAlpha2',
    as: 'states'
});

State.belongsTo(Country, {
    foreignKey: 'countryCode',
    targetKey: 'isoAlpha2',
    as: 'country'
});

export default State;
