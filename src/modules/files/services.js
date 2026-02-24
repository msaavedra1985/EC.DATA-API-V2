// modules/files/services.js
// Servicios de negocio para el módulo de files
import * as repository from './repository.js';
import * as orgRepository from '../organizations/repository.js';
import { FILE_CATEGORY_CONFIG } from './dtos/index.js';
import { toPublicFileDto, toUploadUrlDto, toUploadConfirmDto, toPublicFileListDto } from './helpers/serializers.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import * as azureBlob from '../../services/azureBlob.js';
import pino from 'pino';
import { v7 as uuidv7 } from 'uuid';

const logger = pino({ name: 'files-service' });

const VALID_OWNER_TYPES = ['organization', 'site', 'device', 'channel', 'user'];

const validateOwnerType = (ownerType) => {
    if (!VALID_OWNER_TYPES.includes(ownerType)) {
        throw new Error(`owner_type inválido: ${ownerType}. Valores permitidos: ${VALID_OWNER_TYPES.join(', ')}`);
    }
};

const sanitizeFileName = (originalName) => {
    const lastDot = originalName.lastIndexOf('.');
    const extension = lastDot > 0 ? originalName.slice(lastDot + 1).toLowerCase() : '';
    const baseName = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;

    const sanitized = baseName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 100);

    return extension ? `${sanitized}.${extension}` : sanitized;
};

const getExtension = (fileName) => {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
};

const validateFileForCategory = (category, mimeType, sizeBytes, extension) => {
    const config = FILE_CATEGORY_CONFIG[category];
    
    if (!config) {
        throw new Error(`Categoría no válida: ${category}`);
    }

    if (!config.mimeTypes.includes(mimeType) && !config.mimeTypes.includes('application/octet-stream')) {
        throw new Error(`Tipo MIME no permitido para categoría ${category}: ${mimeType}. Permitidos: ${config.mimeTypes.join(', ')}`);
    }

    if (!config.extensions.includes('*') && !config.extensions.includes(extension)) {
        throw new Error(`Extensión no permitida para categoría ${category}: .${extension}. Permitidas: ${config.extensions.join(', ')}`);
    }

    if (sizeBytes > config.maxSizeBytes) {
        const maxMB = Math.round(config.maxSizeBytes / 1024 / 1024);
        const fileMB = Math.round(sizeBytes / 1024 / 1024 * 100) / 100;
        throw new Error(`Archivo muy grande para categoría ${category}: ${fileMB}MB. Máximo: ${maxMB}MB`);
    }
};

const generateBlobPath = (ownerType, ownerId, sanitizedName) => {
    const uuid = uuidv7().split('-')[0];
    return `${ownerType}/${ownerId}/${uuid}_${sanitizedName}`;
};

export const requestUploadUrl = async (data, userId, ipAddress, userAgent) => {
    logger.info({ data, userId }, 'Solicitando URL de carga');

    const organization = await orgRepository.findOrganizationByPublicCodeInternal(data.organizationId);
    if (!organization) {
        throw new Error('Organización no encontrada');
    }

    const extension = getExtension(data.originalName);
    const sanitizedName = sanitizeFileName(data.originalName);

    validateFileForCategory(data.category, data.mimeType, data.sizeBytes, extension);

    let ownerType;
    let ownerId;
    
    if (data.ownerType && data.ownerId) {
        validateOwnerType(data.ownerType);
        ownerType = data.ownerType;
        ownerId = data.ownerId;
    } else if (!data.ownerType && !data.ownerId) {
        ownerType = 'organization';
        ownerId = organization.publicCode;
    } else {
        throw new Error('ownerType y ownerId deben proporcionarse juntos o ninguno');
    }

    const blobPath = generateBlobPath(ownerType, ownerId, sanitizedName);

    const isPublic = data.isPublic || false;

    let sasResult;
    let blobUrl;
    
    if (isPublic) {
        sasResult = azureBlob.generatePublicUploadSasUrl(blobPath);
        blobUrl = sasResult.publicUrl;
    } else {
        sasResult = azureBlob.generateUploadSasUrl(blobPath);
        const baseUrl = azureBlob.getStorageBaseUrl();
        const { config: appConfig } = await import('../../config/env.js');
        blobUrl = `${baseUrl}/${appConfig.azure.containerPrivate}/${blobPath}`;
    }

    const file = await repository.createFileUpload({
        organizationId: organization.id,
        blobPath,
        blobUrl,
        originalName: data.originalName,
        fileName: sanitizedName,
        mimeType: data.mimeType,
        extension,
        sizeBytes: data.sizeBytes,
        category: data.category,
        ownerType,
        ownerId,
        uploadedBy: userId,
        expiresAt: sasResult.expiresAt,
        metadata: data.metadata,
        isPublic
    });

    await logAuditAction({
        entityType: 'file_upload',
        entityId: file.id,
        action: 'request_upload_url',
        performedBy: userId,
        changes: {
            created: {
                publicCode: file.publicCode,
                blobPath,
                originalName: data.originalName,
                category: data.category,
                sizeBytes: data.sizeBytes,
                isPublic
            }
        },
        ipAddress,
        userAgent
    });

    logger.info({ fileId: file.publicCode, blobPath, isPublic }, 'URL de carga solicitada exitosamente');

    const categoryConfig = FILE_CATEGORY_CONFIG[data.category];

    return toUploadUrlDto({
        publicCode: file.publicCode,
        uploadUrl: sasResult.sasUrl,
        blobPath,
        expiresAt: sasResult.expiresAt,
        maxSizeBytes: categoryConfig.maxSizeBytes,
        allowedMimeTypes: categoryConfig.mimeTypes,
        isPublic,
        publicUrl: isPublic ? sasResult.publicUrl : null
    });
};

