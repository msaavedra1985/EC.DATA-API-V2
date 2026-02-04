import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Tipos de Red de Dispositivo
 * Modem 4G, Ethernet, Wireless, Lora
 */
const DeviceNetwork = sequelize.define('DeviceNetwork', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Código único (ej: modem_4g, ethernet, wireless, lora)'
    },
    icon: {
        type: DataTypes.STRING(100),
        allowNull: true
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
    tableName: 'device_networks',
    timestamps: true,
    underscored: true,
    paranoid: false
});

export default DeviceNetwork;
