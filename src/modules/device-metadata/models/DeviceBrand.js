import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Marcas de Dispositivo
 * EnergyCloud, Schneider, ABB, etc.
 */
const DeviceBrand = sequelize.define('DeviceBrand', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Código único interno (ej: schneider, abb)'
    },
    logoUrl: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    websiteUrl: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'device_brands',
    timestamps: true,
    underscored: true,
    paranoid: false
});

export default DeviceBrand;