export const confirmUpload = async (publicCode, confirmData, userId, ipAddress, userAgent) => {
    logger.info({ publicCode, userId }, 'Confirmando upload');

    const file = await repository.findByPublicCodeInternal(publicCode);
    if (!file) {
        throw new Error('Archivo no encontrado');
    }

    if (file.status !== 'pending') {
        throw new Error(`No se puede confirmar archivo en estado: ${file.status}`);
    }

    if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
        throw new Error('La URL de carga ha expirado');
    }

    const blobUrl = file.blobUrl;

    const updatedFile = await repository.confirmUpload(file.id, {
        blobUrl,
        checksumSha256: confirmData.checksumSha256,
        metadata: confirmData.metadata
    });

    await logAuditAction({
        entityType: 'file_upload',
        entityId: file.id,
        action: 'confirm_upload',
        performedBy: userId,
        changes: {
            old: { status: 'pending' },
            new: { 
                status: 'uploaded',
                checksumSha256: confirmData.checksumSha256,
                uploadedAt: updatedFile.uploadedAt
            }
        },
        ipAddress,
        userAgent
    });

    logger.info({ fileId: publicCode }, 'Upload confirmado exitosamente');

    return toUploadConfirmDto(updatedFile);
};

export const getFileByPublicCode = async (publicCode) => {
    const file = await repository.findByPublicCode(publicCode);
    
    if (!file) {
        throw new Error('Archivo no encontrado');
    }

    return toPublicFileDto(file);
};

export const listFiles = async (filters) => {
    const { showAll = false } = filters;
    
    if (showAll) {
        const repoFilters = { ...filters, showAll: true };
        delete repoFilters.organizationId;
        delete repoFilters.organizationIds;
        
        const result = await repository.listFiles(repoFilters);
        return toPublicFileListDto(result);
    }
    
    let organizationUuid = null;
    let organizationUuids = null;

    if (filters.organizationIds && Array.isArray(filters.organizationIds) && filters.organizationIds.length > 0) {
        organizationUuids = filters.organizationIds;
    } else if (filters.organizationId) {
        const org = await orgRepository.findOrganizationByPublicCodeInternal(filters.organizationId);
        if (org) {
            organizationUuid = org.id;
        } else {
            return toPublicFileListDto({
                files: [],
                total: 0,
                limit: filters.limit || 20,
                offset: filters.offset || 0
            });
        }
    }

    const repoFilters = {
        ...filters,
        organizationId: organizationUuid,
        organizationIds: organizationUuids
    };

    const result = await repository.listFiles(repoFilters);
    return toPublicFileListDto(result);
};

export const linkFile = async (publicCode, ownerType, ownerId, userId, ipAddress, userAgent) => {
    const file = await repository.findByPublicCodeInternal(publicCode);
    
    if (!file) {
        throw new Error('Archivo no encontrado');
    }

    if (file.status !== 'uploaded') {
        throw new Error(`No se puede vincular archivo en estado: ${file.status}`);
    }

    const oldOwner = { ownerType: file.ownerType, ownerId: file.ownerId };
    
    const updatedFile = await repository.linkToEntity(file.id, ownerType, ownerId);

    await logAuditAction({
        entityType: 'file_upload',
        entityId: file.id,
        action: 'link',
        performedBy: userId,
        changes: {
            old: oldOwner,
            new: { ownerType, ownerId, status: 'linked' }
        },
        ipAddress,
        userAgent
    });

    logger.info({ fileId: publicCode, ownerType, ownerId }, 'Archivo vinculado');

    return toPublicFileDto(updatedFile);
};

export const deleteFile = async (publicCode, userId, ipAddress, userAgent) => {
    const file = await repository.findByPublicCodeInternal(publicCode);
    
    if (!file) {
        throw new Error('Archivo no encontrado');
    }

    const oldData = {
        status: file.status,
        blobPath: file.blobPath,
        originalName: file.originalName
    };

    await repository.softDelete(file.id);

    await logAuditAction({
        entityType: 'file_upload',
        entityId: file.id,
        action: 'delete',
        performedBy: userId,
        changes: {
            old: oldData,
            new: { status: 'deleted', deletedAt: new Date() }
        },
        ipAddress,
        userAgent
    });

    logger.info({ fileId: publicCode }, 'Archivo eliminado');

    return {
        deleted: true,
        fileId: publicCode
    };
};

export const getStorageStats = async (orgPublicCode) => {
    const org = await orgRepository.findOrganizationByPublicCodeInternal(orgPublicCode);
    
    if (!org) {
        throw new Error('Organización no encontrada');
    }

    const stats = await repository.getStorageStats(org.id);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
        organizationId: orgPublicCode,
        totalFiles: stats.totalFiles,
        totalBytes: stats.totalBytes,
        totalFormatted: formatBytes(stats.totalBytes),
        byCategory: Object.entries(stats.byCategory).reduce((acc, [category, data]) => {
            acc[category] = {
                count: data.count,
                bytes: data.bytes,
                formatted: formatBytes(data.bytes)
            };
            return acc;
        }, {})
    };
};

export default {
    requestUploadUrl,
    confirmUpload,
    getFileByPublicCode,
    listFiles,
    linkFile,
    deleteFile,
    getStorageStats
};
