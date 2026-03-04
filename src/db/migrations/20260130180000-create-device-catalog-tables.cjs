'use strict';

/**
 * Migración: Crear tablas de catálogo para equipos
 * 
 * Tablas de lookup para caracterizar dispositivos:
 * - device_types: Nodo, UCM, Gateway, Antena Lora, Medidor
 * - device_brands: Marcas de fabricantes
 * - device_models: Modelos por marca
 * - device_servers: Brokers MQTT/FTP
 * - device_networks: Tipos de conexión (4G, Ethernet, Wireless, Lora)
 * - device_licenses: Tipos de licencia (EC.IoT, EC.Automation, etc.)
 * - device_validity_periods: Períodos de vigencia
 * 
 * Todas usan IDs seriales (no UUIDs) por ser datos públicos de catálogo.
 * Cada tabla tiene su correspondiente tabla de traducciones.
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // ========================================
      // 1. DEVICE TYPES (Tipos de equipo)
      // ========================================
      await queryInterface.createTable('device_types', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
          comment: 'Código único interno (ej: node, ucm, gateway)'
        },
        icon: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Nombre del ícono (lucide, heroicons, etc.)'
        },
        display_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
        }
      }, { transaction });

      await queryInterface.createTable('device_type_translations', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        device_type_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'device_types', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        lang: {
          type: Sequelize.STRING(5),
          allowNull: false,
          comment: 'Código de idioma (es, en, pt, etc.)'
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('device_type_translations', 
        ['device_type_id', 'lang'], 
        { unique: true, name: 'device_type_translations_type_lang_idx', transaction }
      );

      // ========================================
      // 2. DEVICE BRANDS (Marcas de equipos)
      // ========================================
      await queryInterface.createTable('device_brands', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
          comment: 'Código único interno (ej: schneider, abb)'
        },
        logo_url: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        website_url: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        display_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
        }
      }, { transaction });

      await queryInterface.createTable('device_brand_translations', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        device_brand_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'device_brands', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        lang: {
          type: Sequelize.STRING(5),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('device_brand_translations', 
        ['device_brand_id', 'lang'], 
        { unique: true, name: 'device_brand_translations_brand_lang_idx', transaction }
      );

      // ========================================
      // 3. DEVICE MODELS (Modelos de equipos)
      // ========================================
      await queryInterface.createTable('device_models', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        device_brand_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'device_brands', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        code: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'Código/nombre técnico del modelo'
        },
        specs: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Especificaciones técnicas en formato JSON'
        },
        display_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
        }
      }, { transaction });

      await queryInterface.addIndex('device_models', 
        ['device_brand_id', 'code'], 
        { unique: true, name: 'device_models_brand_code_idx', transaction }
      );

      await queryInterface.createTable('device_model_translations', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        device_model_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'device_models', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        lang: {
          type: Sequelize.STRING(5),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('device_model_translations', 
        ['device_model_id', 'lang'], 
        { unique: true, name: 'device_model_translations_model_lang_idx', transaction }
      );

      // ========================================
      // 4. DEVICE SERVERS (Brokers MQTT/FTP)
      // ========================================
      await queryInterface.createTable('device_servers', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true,
          comment: 'Hostname o identificador del servidor'
        },
        server_type: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'mqtt',
          comment: 'Tipo: mqtt, mqttssl, ftp, http'
        },
        host: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Hostname o IP del servidor'
        },
        port: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Puerto del servicio'
        },
        use_ssl: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        display_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
        }
      }, { transaction });

      await queryInterface.createTable('device_server_translations', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        device_server_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'device_servers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        lang: {
          type: Sequelize.STRING(5),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('device_server_translations', 
        ['device_server_id', 'lang'], 
        { unique: true, name: 'device_server_translations_server_lang_idx', transaction }
      );

      // ========================================
      // 5. DEVICE NETWORKS (Tipos de conexión)
      // ========================================
      await queryInterface.createTable('device_networks', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
          comment: 'Código único (ej: modem_4g, ethernet, wireless, lora)'
        },
        icon: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        display_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
        }
      }, { transaction });

      await queryInterface.createTable('device_network_translations', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        device_network_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'device_networks', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        lang: {
          type: Sequelize.STRING(5),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('device_network_translations', 
        ['device_network_id', 'lang'], 
        { unique: true, name: 'device_network_translations_network_lang_idx', transaction }
      );

      // ========================================
      // 6. DEVICE LICENSES (Tipos de licencia)
      // ========================================
      await queryInterface.createTable('device_licenses', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
          comment: 'Código único (ej: ec_iot, ec_automation)'
        },
        icon: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        color: {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: 'Color para UI (hex o nombre)'
        },
        display_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
        }
      }, { transaction });

      await queryInterface.createTable('device_license_translations', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        device_license_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'device_licenses', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        lang: {
          type: Sequelize.STRING(5),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('device_license_translations', 
        ['device_license_id', 'lang'], 
        { unique: true, name: 'device_license_translations_license_lang_idx', transaction }
      );

      // ========================================
      // 7. DEVICE VALIDITY PERIODS (Vigencias)
      // ========================================
      await queryInterface.createTable('device_validity_periods', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
          comment: 'Código único (ej: 12_months, 24_months, enterprise)'
        },
        months: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Cantidad de meses (null para enterprise/ilimitado)'
        },
        display_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
        }
      }, { transaction });

      await queryInterface.createTable('device_validity_period_translations', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        device_validity_period_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'device_validity_periods', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        lang: {
          type: Sequelize.STRING(5),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('device_validity_period_translations', 
        ['device_validity_period_id', 'lang'], 
        { unique: true, name: 'device_validity_translations_period_lang_idx', transaction }
      );

      await transaction.commit();
      console.log('✅ Tablas de catálogo de dispositivos creadas exitosamente');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Eliminar en orden inverso por las FK
      await queryInterface.dropTable('device_validity_period_translations', { transaction });
      await queryInterface.dropTable('device_validity_periods', { transaction });
      
      await queryInterface.dropTable('device_license_translations', { transaction });
      await queryInterface.dropTable('device_licenses', { transaction });
      
      await queryInterface.dropTable('device_network_translations', { transaction });
      await queryInterface.dropTable('device_networks', { transaction });
      
      await queryInterface.dropTable('device_server_translations', { transaction });
      await queryInterface.dropTable('device_servers', { transaction });
      
      await queryInterface.dropTable('device_model_translations', { transaction });
      await queryInterface.dropTable('device_models', { transaction });
      
      await queryInterface.dropTable('device_brand_translations', { transaction });
      await queryInterface.dropTable('device_brands', { transaction });
      
      await queryInterface.dropTable('device_type_translations', { transaction });
      await queryInterface.dropTable('device_types', { transaction });

      await transaction.commit();
      console.log('✅ Tablas de catálogo de dispositivos eliminadas');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
