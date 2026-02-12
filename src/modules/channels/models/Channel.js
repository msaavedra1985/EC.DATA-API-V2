import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Channel (Canal / Punto de Medición)
 * Usa sistema triple identificador: UUID v7 + human_id + public_code
 * 
 * - id: UUID v7 (clave primaria, usado en FKs)
 * - human_id: incremental global (sin scope, solo para uso interno/soporte)
 * - public_code: ID opaco público (formato: CHN-XXXXX-Y)
 * 
 * ARQUITECTURA CRÍTICA:
 * - Composite foreign key (device_id, organization_id) -> devices(id, organization_id)
 * - Garantiza integridad referencial cross-tenant sin JOINs costosos
 * - Desnormalización estratégica: organization_id se duplica para optimización
 * 
 * Representa un punto de medición de un dispositivo (canal eléctrico, sensor IoT, etc.)
 * Cada canal puede leer una o más variables a través de channel_variables.
 */
const Channel = sequelize.define('Channel', {
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
        comment: 'ID público opaco (ej: CHN-7K9D2-X) - previene enumeración'
    },
    device_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK a devices - dispositivo al que pertenece el canal'
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
    measurement_type_id: {
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
    phase_system: {
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
    last_sync_at: {
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
    is_active: {
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

/**
 * Relaciones del modelo Channel
 */
Channel.associate = (models) => {
    Channel.belongsTo(models.Device, {
        foreignKey: 'device_id',
        as: 'device'
    });

    Channel.belongsTo(models.Organization, {
        foreignKey: 'organization_id',
        as: 'organization'
    });

    Channel.belongsTo(models.MeasurementType, {
        foreignKey: 'measurement_type_id',
        as: 'measurementType'
    });

    Channel.belongsToMany(models.Variable, {
        through: models.ChannelVariable,
        foreignKey: 'channel_id',
        otherKey: 'variable_id',
        as: 'variables'
    });

};

export default Channel;
