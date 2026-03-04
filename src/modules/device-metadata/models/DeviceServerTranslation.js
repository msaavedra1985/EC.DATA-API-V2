import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import DeviceServer from './DeviceServer.js';

/**
 * Traducciones de Servidores de Dispositivo
 */
const DeviceServerTranslation = sequelize.define('DeviceServerTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    deviceServerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'device_servers',
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
    tableName: 'device_server_translations',
    timestamps: false,
    underscored: true,
    paranoid: false,
    indexes: [
        { unique: true, fields: ['device_server_id', 'lang'], name: 'device_server_translations_server_lang_idx' }
    ]
});

DeviceServer.hasMany(DeviceServerTranslation, {
    foreignKey: 'deviceServerId',
    as: 'translations',
    onDelete: 'CASCADE'
});

DeviceServerTranslation.belongsTo(DeviceServer, {
    foreignKey: 'deviceServerId',
    as: 'deviceServer'
});

export default DeviceServerTranslation;
