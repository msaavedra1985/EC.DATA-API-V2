import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import DeviceModel from './DeviceModel.js';

/**
 * Traducciones de Modelos de Dispositivo
 */
const DeviceModelTranslation = sequelize.define('DeviceModelTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    device_model_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'device_models',
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
    tableName: 'device_model_translations',
    timestamps: false,
    underscored: true,
    paranoid: false
});

DeviceModel.hasMany(DeviceModelTranslation, {
    foreignKey: 'device_model_id',
    as: 'translations',
    onDelete: 'CASCADE'
});

DeviceModelTranslation.belongsTo(DeviceModel, {
    foreignKey: 'device_model_id',
    as: 'deviceModel'
});

export default DeviceModelTranslation;
