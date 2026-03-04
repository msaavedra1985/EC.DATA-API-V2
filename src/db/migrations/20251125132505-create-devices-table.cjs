'use strict';

/**
 * Migración: Crear tabla Devices
 * 
 * Crea tabla para gestionar dispositivos IoT/edge que pertenecen a organizaciones.
 * - Identificadores: UUID v7 + human_id + public_code (DEV-XXXXX-X)
 * - Relaciones: belongsTo Organization, belongsTo Site (opcional)
 * - ENUMs: device_type, status
 * - Índices: composite unique (organization_id, name), búsqueda optimizada
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear ENUM para tipo de dispositivo
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_devices_device_type') THEN
          CREATE TYPE enum_devices_device_type AS ENUM (
            'sensor', 'gateway', 'controller', 'edge', 'virtual', 'other'
          );
        END IF;
      END $$;
    `);

    // Crear ENUM para estado del dispositivo
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_devices_status') THEN
          CREATE TYPE enum_devices_status AS ENUM (
            'active', 'inactive', 'maintenance', 'decommissioned'
          );
        END IF;
      END $$;
    `);

    // Crear tabla devices
    await queryInterface.createTable('devices', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
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
        comment: 'ID público opaco (ej: DEV-7K9D2-X) - previene enumeración'
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
        comment: 'FK a organizations - organización a la que pertenece el dispositivo'
      },
      site_id: {
        type: Sequelize.UUID,
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
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Nombre del dispositivo (ej: "Sensor Temp Sala 1")'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Descripción del dispositivo'
      },
      device_type: {
        type: 'enum_devices_device_type',
        allowNull: false,
        defaultValue: 'other',
        comment: 'Tipo de dispositivo: sensor, gateway, controller, edge, virtual, other'
      },
      status: {
        type: 'enum_devices_status',
        allowNull: false,
        defaultValue: 'active',
        comment: 'Estado del dispositivo: active, inactive, maintenance, decommissioned'
      },
      firmware_version: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Versión del firmware instalado (ej: "v2.5.1")'
      },
      serial_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Número de serie del dispositivo'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'Dirección IP del dispositivo (IPv4 o IPv6)'
      },
      mac_address: {
        type: Sequelize.STRING(17),
        allowNull: true,
        comment: 'Dirección MAC del dispositivo (ej: "00:1A:2B:3C:4D:5E")'
      },
      location_hint: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'Pista de ubicación física (ej: "Rack 3, Slot 5")'
      },
      last_seen_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Última vez que el dispositivo se comunicó con el sistema'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadatos adicionales en formato JSON'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el dispositivo está activo'
      },
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

    // Crear índices para optimizar búsquedas
    await queryInterface.addIndex('devices', ['organization_id'], {
      name: 'devices_organization_id_idx'
    });

    await queryInterface.addIndex('devices', ['site_id'], {
      name: 'devices_site_id_idx'
    });

    await queryInterface.addIndex('devices', ['status'], {
      name: 'devices_status_idx'
    });

    await queryInterface.addIndex('devices', ['device_type'], {
      name: 'devices_device_type_idx'
    });

    await queryInterface.addIndex('devices', ['serial_number'], {
      name: 'devices_serial_number_idx',
      unique: true,
      where: {
        serial_number: {
          [Sequelize.Op.ne]: null
        },
        deleted_at: null
      }
    });

    // Composite unique: nombre debe ser único por organización
    await queryInterface.addIndex('devices', ['organization_id', 'name'], {
      name: 'devices_org_name_unique',
      unique: true,
      where: {
        deleted_at: null
      }
    });

    // Composite unique index para permitir FK composite desde channels
    await queryInterface.addIndex('devices', ['id', 'organization_id'], {
      name: 'devices_id_organization_id_idx',
      unique: true
    });

    // Índice para soft delete
    await queryInterface.addIndex('devices', ['deleted_at'], {
      name: 'devices_deleted_at_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Eliminar tabla
    await queryInterface.dropTable('devices');

    // Eliminar ENUMs
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_devices_status;
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_devices_device_type;
    `);
  }
};
