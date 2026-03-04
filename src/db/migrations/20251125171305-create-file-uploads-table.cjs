'use strict';

/**
 * Migración: Crear tabla file_uploads
 * 
 * Tabla centralizada para gestionar todos los archivos subidos a Azure Blob Storage.
 * - Identificadores: UUID v7 + human_id + public_code (FILE-XXXXX-X)
 * - Estados: pending, uploaded, linked, deleted
 * - Soporta múltiples tipos de archivo: imágenes, PDFs, XLS, ZIP, etc.
 * - Relacionada polimórficamente con cualquier entidad (owner_type + owner_id)
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear ENUM para estado del archivo
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_file_uploads_status') THEN
          CREATE TYPE enum_file_uploads_status AS ENUM (
            'pending', 'uploaded', 'linked', 'deleted'
          );
        END IF;
      END $$;
    `);

    // Crear ENUM para categoría del archivo
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_file_uploads_category') THEN
          CREATE TYPE enum_file_uploads_category AS ENUM (
            'logo', 'image', 'document', 'firmware', 'backup', 'export', 'import', 'attachment', 'other'
          );
        END IF;
      END $$;
    `);

    // Crear tabla file_uploads
    await queryInterface.createTable('file_uploads', {
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
        comment: 'ID público opaco (ej: FILE-7K9D2-X) - previene enumeración'
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
        comment: 'FK a organizations - organización propietaria del archivo'
      },
      blob_path: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Ruta completa en Azure Blob Storage (ej: ORG-XXX/logos/uuid_name.png)'
      },
      blob_url: {
        type: Sequelize.STRING(1000),
        allowNull: true,
        comment: 'URL pública o firmada del archivo en Azure Blob Storage'
      },
      original_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Nombre original del archivo subido por el usuario'
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Nombre del archivo almacenado (sanitizado, con UUID)'
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Tipo MIME del archivo (ej: image/png, application/pdf)'
      },
      extension: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Extensión del archivo sin punto (ej: png, pdf, xlsx)'
      },
      size_bytes: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'Tamaño del archivo en bytes'
      },
      checksum_sha256: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'Checksum SHA-256 del archivo para verificación de integridad'
      },
      category: {
        type: 'enum_file_uploads_category',
        allowNull: false,
        defaultValue: 'other',
        comment: 'Categoría del archivo: logo, image, document, firmware, backup, export, import, attachment, other'
      },
      owner_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Tipo de entidad propietaria (ej: organization, site, device, user)'
      },
      owner_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Public code de la entidad propietaria'
      },
      status: {
        type: 'enum_file_uploads_status',
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Estado del archivo: pending (esperando upload), uploaded (subido), linked (vinculado a entidad), deleted (marcado para eliminar)'
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a users - usuario que subió el archivo'
      },
      uploaded_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Fecha y hora en que se completó el upload'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Fecha de expiración para archivos temporales o pending'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadatos adicionales (dimensiones de imagen, duración de audio, etc.)'
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si el archivo es accesible públicamente sin autenticación'
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

    // Índices para optimizar búsquedas
    await queryInterface.addIndex('file_uploads', ['organization_id'], {
      name: 'file_uploads_organization_id_idx'
    });

    await queryInterface.addIndex('file_uploads', ['status'], {
      name: 'file_uploads_status_idx'
    });

    await queryInterface.addIndex('file_uploads', ['category'], {
      name: 'file_uploads_category_idx'
    });

    await queryInterface.addIndex('file_uploads', ['owner_type', 'owner_id'], {
      name: 'file_uploads_owner_idx'
    });

    await queryInterface.addIndex('file_uploads', ['uploaded_by'], {
      name: 'file_uploads_uploaded_by_idx'
    });

    await queryInterface.addIndex('file_uploads', ['mime_type'], {
      name: 'file_uploads_mime_type_idx'
    });

    await queryInterface.addIndex('file_uploads', ['expires_at'], {
      name: 'file_uploads_expires_at_idx'
    });

    await queryInterface.addIndex('file_uploads', ['checksum_sha256'], {
      name: 'file_uploads_checksum_idx'
    });

    // Índice para soft delete
    await queryInterface.addIndex('file_uploads', ['deleted_at'], {
      name: 'file_uploads_deleted_at_idx'
    });

    // Índice compuesto para búsqueda de archivos pendientes expirados (para cleanup job)
    await queryInterface.addIndex('file_uploads', ['status', 'expires_at'], {
      name: 'file_uploads_pending_expired_idx',
      where: {
        status: 'pending'
      }
    });
  },

  async down(queryInterface, Sequelize) {
    // Eliminar tabla
    await queryInterface.dropTable('file_uploads');

    // Eliminar ENUMs
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_file_uploads_status;
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_file_uploads_category;
    `);
  }
};
