import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import DeviceType from './DeviceType.js';

/**
 * Traducciones de Tipos de Dispositivo
 */
const DeviceTypeTranslation = sequelize.define('DeviceTypeTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    device_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'device_types',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    lang: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'Código de idioma (es, en, pt, etc.)'
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
    tableName: 'device_type_translations',
    timestamps: false,
    underscored: true,
    paranoid: false
});

DeviceType.hasMany(DeviceTypeTranslation, {
    foreignKey: 'device_type_id',
    as: 'translations',
    onDelete: 'CASCADE'
});

DeviceTypeTranslation.belongsTo(DeviceType, {
    foreignKey: 'device_type_id',
    as: 'deviceType'
});

export default DeviceTypeTranslation;
