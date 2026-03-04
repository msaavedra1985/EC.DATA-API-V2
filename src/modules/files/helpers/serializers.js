// modules/files/helpers/serializers.js
// Serializadores para convertir modelos internos a DTOs públicos

export const toPublicFileDto = (file) => {
    if (!file) return null;
    
    const dto = {
        id: file.publicCode,
        blobUrl: file.blobUrl,
        originalName: file.originalName,
        fileName: file.fileName,
        mimeType: file.mimeType,
        extension: file.extension,
        sizeBytes: parseInt(file.sizeBytes, 10),
        sizeFormatted: formatFileSize(parseInt(file.sizeBytes, 10)),
        checksumSha256: file.checksumSha256,
        category: file.category,
        ownerType: file.ownerType,
        ownerId: file.ownerId,
        status: file.status,
        isPublic: file.isPublic,
        uploadedAt: file.uploadedAt,
        expiresAt: file.expiresAt,
        metadata: file.metadata || {},
        createdAt: file.createdAt,
        updatedAt: file.updatedAt
    };
    
    if (file.organization) {
        dto.organization = {
            id: file.organization.publicCode,
            slug: file.organization.slug,
            name: file.organization.name
        };
    }
    
    if (file.uploader) {
        dto.uploadedBy = {
            id: file.uploader.publicCode || file.uploader.id,
            email: file.uploader.email,
            firstName: file.uploader.firstName,
            lastName: file.uploader.lastName
        };
    }
    
    return dto;
};

export const toPublicFileDtoList = (files) => {
    if (!Array.isArray(files)) return [];
    return files.map(toPublicFileDto);
};

export const toUploadUrlDto = (uploadData) => {
    const dto = {
        fileId: uploadData.publicCode,
        uploadUrl: uploadData.uploadUrl,
        blobPath: uploadData.blobPath,
        expiresAt: uploadData.expiresAt,
        maxSizeBytes: uploadData.maxSizeBytes,
        allowedMimeTypes: uploadData.allowedMimeTypes,
        isPublic: uploadData.isPublic || false
    };

    if (uploadData.isPublic && uploadData.publicUrl) {
        dto.publicUrl = uploadData.publicUrl;
    }

    return dto;
};

export const toUploadConfirmDto = (file) => {
    return {
        id: file.publicCode,
        blobUrl: file.blobUrl,
        originalName: file.originalName,
        fileName: file.fileName,
        mimeType: file.mimeType,
        extension: file.extension,
        sizeBytes: parseInt(file.sizeBytes, 10),
        sizeFormatted: formatFileSize(parseInt(file.sizeBytes, 10)),
        checksumSha256: file.checksumSha256,
        category: file.category,
        status: file.status,
        uploadedAt: file.uploadedAt
    };
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const toPublicFileListDto = (result) => {
    return {
        files: toPublicFileDtoList(result.files),
        pagination: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.total > result.offset + result.files.length
        }
    };
};
