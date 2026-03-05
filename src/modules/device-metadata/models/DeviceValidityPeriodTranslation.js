import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import DeviceValidityPeriod from './DeviceValidityPeriod.js';

/**
 * Traducciones de Períodos de Vigencia de Dispositivo
 */
const DeviceValidityPeriodTranslation = sequelize.define('DeviceValidityPeriodTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    deviceValidityPeriodId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'device_validity_periods',
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
    tableName: 'device_validity_period_translations',
    timestamps: false,
    underscored: true,
    paranoid: false,
    indexes: [
        { unique: true, fields: ['device_validity_period_id', 'lang'], name: 'device_validity_period_translations_vp_lang_idx' }
    ]
});

DeviceValidityPeriod.hasMany(DeviceValidityPeriodTranslation, {
    foreignKey: 'deviceValidityPeriodId',
    as: 'translations',
    onDelete: 'CASCADE'
});

DeviceValidityPeriodTranslation.belongsTo(DeviceValidityPeriod, {
    foreignKey: 'deviceValidityPeriodId',
    as: 'deviceValidityPeriod'
});

export default DeviceValidityPeriodTranslation;
