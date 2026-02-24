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
    foreignKey: 'organizationId',
    as: 'organization'
});

// FileUpload pertenece a User (quien lo subió)
FileUpload.belongsTo(User, {
    foreignKey: 'uploadedBy',
    as: 'uploader'
});

// Organization tiene muchos FileUploads
Organization.hasMany(FileUpload, {
    foreignKey: 'organizationId',
    as: 'files'
});

// User tiene muchos FileUploads
User.hasMany(FileUpload, {
    foreignKey: 'uploadedBy',
    as: 'uploadedFiles'
});

export const createFileUpload = async (fileData) => {
    const id = generateUuidV7();
    const humanId = await generateHumanId(FileUpload, null, null);
    const publicCode = generatePublicCode('FILE', id);

    const file = await FileUpload.create({
        id,
        humanId,
        publicCode,
        organizationId: fileData.organizationId,
        blobPath: fileData.blobPath,
        blobUrl: fileData.blobUrl || null,
        originalName: fileData.originalName,
        fileName: fileData.fileName,
        mimeType: fileData.mimeType,
        extension: fileData.extension,
        sizeBytes: fileData.sizeBytes,
        category: fileData.category || 'other',
        ownerType: fileData.ownerType || null,
        ownerId: fileData.ownerId || null,
        status: 'pending',
        uploadedBy: fileData.uploadedBy,
        expiresAt: fileData.expiresAt,
        metadata: fileData.metadata || {},
        isPublic: fileData.isPublic || false
    });

    return file;
};

export const findByPublicCode = async (publicCode) => {
    const file = await FileUpload.findOne({
        where: { publicCode },
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'publicCode', 'slug', 'name']
            },
            {
                model: User,
                as: 'uploader',
                attributes: ['id', 'email', 'firstName', 'lastName']
            }
        ]
    });

    return file;
};

export const findByPublicCodeInternal = async (publicCode) => {
    return FileUpload.findOne({
        where: { publicCode }
    });
};

export const findById = async (id) => {
    return FileUpload.findByPk(id, {
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'publicCode', 'slug', 'name']
            },
            {
                model: User,
                as: 'uploader',
                attributes: ['id', 'email', 'firstName', 'lastName']
            }
        ]
    });
};

export const confirmUpload = async (id, updateData) => {
    const file = await FileUpload.findByPk(id);
    
    if (!file) {
        throw new Error('Archivo no encontrado');
    }

    file.status = 'uploaded';
    file.uploadedAt = new Date();
    
    if (updateData.blobUrl) {
        file.blobUrl = updateData.blobUrl;
    }
    
    if (updateData.checksumSha256) {
        file.checksumSha256 = updateData.checksumSha256;
    }
    
    if (updateData.metadata) {
        file.metadata = { ...file.metadata, ...updateData.metadata };
    }

    await file.save();

    return findById(id);
};

export const linkToEntity = async (id, ownerType, ownerId) => {
    const file = await FileUpload.findByPk(id);
    
    if (!file) {
        throw new Error('Archivo no encontrado');
    }

    file.ownerType = ownerType;
    file.ownerId = ownerId;
    file.status = 'linked';

    await file.save();

    return findById(id);
};

export const softDelete = async (id) => {
    const file = await FileUpload.findByPk(id);
    
    if (!file) {
        return false;
    }

    file.status = 'deleted';
    file.deletedAt = new Date();
    await file.save();

    return true;
};

export const listFiles = async (filters = {}) => {
    const {
        organizationId,
        organizationIds,
        category,
        status,
        ownerType,
        ownerId,
        mimeType,
        search,
        limit = 20,
        offset = 0
    } = filters;

    const where = {};

    if (organizationIds !== undefined && Array.isArray(organizationIds) && organizationIds.length > 0) {
        where.organizationId = { [Op.in]: organizationIds };
    } else if (organizationId) {
        where.organizationId = organizationId;
    }

    if (category) {
        where.category = category;
    }

    if (status) {
        where.status = status;
    } else {
        where.status = { [Op.ne]: 'deleted' };
    }

    if (ownerType) {
        where.ownerType = ownerType;
    }

    if (ownerId) {
        where.ownerId = ownerId;
    }

    if (mimeType) {
        where.mimeType = { [Op.iLike]: `${mimeType}%` };
    }

    if (search) {
        where[Op.or] = [
            { originalName: { [Op.iLike]: `%${search}%` } },
            { fileName: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const { count, rows } = await FileUpload.findAndCountAll({
        where,
        include: [
            {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'publicCode', 'slug', 'name']
            },
            {
                model: User,
                as: 'uploader',
                attributes: ['id', 'email', 'firstName', 'lastName']
            }
        ],
        order: [['createdAt', 'DESC']],
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

export const findExpiredPending = async () => {
    return FileUpload.findAll({
        where: {
            status: 'pending',
            expiresAt: { [Op.lt]: new Date() }
        }
    });
};

export const findByChecksum = async (checksum, organizationId) => {
    return FileUpload.findOne({
        where: {
            checksumSha256: checksum,
            organizationId,
            status: { [Op.ne]: 'deleted' }
        }
    });
};

export const countByOrganization = async (organizationId) => {
    return FileUpload.count({
        where: {
            organizationId,
            status: { [Op.ne]: 'deleted' }
        }
    });
};

export const getStorageStats = async (organizationId) => {
    const files = await FileUpload.findAll({
        where: {
            organizationId,
            status: { [Op.ne]: 'deleted' }
        },
        attributes: ['category', 'sizeBytes']
    });

    const stats = {
        totalFiles: files.length,
        totalBytes: 0,
        byCategory: {}
    };

    files.forEach(file => {
        const sizeBytes = parseInt(file.sizeBytes, 10);
        stats.totalBytes += sizeBytes;

        if (!stats.byCategory[file.category]) {
            stats.byCategory[file.category] = { count: 0, bytes: 0 };
        }
        stats.byCategory[file.category].count += 1;
        stats.byCategory[file.category].bytes += sizeBytes;
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
