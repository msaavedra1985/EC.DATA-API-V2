import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import DeviceBrand from './DeviceBrand.js';

/**
 * Modelo de Modelos de Dispositivo
 * Cada modelo pertenece a una marca
 */
const DeviceModel = sequelize.define('DeviceModel', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    device_brand_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'device_brands',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Código/nombre técnico del modelo'
    },
    specs: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Especificaciones técnicas en formato JSON'
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
    tableName: 'device_models',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            unique: true,
            fields: ['device_brand_id', 'code'],
            name: 'device_models_brand_code_idx'
        }
    ]
});

DeviceBrand.hasMany(DeviceModel, {
    foreignKey: 'device_brand_id',
    as: 'models',
    onDelete: 'CASCADE'
});

DeviceModel.belongsTo(DeviceBrand, {
    foreignKey: 'device_brand_id',
    as: 'brand'
});

export default DeviceModel;
