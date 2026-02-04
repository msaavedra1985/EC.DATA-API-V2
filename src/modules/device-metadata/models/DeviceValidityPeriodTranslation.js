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
    device_validity_period_id: {
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
    paranoid: false
});

DeviceValidityPeriod.hasMany(DeviceValidityPeriodTranslation, {
    foreignKey: 'device_validity_period_id',
    as: 'translations',
    onDelete: 'CASCADE'
});

DeviceValidityPeriodTranslation.belongsTo(DeviceValidityPeriod, {
    foreignKey: 'device_validity_period_id',
    as: 'deviceValidityPeriod'
});

export default DeviceValidityPeriodTranslation;
