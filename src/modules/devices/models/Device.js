import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Device (Equipo IoT/Edge)
 * Usa sistema triple identificador: UUID v7 + human_id + public_code
 * 
 * - id: UUID v7 (clave primaria, usado en FKs)
 * - human_id: incremental global (sin scope, solo para uso interno/soporte)
 * - public_code: ID opaco público (formato: DEV-XXXXX-Y)
 * 
 * Representa un equipo IoT, sensor, gateway, UPS, medidor, etc.
 * Vinculado a 7 catálogos: tipo, marca, modelo, servidor, red, licencia, vigencia.
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
        comment: 'FK a organizations - organización dueña del equipo'
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
        comment: 'FK a sites - sitio donde está instalado (opcional)'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre del equipo (ej: "Medidor Lobby Principal")'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del equipo'
    },

    // --- FKs a catálogos de equipos ---
    device_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'device_types',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a device_types - tipo de equipo (catálogo)'
    },
    brand_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'device_brands',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a device_brands - marca del equipo'
    },
    model_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'device_models',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a device_models - modelo del equipo'
    },
    server_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'device_servers',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a device_servers - servidor de comunicación'
    },
    network_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'device_networks',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a device_networks - tipo de red'
    },
    license_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'device_licenses',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a device_licenses - tipo de licencia'
    },
    validity_period_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'device_validity_periods',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a device_validity_periods - período de vigencia'
    },

    // --- Comunicación MQTT ---
    topic: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Topic MQTT del equipo (ej: ecdata/ups/eaton-001)'
    },

    // --- Identificación de hardware ---
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'decommissioned'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Estado del equipo: active, inactive, maintenance, decommissioned'
    },
    firmware_version: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Versión del firmware instalado (ej: "v2.5.1")'
    },
    serial_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Número de serie del equipo'
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'Dirección IP del equipo (IPv4 o IPv6)'
    },
    mac_address: {
        type: DataTypes.STRING(17),
        allowNull: true,
        comment: 'Dirección MAC del equipo (ej: "00:1A:2B:3C:4D:5E")'
    },

    // --- Ubicación ---
    location_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Nombre de ubicación (ej: Edificio Principal)'
    },
    physical_location: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Ubicación física (ej: Piso 3, Sala de servidores)'
    },
    electrical_location: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Ubicación eléctrica (ej: Tablero principal TGD)'
    },
    latitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Latitud GPS del equipo'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitud GPS del equipo'
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Ciudad donde se encuentra el equipo'
    },
    timezone: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'UTC',
        comment: 'Zona horaria del equipo en formato IANA (ej: America/Lima, UTC)'
    },

    // --- Datos comerciales ---
    installation_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Fecha de instalación del equipo'
    },
    warranty_months: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Meses de garantía del equipo'
    },
    expiration_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Fecha de expiración de la licencia/servicio'
    },

    // --- Sistema ---
    last_seen_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última vez que el equipo se comunicó con el sistema'
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
        comment: 'Indica si el equipo está activo'
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
            fields: ['device_type_id'],
            name: 'devices_device_type_id_idx'
        },
        {
            fields: ['brand_id'],
            name: 'devices_brand_id_idx'
        },
        {
            fields: ['model_id'],
            name: 'devices_model_id_idx'
        },
        {
            fields: ['server_id'],
            name: 'devices_server_id_idx'
        },
        {
            fields: ['network_id'],
            name: 'devices_network_id_idx'
        },
        {
            fields: ['license_id'],
            name: 'devices_license_id_idx'
        },
        {
            fields: ['validity_period_id'],
            name: 'devices_validity_period_id_idx'
        },
        {
            fields: ['serial_number'],
            unique: true,
            where: {
                serial_number: { [Op.ne]: null },
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
    // Relaciones con organización y sitio
    Device.belongsTo(models.Organization, {
        foreignKey: 'organization_id',
        as: 'organization'
    });

    Device.belongsTo(models.Site, {
        foreignKey: 'site_id',
        as: 'site'
    });

    // Relaciones con catálogos de equipos
    Device.belongsTo(models.DeviceType, {
        foreignKey: 'device_type_id',
        as: 'deviceType'
    });

    Device.belongsTo(models.DeviceBrand, {
        foreignKey: 'brand_id',
        as: 'brand'
    });

    Device.belongsTo(models.DeviceModel, {
        foreignKey: 'model_id',
        as: 'model'
    });

    Device.belongsTo(models.DeviceServer, {
        foreignKey: 'server_id',
        as: 'server'
    });

    Device.belongsTo(models.DeviceNetwork, {
        foreignKey: 'network_id',
        as: 'network'
    });

    Device.belongsTo(models.DeviceLicense, {
        foreignKey: 'license_id',
        as: 'license'
    });

    Device.belongsTo(models.DeviceValidityPeriod, {
        foreignKey: 'validity_period_id',
        as: 'validityPeriod'
    });

    // Relación con canales
    Device.hasMany(models.Channel, {
        foreignKey: 'device_id',
        as: 'channels'
    });
};

export default Device;
