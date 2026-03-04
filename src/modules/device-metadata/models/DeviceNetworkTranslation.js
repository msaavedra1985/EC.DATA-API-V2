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
    deviceNetworkId: {
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
    paranoid: false,
    indexes: [
        { unique: true, fields: ['device_network_id', 'lang'], name: 'device_network_translations_network_lang_idx' }
    ]
});

DeviceNetwork.hasMany(DeviceNetworkTranslation, {
    foreignKey: 'deviceNetworkId',
    as: 'translations',
    onDelete: 'CASCADE'
});

DeviceNetworkTranslation.belongsTo(DeviceNetwork, {
    foreignKey: 'deviceNetworkId',
    as: 'deviceNetwork'
});

export default DeviceNetworkTranslation;
