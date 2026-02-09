import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import Organization from './Organization.js';
import Country from '../../countries/models/Country.js';

/**
 * Modelo de relación Organización-País (muchos a muchos)
 * Tabla intermedia que permite asignar múltiples países a una organización
 */
const OrganizationCountry = sequelize.define('OrganizationCountry', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        comment: 'UUID - clave primaria'
    },
    organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'organizations',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a organizations.id'
    },
    country_code: {
        type: DataTypes.STRING(2),
        allowNull: false,
        references: {
            model: 'countries',
            key: 'iso_alpha2'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a countries.iso_alpha2 - código ISO del país'
    },
    is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si es el país principal de la organización'
    }
}, {
    tableName: 'organization_countries',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            fields: ['organization_id']
        },
        {
            fields: ['country_code']
        },
        {
            unique: true,
            fields: ['organization_id', 'country_code']
        }
    ],
    comment: 'Relación muchos-a-muchos entre organizaciones y países'
});

// Asociaciones
OrganizationCountry.belongsTo(Organization, {
    foreignKey: 'organization_id',
    as: 'organization'
});

OrganizationCountry.belongsTo(Country, {
    foreignKey: 'country_code',
    targetKey: 'iso_alpha2',
    as: 'country'
});

Organization.hasMany(OrganizationCountry, {
    foreignKey: 'organization_id',
    as: 'countries'
});

export default OrganizationCountry;
