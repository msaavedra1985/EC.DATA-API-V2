// modules/files/repository.js
// Repositorio para operaciones de base de datos de FileUpload
import { Op } from 'sequelize';
import FileUpload from './models/FileUpload.js';
import Organization from '../organizations/models/Organization.js';
import User from '../auth/models/User.js';
import { generateUuidV7, generateHumanId, generatePublicCode } from '../../utils/identifiers.js';

// Definir asociaciones de FileUpload
// FileUpload pertenece a Organization
FileUpload.belongsTo(Organization, {
    foreignKey: 'organization_id',
    as: 'organization'
});

// FileUpload pertenece a User (quien lo subió)
FileUpload.belongsTo(User, {
    foreignKey: 'uploaded_by',
    as: 'uploader'
});

// Organization tiene muchos FileUploads
Organization.hasMany(FileUpload, {
    foreignKey: 'organization_id',
    as: 'files'
});

// User tiene muchos FileUploads
User.hasMany(FileUpload, {
    foreignKey: 'uploaded_by',
    as: 'uploadedFiles'
});

/**
 * Crear un nuevo registro de archivo (estado pending)
 * Genera automáticamente: UUID v7, human_id incremental, public_code
 * 
 * @param {Object} fileData - Datos del archivo
 * @param {string} fileData.organization_id - UUID interno de la organización
 * @param {string} fileData.blob_path - Ruta en Azure Blob
 * @param {string} fileData.original_name - Nombre original del archivo
 * @param {string} fileData.file_name - Nombre sanitizado del archivo
 * @param {string} fileData.mime_type - Tipo MIME
 * @param {string} fileData.extension - Extensión del archivo
 * @param {number} fileData.size_bytes - Tamaño en bytes
 * @param {string} fileData.category - Categoría del archivo
 * @param {string} [fileData.owner_type] - Tipo de entidad propietaria
 * @param {string} [fileData.owner_id] - Public code de la entidad propietaria
 * @param {string} fileData.uploaded_by - UUID del usuario que sube
 * @param {Date} fileData.expires_at - Fecha de expiración del SAS URL
 * @param {Object} [fileData.metadata] - Metadatos adicionales
 * @returns {Promise<FileUpload>} - Registro de archivo creado
 */
export const createFileUpload = async (fileData) => {
    // Generar identificadores únicos
    const id = generateUuidV7();
    const human_id = await generateHumanId(FileUpload, null, null);
    const public_code = generatePublicCode('FILE', id);

    const file = await FileUpload.create({
        id,
        human_id,
        public_code,
        organization_id: fileData.organization_id,
        blob_path: fileData.blob_path,
        blob_url: fileData.blob_url || null,
        original_name: fileData.original_name,
        file_name: fileData.file_name,
        mime_type: fileData.mime_type,
        extension: fileData.extension,
        size_bytes: fileData.size_bytes,
        category: fileData.category || 'other',
        owner_type: fileData.owner_type || null,
        owner_id: fileData.owner_id || null,
        status: 'pending',
        uploaded_by: fileData.uploaded_by,
        expires_at: fileData.expires_at,
        metadata: fileData.metadata || {},
        is_public: fileData.is_public || false
    });

    return file;
};

/**
 * Buscar archivo por public_code
 * 
 * @param {string} publicCode - Public code del archivo (FILE-XXXXX-X)
 * @returns {Promise<FileUpload|null>} - Archivo encontrado o null
 */
export const findByPublicCode = async (publicCode) => {
    const file = await FileUpload.findOne({
        where: { public_code: publicCode },
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name']
            },
            {
                model: User,
                as: 'uploader',
                attributes: ['id', 'email', 'first_name', 'last_name']
            }
        ]
    });

    return file;
};

/**
 * Buscar archivo por public_code (solo para uso interno, retorna UUID)
 * 
 * @param {string} publicCode - Public code del archivo
 * @returns {Promise<FileUpload|null>} - Archivo con UUID interno
 */
