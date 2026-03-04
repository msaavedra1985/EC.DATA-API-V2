import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Tipos de Dispositivo
 * Nodo, UCM, Gateway, Antena Lora, Medidor
 */
const DeviceType = sequelize.define('DeviceType', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Código único interno (ej: node, ucm, gateway)'
    },
    icon: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Nombre del ícono'
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
    tableName: 'device_types',
    timestamps: true,
    underscored: true,
    paranoid: false
});

export default DeviceType;
