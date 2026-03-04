import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Licencias de Dispositivo
 * EC.IoT, EC.Automation, EC.Billing, etc.
 */
const DeviceLicense = sequelize.define('DeviceLicense', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Código único (ej: ec_iot, ec_automation)'
    },
    icon: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    color: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Color para UI (hex o nombre)'
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'device_licenses',
    timestamps: true,
    underscored: true,
    paranoid: false
});

export default DeviceLicense;
