import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const Device = sequelize.define('Device', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    humanId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        comment: 'ID incremental global para uso interno/soporte'
    },
    publicCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: DEV-7K9D2-X) - previene enumeración'
    },
    uuid: {
        type: DataTypes.STRING(36),
        allowNull: true,
        unique: true,
        comment: 'UUID operativo/externo - asignado por técnicos en campo o sistemas externos'
    },
    organizationId: {
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
    siteId: {
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
    deviceTypeId: {
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
    brandId: {
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
    modelId: {
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
    serverId: {
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
    networkId: {
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
    licenseId: {
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
    validityPeriodId: {
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
    topic: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Topic MQTT del equipo (ej: ecdata/ups/eaton-001)'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'decommissioned'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Estado del equipo: active, inactive, maintenance, decommissioned'
    },
    firmwareVersion: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Versión del firmware instalado (ej: "v2.5.1")'
    },
    serialNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Número de serie del equipo'
    },
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'Dirección IP del equipo (IPv4 o IPv6)'
    },
    macAddress: {
        type: DataTypes.STRING(17),
        allowNull: true,
        comment: 'Dirección MAC del equipo (ej: "00:1A:2B:3C:4D:5E")'
    },
    locationName: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Nombre de ubicación (ej: Edificio Principal)'
    },
    physicalLocation: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Ubicación física (ej: Piso 3, Sala de servidores)'
    },
    electricalLocation: {
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
    installationDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Fecha de instalación del equipo'
    },
    warrantyMonths: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Meses de garantía del equipo'
    },
    expirationDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Fecha de expiración de la licencia/servicio'
    },
    lastSeenAt: {
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
    isActive: {
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

Device.associate = (models) => {
    Device.belongsTo(models.Organization, {
        foreignKey: 'organizationId',
        as: 'organization'
    });

    Device.belongsTo(models.Site, {
        foreignKey: 'siteId',
        as: 'site'
    });

    Device.belongsTo(models.DeviceType, {
        foreignKey: 'deviceTypeId',
        as: 'deviceType'
    });

    Device.belongsTo(models.DeviceBrand, {
        foreignKey: 'brandId',
        as: 'brand'
    });

    Device.belongsTo(models.DeviceModel, {
        foreignKey: 'modelId',
        as: 'model'
    });

    Device.belongsTo(models.DeviceServer, {
        foreignKey: 'serverId',
        as: 'server'
    });

    Device.belongsTo(models.DeviceNetwork, {
        foreignKey: 'networkId',
        as: 'network'
    });

    Device.belongsTo(models.DeviceLicense, {
        foreignKey: 'licenseId',
        as: 'license'
    });

    Device.belongsTo(models.DeviceValidityPeriod, {
        foreignKey: 'validityPeriodId',
        as: 'validityPeriod'
    });

    Device.hasMany(models.Channel, {
        foreignKey: 'deviceId',
        as: 'channels'
    });
};

export default Device;
