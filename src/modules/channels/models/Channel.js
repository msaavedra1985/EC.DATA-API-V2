import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const Channel = sequelize.define('Channel', {
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
        comment: 'ID público opaco (ej: CHN-7K9D2-X) - previene enumeración'
    },
    deviceId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK a devices - dispositivo al que pertenece el canal'
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
        comment: 'FK a organizations - desnormalización para integridad cross-tenant'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre del canal (ej: "Edificio 1 - Lado Derecho")'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del canal'
    },
    ch: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Número de canal físico usado en Cassandra para identificar mediciones'
    },
    measurementTypeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'measurement_types',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a measurement_types - tipo de medición del canal'
    },
    phaseSystem: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Sistema eléctrico: 0=N/A, 1=monofásico, 3=trifásico'
    },
    phase: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Fase que lee el canal: 1, 2 o 3'
    },
    process: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Si se procesan los datos del canal'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'error', 'disabled'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Estado del canal: active, inactive, error, disabled'
    },
    lastSyncAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última vez que el canal reportó datos'
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
        comment: 'Indica si el canal está activo'
    }
}, {
    tableName: 'channels',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
        {
            fields: ['device_id']
        },
        {
            fields: ['organization_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['measurement_type_id'],
            name: 'channels_measurement_type_id_idx'
        },
        {
            fields: ['device_id', 'name'],
            unique: true,
            name: 'channels_device_name_unique',
            where: {
                deleted_at: null
            }
        }
    ]
});

Channel.associate = (models) => {
    Channel.belongsTo(models.Device, {
        foreignKey: 'deviceId',
        as: 'device'
    });

    Channel.belongsTo(models.Organization, {
        foreignKey: 'organizationId',
        as: 'organization'
    });

    Channel.belongsTo(models.MeasurementType, {
        foreignKey: 'measurementTypeId',
        as: 'measurementType'
    });

    Channel.belongsToMany(models.Variable, {
        through: models.ChannelVariable,
        foreignKey: 'channelId',
        otherKey: 'variableId',
        as: 'variables'
    });

};

export default Channel;
