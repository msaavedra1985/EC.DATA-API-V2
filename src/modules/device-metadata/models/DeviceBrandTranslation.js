import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import DeviceBrand from './DeviceBrand.js';

/**
 * Traducciones de Marcas de Dispositivo
 */
const DeviceBrandTranslation = sequelize.define('DeviceBrandTranslation', {
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
    tableName: 'device_brand_translations',
    timestamps: false,
    underscored: true,
    paranoid: false
});

DeviceBrand.hasMany(DeviceBrandTranslation, {
    foreignKey: 'device_brand_id',
    as: 'translations',
    onDelete: 'CASCADE'
});

DeviceBrandTranslation.belongsTo(DeviceBrand, {
    foreignKey: 'device_brand_id',
    as: 'deviceBrand'
});

export default DeviceBrandTranslation;
