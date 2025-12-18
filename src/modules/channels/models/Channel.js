import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Channel (Canal de Comunicación de Dispositivo)
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
 * Representa un canal de comunicación (MQTT, HTTP, WebSocket, etc.) que
 * un dispositivo utiliza para enviar/recibir datos.
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
        comment: 'Nombre del canal (ej: "MQTT Sensor Data")'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del canal'
    },
    channel_type: {
        type: DataTypes.ENUM('mqtt', 'http', 'websocket', 'coap', 'modbus', 'opcua', 'bacnet', 'lorawan', 'sigfox', 'other'),
        allowNull: false,
        defaultValue: 'other',
        comment: 'Tipo de canal: mqtt, http, websocket, coap, modbus, opcua, bacnet, lorawan, sigfox, other'
    },
    protocol: {
        type: DataTypes.ENUM('mqtt', 'http', 'https', 'ws', 'wss', 'coap', 'coaps', 'modbus_tcp', 'modbus_rtu', 'opcua', 'bacnet_ip', 'lorawan', 'sigfox', 'tcp', 'udp', 'other'),
        allowNull: false,
        defaultValue: 'other',
        comment: 'Protocolo de comunicación'
    },
    direction: {
        type: DataTypes.ENUM('inbound', 'outbound', 'bidirectional'),
        allowNull: false,
        defaultValue: 'bidirectional',
        comment: 'Dirección de comunicación: inbound, outbound, bidirectional'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'error', 'disabled'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Estado del canal: active, inactive, error, disabled'
    },
    endpoint_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL del endpoint de comunicación (ej: mqtt://broker.example.com:1883)'
    },
    config: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Configuración del canal en formato JSON (topic, QoS, keep-alive, etc.)'
    },
    credentials_ref: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Referencia a credenciales almacenadas de forma segura (no almacenar secretos aquí)'
    },
    priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        comment: 'Prioridad del canal (1-10, donde 10 es la más alta)'
    },
    last_sync_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última vez que el canal se sincronizó/comunicó'
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
            fields: ['channel_type']
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
    // Channel pertenece a Device
    Channel.belongsTo(models.Device, {
        foreignKey: 'device_id',
        as: 'device'
    });

    // Channel pertenece a Organization
    Channel.belongsTo(models.Organization, {
        foreignKey: 'organization_id',
        as: 'organization'
    });

    // Channel pertenece a MeasurementType
    Channel.belongsTo(models.MeasurementType, {
        foreignKey: 'measurement_type_id',
        as: 'measurementType'
    });

    // Channel tiene muchas variables (a través de channel_variables)
    Channel.belongsToMany(models.Variable, {
        through: models.ChannelVariable,
        foreignKey: 'channel_id',
        otherKey: 'variable_id',
        as: 'variables'
    });
};

export default Channel;
