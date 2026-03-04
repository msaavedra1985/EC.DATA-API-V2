import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de FileUpload (Archivo subido a Azure Blob Storage)
 * Usa sistema triple identificador: UUID v7 + human_id + public_code
 * 
 * - id: UUID v7 (clave primaria, usado en FKs)
 * - human_id: incremental global (sin scope, solo para uso interno/soporte)
 * - public_code: ID opaco público (formato: FILE-XXXXX-Y)
 * 
 * Tabla centralizada para gestionar todos los archivos del sistema.
 * Relacionada polimórficamente con cualquier entidad (owner_type + owner_id).
 * 
 * Estados del archivo:
 * - pending: SAS URL generada, esperando upload desde BFF
 * - uploaded: Upload completado, archivo disponible en Azure
 * - linked: Archivo vinculado a una entidad (organization, site, device, etc.)
 * - deleted: Marcado para eliminación (soft delete)
 */
const FileUpload = sequelize.define('FileUpload', {
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
        comment: 'ID público opaco (ej: FILE-7K9D2-X) - previene enumeración'
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
        comment: 'FK a organizations - organización propietaria del archivo'
    },
    blobPath: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Ruta completa en Azure Blob Storage (ej: ORG-XXX/logos/uuid_name.png)'
    },
    blobUrl: {
        type: DataTypes.STRING(1000),
        allowNull: true,
        comment: 'URL pública o firmada del archivo en Azure Blob Storage'
    },
    originalName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nombre original del archivo subido por el usuario'
    },
    fileName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nombre del archivo almacenado (sanitizado, con UUID)'
    },
    mimeType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Tipo MIME del archivo (ej: image/png, application/pdf)'
    },
    extension: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Extensión del archivo sin punto (ej: png, pdf, xlsx)'
    },
    sizeBytes: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Tamaño del archivo en bytes'
    },
    checksumSha256: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'Checksum SHA-256 del archivo para verificación de integridad'
    },
    category: {
        type: DataTypes.ENUM('logo', 'image', 'document', 'firmware', 'backup', 'export', 'import', 'attachment', 'other'),
        allowNull: false,
        defaultValue: 'other',
        comment: 'Categoría del archivo: logo, image, document, firmware, backup, export, import, attachment, other'
    },
    ownerType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Tipo de entidad propietaria (ej: organization, site, device, user)'
    },
    ownerId: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Public code de la entidad propietaria'
    },
    status: {
        type: DataTypes.ENUM('pending', 'uploaded', 'linked', 'deleted'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Estado del archivo: pending, uploaded, linked, deleted'
    },
    uploadedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK a users - usuario que subió el archivo'
    },
    uploadedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora en que se completó el upload'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de expiración para archivos temporales o pending'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadatos adicionales (dimensiones de imagen, duración de audio, etc.)'
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si el archivo es accesible públicamente sin autenticación'
    }
}, {
    tableName: 'file_uploads',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
        {
            fields: ['organization_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['category']
        },
        {
            fields: ['owner_type', 'owner_id']
        },
        {
            fields: ['uploaded_by']
        },
        {
            fields: ['mime_type']
        },
        {
            fields: ['expires_at']
        },
        {
            fields: ['checksum_sha256']
        }
    ]
});

/**
 * Relaciones del modelo FileUpload
 */
FileUpload.associate = (models) => {
    FileUpload.belongsTo(models.Organization, {
        foreignKey: 'organizationId',
        as: 'organization'
    });

    FileUpload.belongsTo(models.User, {
        foreignKey: 'uploadedBy',
        as: 'uploader'
    });
};

export default FileUpload;
