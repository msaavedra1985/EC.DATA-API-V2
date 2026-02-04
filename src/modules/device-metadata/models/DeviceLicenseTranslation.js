import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import DeviceLicense from './DeviceLicense.js';

/**
 * Traducciones de Licencias de Dispositivo
 */
const DeviceLicenseTranslation = sequelize.define('DeviceLicenseTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    device_license_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'device_licenses',
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
    tableName: 'device_license_translations',
    timestamps: false,
    underscored: true,
    paranoid: false
});

DeviceLicense.hasMany(DeviceLicenseTranslation, {
    foreignKey: 'device_license_id',
    as: 'translations',
    onDelete: 'CASCADE'
});

DeviceLicenseTranslation.belongsTo(DeviceLicense, {
    foreignKey: 'device_license_id',
    as: 'deviceLicense'
});

export default DeviceLicenseTranslation;