export const findByPublicCodeInternal = async (publicCode) => {
    return FileUpload.findOne({
        where: { public_code: publicCode }
    });
};

/**
 * Buscar archivo por UUID
 * 
 * @param {string} id - UUID del archivo
 * @returns {Promise<FileUpload|null>} - Archivo encontrado o null
 */
export const findById = async (id) => {
    return FileUpload.findByPk(id, {
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name']
            },
            {
                model: User,
                as: 'uploader',
                attributes: ['id', 'email', 'first_name', 'last_name']
            }
        ]
    });
};

/**
 * Actualizar archivo para confirmar upload
 * Cambia estado de 'pending' a 'uploaded'
 * 
 * @param {string} id - UUID del archivo
 * @param {Object} updateData - Datos a actualizar
 * @param {string} [updateData.blob_url] - URL del archivo en Azure
 * @param {string} [updateData.checksum_sha256] - Checksum del archivo
 * @param {Object} [updateData.metadata] - Metadatos adicionales
 * @returns {Promise<FileUpload>} - Archivo actualizado
 */
export const confirmUpload = async (id, updateData) => {
    const file = await FileUpload.findByPk(id);
    
    if (!file) {
        throw new Error('Archivo no encontrado');
    }

    // Actualizar campos
    file.status = 'uploaded';
    file.uploaded_at = new Date();
    
    if (updateData.blob_url) {
        file.blob_url = updateData.blob_url;
    }
    
    if (updateData.checksum_sha256) {
        file.checksum_sha256 = updateData.checksum_sha256;
    }
    
    if (updateData.metadata) {
        file.metadata = { ...file.metadata, ...updateData.metadata };
    }

    await file.save();

    // Recargar con relaciones
    return findById(id);
};

/**
 * Vincular archivo a una entidad
 * Cambia estado a 'linked'
 * 
 * @param {string} id - UUID del archivo
 * @param {string} ownerType - Tipo de entidad (organization, site, device, etc.)
 * @param {string} ownerId - Public code de la entidad
 * @returns {Promise<FileUpload>} - Archivo actualizado
 */
export const linkToEntity = async (id, ownerType, ownerId) => {
    const file = await FileUpload.findByPk(id);
    
    if (!file) {
        throw new Error('Archivo no encontrado');
    }

    file.owner_type = ownerType;
    file.owner_id = ownerId;
    file.status = 'linked';

    await file.save();

    return findById(id);
};

/**
 * Soft delete de archivo
 * 
 * @param {string} id - UUID del archivo
 * @returns {Promise<boolean>} - true si se eliminó
 */
export const softDelete = async (id) => {
    const file = await FileUpload.findByPk(id);
    
    if (!file) {
        return false;
    }

    file.status = 'deleted';
    file.deleted_at = new Date();
    await file.save();

    return true;
};

/**
 * Listar archivos con filtros y paginación
 * 
 * @param {Object} filters - Filtros de búsqueda
 * @param {string} [filters.organization_id] - UUID de organización
 * @param {string[]} [filters.organization_ids] - Array de UUIDs de organizaciones
 * @param {string} [filters.category] - Categoría del archivo
 * @param {string} [filters.status] - Estado del archivo
 * @param {string} [filters.owner_type] - Tipo de propietario
 * @param {string} [filters.owner_id] - ID del propietario
 * @param {string} [filters.mime_type] - Tipo MIME
 * @param {string} [filters.search] - Búsqueda en nombre
 * @param {number} [filters.limit] - Límite de resultados
 * @param {number} [filters.offset] - Offset para paginación
 * @returns {Promise<{files: FileUpload[], total: number, limit: number, offset: number}>}
 */
