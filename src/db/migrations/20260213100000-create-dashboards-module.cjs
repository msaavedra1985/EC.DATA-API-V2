'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper para crear índices ignorando duplicados (sync puede crearlos antes)
    const safeAddIndex = async (table, fields, options) => {
      try {
        await queryInterface.addIndex(table, fields, options);
      } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    };

    // ============================================================
    // 1. dashboards - Entidad principal de dashboards
    // ============================================================
    await queryInterface.createTable('dashboards', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        comment: 'UUID v7 - clave primaria time-ordered'
      },
      public_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: DSH-7K9D2-X) - previene enumeración'
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a organizations - organización dueña del dashboard'
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a users - usuario creador del dashboard'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Nombre del dashboard'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Descripción del dashboard'
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Icono del dashboard (nombre o clase CSS)'
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si el dashboard es visible para todos los usuarios de la org'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft delete flag'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Paranoid soft delete timestamp'
      }
    });

    await safeAddIndex('dashboards', ['organization_id'], { name: 'dashboards_organization_id_idx' });
    await safeAddIndex('dashboards', ['owner_id'], { name: 'dashboards_owner_id_idx' });
    await safeAddIndex('dashboards', ['is_public'], { name: 'dashboards_is_public_idx' });
    await safeAddIndex('dashboards', ['is_active'], { name: 'dashboards_is_active_idx' });

    // ============================================================
    // 2. dashboard_pages - Pestañas dentro de un dashboard
    // ============================================================
    await queryInterface.createTable('dashboard_pages', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        comment: 'UUID v7 - clave primaria time-ordered'
      },
      dashboard_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'dashboards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a dashboards - dashboard padre'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Nombre de la pestaña (ej: Energía, Clima)'
      },
      order_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden de la pestaña dentro del dashboard'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      }
    });

    await safeAddIndex('dashboard_pages', ['dashboard_id'], { name: 'dashboard_pages_dashboard_id_idx' });
    await safeAddIndex('dashboard_pages', ['dashboard_id', 'order_index'], { name: 'dashboard_pages_order_idx' });

    // ============================================================
    // 3. widgets - Componentes visuales dentro de una página
    // ============================================================
    await queryInterface.createTable('widgets', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        comment: 'UUID v7 - clave primaria time-ordered'
      },
      dashboard_page_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'dashboard_pages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a dashboard_pages - página contenedora'
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Tipo de widget: line_chart, bar_chart, gauge, stat_card, table, map, heatmap, etc.'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'Título visible del widget'
      },
      layout: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: { x: 0, y: 0, w: 4, h: 3 },
        comment: 'Posición y tamaño en el grid: {x, y, w, h}'
      },
      style_config: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Configuración visual: colores, ejes, títulos, leyendas, etc.'
      },
      data_config: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Configuración de datos: agregación, rango temporal, filtros, etc.'
      },
      order_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden del widget (para renderizado secuencial en mobile)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      }
    });

    await safeAddIndex('widgets', ['dashboard_page_id'], { name: 'widgets_dashboard_page_id_idx' });
    await safeAddIndex('widgets', ['type'], { name: 'widgets_type_idx' });

    // ============================================================
    // 4. widget_data_sources - Vínculos widget ↔ recursos reales
    // ============================================================
    await queryInterface.createTable('widget_data_sources', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        comment: 'UUID v7 - clave primaria time-ordered'
      },
      widget_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'widgets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a widgets - widget que consume este recurso'
      },
      entity_type: {
        type: Sequelize.STRING(30),
        allowNull: false,
        comment: 'Tipo de recurso: channel, device, site, resource_hierarchy'
      },
      entity_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Public code del recurso (CHN-xxx, DEV-xxx, SIT-xxx, RES-xxx)'
      },
      label: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'Etiqueta personalizada para esta fuente de datos en el widget'
      },
      series_config: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Config específica de esta serie: color override, eje Y, agregación, variable_id, etc.'
      },
      order_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden de la serie dentro del widget'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      }
    });

    await safeAddIndex('widget_data_sources', ['widget_id'], { name: 'widget_data_sources_widget_id_idx' });
    await safeAddIndex('widget_data_sources', ['entity_type', 'entity_id'], { name: 'widget_data_sources_entity_idx' });

    // ============================================================
    // 5. dashboard_groups - Playlists/agrupación de dashboards
    // ============================================================
    await queryInterface.createTable('dashboard_groups', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        comment: 'UUID v7 - clave primaria time-ordered'
      },
      public_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: DGR-7K9D2-X) - previene enumeración'
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a organizations - organización dueña del grupo'
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a users - usuario creador del grupo'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Nombre del grupo/playlist'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Descripción del grupo'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft delete flag'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Paranoid soft delete timestamp'
      }
    });

    await safeAddIndex('dashboard_groups', ['organization_id'], { name: 'dashboard_groups_organization_id_idx' });
    await safeAddIndex('dashboard_groups', ['owner_id'], { name: 'dashboard_groups_owner_id_idx' });
    await safeAddIndex('dashboard_groups', ['is_active'], { name: 'dashboard_groups_is_active_idx' });

    // ============================================================
    // 6. dashboard_group_items - N:M ordenada dashboard ↔ grupo
    // ============================================================
    await queryInterface.createTable('dashboard_group_items', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        comment: 'UUID v7 - clave primaria'
      },
      dashboard_group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'dashboard_groups', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a dashboard_groups'
      },
      dashboard_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'dashboards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a dashboards'
      },
      order_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden del dashboard dentro del grupo'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      }
    });

    await safeAddIndex('dashboard_group_items', ['dashboard_group_id'], { name: 'dashboard_group_items_group_id_idx' });
    await safeAddIndex('dashboard_group_items', ['dashboard_id'], { name: 'dashboard_group_items_dashboard_id_idx' });
    await safeAddIndex('dashboard_group_items', ['dashboard_group_id', 'dashboard_id'], {
      unique: true,
      name: 'dashboard_group_items_unique_pair'
    });

    // ============================================================
    // 7. dashboard_collaborators - ACL usuario ↔ dashboard
    // ============================================================
    await queryInterface.createTable('dashboard_collaborators', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        comment: 'UUID v7 - clave primaria'
      },
      dashboard_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'dashboards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a dashboards'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a users - usuario colaborador'
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'viewer',
        comment: 'Rol del colaborador: viewer, editor'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      }
    });

    await safeAddIndex('dashboard_collaborators', ['dashboard_id'], { name: 'dashboard_collaborators_dashboard_id_idx' });
    await safeAddIndex('dashboard_collaborators', ['user_id'], { name: 'dashboard_collaborators_user_id_idx' });
    await safeAddIndex('dashboard_collaborators', ['dashboard_id', 'user_id'], {
      unique: true,
      name: 'dashboard_collaborators_unique_pair'
    });

    // ============================================================
    // 8. dashboard_group_collaborators - ACL usuario ↔ grupo
    // ============================================================
    await queryInterface.createTable('dashboard_group_collaborators', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        comment: 'UUID v7 - clave primaria'
      },
      dashboard_group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'dashboard_groups', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a dashboard_groups'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a users - usuario colaborador'
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'viewer',
        comment: 'Rol del colaborador: viewer, editor'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      }
    });

    await safeAddIndex('dashboard_group_collaborators', ['dashboard_group_id'], { name: 'dg_collaborators_group_id_idx' });
    await safeAddIndex('dashboard_group_collaborators', ['user_id'], { name: 'dg_collaborators_user_id_idx' });
    await safeAddIndex('dashboard_group_collaborators', ['dashboard_group_id', 'user_id'], {
      unique: true,
      name: 'dg_collaborators_unique_pair'
    });
  },

  async down(queryInterface) {
    // Eliminar en orden inverso por dependencias
    await queryInterface.dropTable('dashboard_group_collaborators');
    await queryInterface.dropTable('dashboard_collaborators');
    await queryInterface.dropTable('dashboard_group_items');
    await queryInterface.dropTable('dashboard_groups');
    await queryInterface.dropTable('widget_data_sources');
    await queryInterface.dropTable('widgets');
    await queryInterface.dropTable('dashboard_pages');
    await queryInterface.dropTable('dashboards');
  }
};
