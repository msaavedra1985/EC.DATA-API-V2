import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import State from './State.js';

/**
 * Modelo de Ciudad
 * PK: id (serial autoincrement) - no existe estándar ISO para ciudades
 * Las ciudades se cargan on-demand, no pre-pobladas
 */
const City = sequelize.define('City', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID autoincremental - no existe estándar ISO para ciudades'
    },
    state_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
        references: {
            model: 'states',
            key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a states.code (ej: AR-B)'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre de la ciudad (nombre principal/oficial)'
    },
    zip_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Código postal principal'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Latitud GPS'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitud GPS'
    },
    population: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Población estimada'
    },
    timezone: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Zona horaria (ej: America/Argentina/Buenos_Aires)'
    },
    is_capital: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si es capital del estado/provincia'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la ciudad está activa'
    }
}, {
    tableName: 'cities',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            fields: ['state_code']
        },
        {
            fields: ['name']
        },
        {
            fields: ['zip_code']
        },
        {
            fields: ['is_active']
        },
        {
            fields: ['latitude', 'longitude']
        }
    ],
    comment: 'Ciudades - cargadas on-demand, no pre-pobladas'
});

/**
 * Relaciones
 */
State.hasMany(City, {
    foreignKey: 'state_code',
    sourceKey: 'code',
    as: 'cities'
});

City.belongsTo(State, {
    foreignKey: 'state_code',
    targetKey: 'code',
    as: 'state'
});

export default City;
