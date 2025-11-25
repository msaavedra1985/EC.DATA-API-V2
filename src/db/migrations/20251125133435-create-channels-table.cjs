'use strict';

/**
 * Migración: Crear tabla channels (Canales de comunicación de dispositivos)
 * 
 * ARQUITECTURA CRÍTICA:
 * - Composite foreign key (device_id, organization_id) -> devices(id, organization_id)
 * - Garantiza integridad referencial cross-tenant sin JOINs costosos
 * - Desnormalización estratégica: organization_id se duplica para optimización
 * - Cascade soft-delete: al borrar Device, sus Channels quedan inactivos
 * 
 * TRIPLE IDENTIFICADOR:
 * - id: UUID v7 (clave primaria time-ordered)
 * - human_id: incremental global (soporte interno)
 * - public_code: ID opaco público (formato: CHN-XXXXX-Y)
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Crear ENUM channel_type (si no existe)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE channel_type AS ENUM (
          'mqtt', 'http', 'websocket', 'coap', 'modbus', 'opcua', 'bacnet', 'lorawan', 'sigfox', 'other'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Crear ENUM channel_protocol (si no existe)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE channel_protocol AS ENUM (
          'mqtt', 'http', 'https', 'ws', 'wss', 'coap', 'coaps', 'modbus_tcp', 'modbus_rtu', 
          'opcua', 'bacnet_ip', 'lorawan', 'sigfox', 'tcp', 'udp', 'other'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Crear ENUM channel_direction (si no existe)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE channel_direction AS ENUM (
          'inbound', 'outbound', 'bidirectional'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 4. Crear ENUM channel_status (si no existe)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE channel_status AS ENUM (
          'active', 'inactive', 'error', 'disabled'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 5. Crear tabla channels
    await queryInterface.createTable('channels', {
      // Triple identificador
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        comment: 'UUID v7 - clave primaria time-ordered'
      },
      human_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        comment: 'ID incremental global para uso interno/soporte'
      },
      public_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: CHN-7K9D2-X) - previene enumeración'
      },

      // Foreign Keys: Composite FK a devices(id, organization_id)
      device_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'FK a devices - dispositivo al que pertenece el canal'
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a organizations - desnormalización para integridad cross-tenant'
      },

      // Campos del canal
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Nombre del canal (ej: "MQTT Sensor Data")'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Descripción del canal'
      },
      channel_type: {
        type: 'channel_type',
        allowNull: false,
        defaultValue: 'other',
        comment: 'Tipo de canal: mqtt, http, websocket, coap, modbus, opcua, bacnet, lorawan, sigfox, other'
      },
      protocol: {
        type: 'channel_protocol',
        allowNull: false,
        defaultValue: 'other',
        comment: 'Protocolo de comunicación: mqtt, http, https, ws, wss, coap, coaps, modbus_tcp, modbus_rtu, opcua, bacnet_ip, lorawan, sigfox, tcp, udp, other'
      },
      direction: {
        type: 'channel_direction',
        allowNull: false,
        defaultValue: 'bidirectional',
        comment: 'Dirección de comunicación: inbound, outbound, bidirectional'
      },
      status: {
        type: 'channel_status',
        allowNull: false,
        defaultValue: 'active',
        comment: 'Estado del canal: active, inactive, error, disabled'
      },

      // Configuración del canal
      endpoint_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL del endpoint de comunicación (ej: mqtt://broker.example.com:1883)'
      },
      config: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Configuración del canal en formato JSON (topic, QoS, keep-alive, etc.)'
      },
      credentials_ref: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Referencia a credenciales almacenadas de forma segura (no almacenar secretos aquí)'
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
        comment: 'Prioridad del canal (1-10, donde 10 es la más alta)'
      },
      last_sync_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Última vez que el canal se sincronizó/comunicó'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadatos adicionales en formato JSON'
      },

      // Campos de control
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el canal está activo'
      },

      // Timestamps y soft delete
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp'
      }
    });

    // 6. Crear índices
    
    // Índice en device_id para búsquedas por dispositivo
    await queryInterface.addIndex('channels', ['device_id'], {
      name: 'channels_device_id_idx'
    });

    // Índice en organization_id para filtrado multi-tenant
    await queryInterface.addIndex('channels', ['organization_id'], {
      name: 'channels_organization_id_idx'
    });

    // Índice en status para filtrado por estado
    await queryInterface.addIndex('channels', ['status'], {
      name: 'channels_status_idx'
    });

    // Índice en channel_type para filtrado por tipo
    await queryInterface.addIndex('channels', ['channel_type'], {
      name: 'channels_channel_type_idx'
    });

    // Índice único compuesto: device_id + name (un canal no puede duplicar nombre dentro del mismo device)
    await queryInterface.addIndex('channels', ['device_id', 'name'], {
      unique: true,
      name: 'channels_device_name_unique',
      where: {
        deleted_at: null
      }
    });

    // 7. Crear composite foreign key constraint
    // CRÍTICO: Garantiza que (device_id, organization_id) exista en devices(id, organization_id)
    await queryInterface.sequelize.query(`
      ALTER TABLE channels
      ADD CONSTRAINT channels_device_org_fk
      FOREIGN KEY (device_id, organization_id)
      REFERENCES devices(id, organization_id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
    `);

    console.log('✅ Tabla channels creada exitosamente con composite foreign key');
  },

  async down(queryInterface, Sequelize) {
    // 1. Eliminar constraint de composite FK
    await queryInterface.sequelize.query(`
      ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_device_org_fk;
    `);

    // 2. Eliminar tabla
    await queryInterface.dropTable('channels');

    // 3. Eliminar ENUMs (solo si no están en uso por otras tablas)
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS channel_status;
      DROP TYPE IF EXISTS channel_direction;
      DROP TYPE IF EXISTS channel_protocol;
      DROP TYPE IF EXISTS channel_type;
    `);

    console.log('✅ Tabla channels eliminada exitosamente');
  }
};
