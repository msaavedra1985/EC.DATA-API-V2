import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import DeviceNetwork from './DeviceNetwork.js';

/**
 * Traducciones de Tipos de Red de Dispositivo
 */
const DeviceNetworkTranslation = sequelize.define('DeviceNetworkTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    device_network_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'device_networks',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    lang: {
        type: DataTypes.STRING(5),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'device_network_translations',
    timestamps: false,
    underscored: true,
    paranoid: false
});

DeviceNetwork.hasMany(DeviceNetworkTranslation, {
    foreignKey: 'device_network_id',
    as: 'translations',
    onDelete: 'CASCADE'
});

DeviceNetworkTranslation.belongsTo(DeviceNetwork, {
    foreignKey: 'device_network_id',
    as: 'deviceNetwork'
});

export default DeviceNetworkTranslation;
