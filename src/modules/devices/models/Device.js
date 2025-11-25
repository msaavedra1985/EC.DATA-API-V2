import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Device (Dispositivo IoT/Edge)
 * Usa sistema triple identificador: UUID v7 + human_id + public_code
 * 
 * - id: UUID v7 (clave primaria, usado en FKs)
 * - human_id: incremental global (sin scope, solo para uso interno/soporte)
 * - public_code: ID opaco público (formato: DEV-XXXXX-Y)
 * 
 * Representa un dispositivo IoT, sensor, gateway, controller, etc.
 * que pertenece a una organización y opcionalmente a un site específico.
 */
const Device = sequelize.define('Device', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    human_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        comment: 'ID incremental global para uso interno/soporte'
    },
    public_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: DEV-7K9D2-X) - previene enumeración'
    },
    organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'organizations',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a organizations - organización a la que pertenece el dispositivo'
    },
    site_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'sites',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a sites - ubicación física del dispositivo (opcional)'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre del dispositivo (ej: "Sensor Temp Sala 1")'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del dispositivo'
    },
    device_type: {
        type: DataTypes.ENUM('sensor', 'gateway', 'controller', 'edge', 'virtual', 'other'),
        allowNull: false,
        defaultValue: 'other',
        comment: 'Tipo de dispositivo: sensor, gateway, controller, edge, virtual, other'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'decommissioned'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Estado del dispositivo: active, inactive, maintenance, decommissioned'
    },
    firmware_version: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Versión del firmware instalado (ej: "v2.5.1")'
    },
    serial_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Número de serie del dispositivo'
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'Dirección IP del dispositivo (IPv4 o IPv6)'
    },
    mac_address: {
        type: DataTypes.STRING(17),
        allowNull: true,
        comment: 'Dirección MAC del dispositivo (ej: "00:1A:2B:3C:4D:5E")'
    },
    location_hint: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Pista de ubicación física (ej: "Rack 3, Slot 5")'
    },
    last_seen_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última vez que el dispositivo se comunicó con el sistema'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadatos adicionales en formato JSON'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el dispositivo está activo'
    }
}, {
    tableName: 'devices',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
        {
            fields: ['organization_id']
        },
        {
            fields: ['site_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['device_type']
        },
        {
            fields: ['serial_number'],
            unique: true,
            where: {
                serial_number: { [sequelize.Op.ne]: null },
                deleted_at: null
            }
        },
        {
            fields: ['organization_id', 'name'],
            unique: true,
            name: 'devices_org_name_unique',
            where: {
                deleted_at: null
            }
        },
        {
            // Composite index para FK desde channels
            fields: ['id', 'organization_id'],
            unique: true,
            name: 'devices_id_organization_id_idx'
        }
    ]
});

/**
 * Relaciones del modelo Device
 */
Device.associate = (models) => {
    // Device pertenece a Organization
    Device.belongsTo(models.Organization, {
        foreignKey: 'organization_id',
        as: 'organization'
    });

    // Device pertenece a Site (opcional)
    Device.belongsTo(models.Site, {
        foreignKey: 'site_id',
        as: 'site'
    });

    // Device tiene muchos Channels
    Device.hasMany(models.Channel, {
        foreignKey: 'device_id',
        as: 'channels'
    });
};

export default Device;
