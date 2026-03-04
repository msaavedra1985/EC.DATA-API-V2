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
    deviceTypeId: {
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
    paranoid: false,
    indexes: [
        { unique: true, fields: ['device_type_id', 'lang'], name: 'device_type_translations_type_lang_idx' }
    ]
});

DeviceType.hasMany(DeviceTypeTranslation, {
    foreignKey: 'deviceTypeId',
    as: 'translations',
    onDelete: 'CASCADE'
});

DeviceTypeTranslation.belongsTo(DeviceType, {
    foreignKey: 'deviceTypeId',
    as: 'deviceType'
});

export default DeviceTypeTranslation;
