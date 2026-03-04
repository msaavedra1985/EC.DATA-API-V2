import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Servidores de Dispositivo
 * Brokers MQTT, FTP, etc.
 */
const DeviceServer = sequelize.define('DeviceServer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Hostname o identificador del servidor'
    },
    serverType: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'mqtt',
        comment: 'Tipo: mqtt, mqttssl, ftp, http'
    },
    host: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Hostname o IP del servidor'
    },
    port: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Puerto del servicio'
    },
    useSsl: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    tableName: 'device_servers',
    timestamps: true,
    underscored: true,
    paranoid: false
});

export default DeviceServer;