export const listFiles = async (filters = {}) => {
    const {
        organization_id,
        organization_ids,  // Array de UUIDs para filtrar múltiples organizaciones
        category,
        status,
        owner_type,
        owner_id,
        mime_type,
        search,
        limit = 20,
        offset = 0
    } = filters;

    const where = {};

    // Soporte para filtro de múltiples organizaciones (usado por all=true con scope limitado)
    if (organization_ids !== undefined && Array.isArray(organization_ids) && organization_ids.length > 0) {
        where.organization_id = { [Op.in]: organization_ids };
    } else if (organization_id) {
        where.organization_id = organization_id;
    }

    // Filtro por categoría
    if (category) {
        where.category = category;
    }

    // Filtro por estado (por defecto excluir deleted)
    if (status) {
        where.status = status;
    } else {
        where.status = { [Op.ne]: 'deleted' };
    }

    // Filtro por propietario
    if (owner_type) {
        where.owner_type = owner_type;
    }

    if (owner_id) {
        where.owner_id = owner_id;
    }

    // Filtro por MIME type
    if (mime_type) {
        where.mime_type = { [Op.iLike]: `${mime_type}%` };
    }

    // Búsqueda en nombre
    if (search) {
        where[Op.or] = [
            { original_name: { [Op.iLike]: `%${search}%` } },
            { file_name: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const { count, rows } = await FileUpload.findAndCountAll({
        where,
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'public_code', 'slug', 'name']
            },
            {
                model: User,
                as: 'uploader',
                attributes: ['id', 'email', 'first_name', 'last_name']
            }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
    });

    return {
        files: rows,
        total: count,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
    };
};

/**
 * Buscar archivos pendientes expirados (para cleanup job)
 * 
 * @returns {Promise<FileUpload[]>} - Archivos pendientes expirados
 */
export const findExpiredPending = async () => {
    return FileUpload.findAll({
        where: {
            status: 'pending',
            expires_at: { [Op.lt]: new Date() }
        }
    });
};

/**
 * Buscar archivos por checksum
 * Útil para detectar duplicados
 * 
 * @param {string} checksum - Checksum SHA-256
 * @param {string} organizationId - UUID de organización
 * @returns {Promise<FileUpload|null>} - Archivo encontrado o null
 */
export const findByChecksum = async (checksum, organizationId) => {
    return FileUpload.findOne({
        where: {
            checksum_sha256: checksum,
            organization_id: organizationId,
            status: { [Op.ne]: 'deleted' }
        }
    });
};

/**
 * Contar archivos por organización
 * 
 * @param {string} organizationId - UUID de organización
 * @returns {Promise<number>} - Cantidad de archivos
 */
export const countByOrganization = async (organizationId) => {
    return FileUpload.count({
        where: {
            organization_id: organizationId,
            status: { [Op.ne]: 'deleted' }
        }
    });
};

/**
 * Obtener estadísticas de almacenamiento por organización
 * 
 * @param {string} organizationId - UUID de organización
 * @returns {Promise<{total_files: number, total_bytes: number, by_category: Object}>}
 */
export const getStorageStats = async (organizationId) => {
    const files = await FileUpload.findAll({
        where: {
            organization_id: organizationId,
            status: { [Op.ne]: 'deleted' }
        },
        attributes: ['category', 'size_bytes']
    });

    const stats = {
        total_files: files.length,
        total_bytes: 0,
        by_category: {}
    };

    files.forEach(file => {
        const sizeBytes = parseInt(file.size_bytes, 10);
        stats.total_bytes += sizeBytes;

        if (!stats.by_category[file.category]) {
            stats.by_category[file.category] = { count: 0, bytes: 0 };
        }
        stats.by_category[file.category].count += 1;
        stats.by_category[file.category].bytes += sizeBytes;
    });

    return stats;
};

export default {
    createFileUpload,
    findByPublicCode,
    findByPublicCodeInternal,
    findById,
    confirmUpload,
    linkToEntity,
    softDelete,
    listFiles,
    findExpiredPending,
    findByChecksum,
    countByOrganization,
    getStorageStats
};
