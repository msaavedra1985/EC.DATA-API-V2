import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de País
 * Tabla de referencia con códigos ISO 3166-1
 * No usa UUID v7 - es tabla de referencia estática
 */
const Country = sequelize.define('Country', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID incremental - tabla de referencia'
    },
    iso_alpha2: {
        type: DataTypes.STRING(2),
        allowNull: false,
        unique: true,
        comment: 'Código ISO 3166-1 alpha-2 (ej: AR, US, ES)'
    },
    iso_alpha3: {
        type: DataTypes.STRING(3),
        allowNull: false,
        unique: true,
        comment: 'Código ISO 3166-1 alpha-3 (ej: ARG, USA, ESP)'
    },
    iso_numeric: {
        type: DataTypes.STRING(3),
        allowNull: false,
        unique: true,
        comment: 'Código ISO 3166-1 numérico (ej: 032, 840, 724)'
    },
    phone_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Código telefónico internacional (ej: +54, +1, +34)'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el país está activo en el sistema'
    }
}, {
    tableName: 'countries',
    timestamps: true,
    underscored: true,
    paranoid: false, // No soft delete para tabla de referencia
    indexes: [
        {
            fields: ['iso_alpha2']
        },
        {
            fields: ['iso_alpha3']
        },
        {
            fields: ['is_active']
        }
    ],
    comment: 'Tabla de referencia de países con códigos ISO 3166-1'
});

export default Country;
