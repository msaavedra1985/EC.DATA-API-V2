import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Períodos de Vigencia de Dispositivo
 * 12 meses, 24 meses, 36 meses, Enterprise
 */
const DeviceValidityPeriod = sequelize.define('DeviceValidityPeriod', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Código único (ej: 12_months, 24_months, enterprise)'
    },
    months: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Cantidad de meses (null para enterprise/ilimitado)'
    },
    display_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'device_validity_periods',
    timestamps: true,
    underscored: true,
    paranoid: false
});

export default DeviceValidityPeriod;
