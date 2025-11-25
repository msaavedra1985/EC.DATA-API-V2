// modules/files/services.js
// Servicios de negocio para el módulo de files
import * as repository from './repository.js';
import * as orgRepository from '../organizations/repository.js';
import { FILE_CATEGORY_CONFIG } from './dtos/index.js';
import { toPublicFileDto, toUploadUrlDto, toUploadConfirmDto, toPublicFileListDto } from './helpers/serializers.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import pino from 'pino';
import { v7 as uuidv7 } from 'uuid';

// Logger específico para el módulo de files
const logger = pino({ name: 'files-service' });

/**
 * Sanitizar nombre de archivo
 * Remueve caracteres peligrosos y normaliza el nombre
 * 
 * @param {string} originalName - Nombre original del archivo
 * @returns {string} - Nombre sanitizado
 */
const sanitizeFileName = (originalName) => {
    // Obtener extensión
    const lastDot = originalName.lastIndexOf('.');
    const extension = lastDot > 0 ? originalName.slice(lastDot + 1).toLowerCase() : '';
    const baseName = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;

    // Sanitizar: solo alfanuméricos, guiones y guiones bajos
    const sanitized = baseName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-zA-Z0-9_-]/g, '_') // Reemplazar caracteres especiales
        .replace(/_+/g, '_') // Colapsar guiones bajos múltiples
        .replace(/^_|_$/g, '') // Remover guiones bajos al inicio/final
        .slice(0, 100); // Limitar longitud

    return extension ? `${sanitized}.${extension}` : sanitized;
};

/**
 * Extraer extensión de archivo
 * 
 * @param {string} fileName - Nombre del archivo
 * @returns {string} - Extensión sin punto
 */
const getExtension = (fileName) => {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
};

/**
 * Validar archivo según categoría
 * 
 * @param {string} category - Categoría del archivo
 * @param {string} mimeType - Tipo MIME
 * @param {number} sizeBytes - Tamaño en bytes
 * @param {string} extension - Extensión del archivo
 * @throws {Error} - Si la validación falla
 */
const validateFileForCategory = (category, mimeType, sizeBytes, extension) => {
    const config = FILE_CATEGORY_CONFIG[category];
    
    if (!config) {
        throw new Error(`Categoría no válida: ${category}`);
    }

    // Validar tipo MIME
    if (!config.mimeTypes.includes(mimeType) && !config.mimeTypes.includes('application/octet-stream')) {
        throw new Error(`Tipo MIME no permitido para categoría ${category}: ${mimeType}. Permitidos: ${config.mimeTypes.join(', ')}`);
    }

    // Validar extensión (si no es wildcard)
    if (!config.extensions.includes('*') && !config.extensions.includes(extension)) {
        throw new Error(`Extensión no permitida para categoría ${category}: .${extension}. Permitidas: ${config.extensions.join(', ')}`);
    }

    // Validar tamaño
    if (sizeBytes > config.maxSizeBytes) {
        const maxMB = Math.round(config.maxSizeBytes / 1024 / 1024);
        const fileMB = Math.round(sizeBytes / 1024 / 1024 * 100) / 100;
        throw new Error(`Archivo muy grande para categoría ${category}: ${fileMB}MB. Máximo: ${maxMB}MB`);
    }
};

/**
 * Generar ruta de blob en Azure
 * Formato: {org_public_code}/{category}/{uuid}_{sanitized_name}
 * 
 * @param {string} orgPublicCode - Public code de la organización
 * @param {string} category - Categoría del archivo
 * @param {string} sanitizedName - Nombre sanitizado del archivo
 * @returns {string} - Ruta del blob
 */
const generateBlobPath = (orgPublicCode, category, sanitizedName) => {
    const uuid = uuidv7().split('-')[0]; // Usar solo primeros 8 caracteres del UUID
    return `${orgPublicCode}/${category}/${uuid}_${sanitizedName}`;
};

/**
 * Solicitar URL de carga (SAS URL)
 * Crea registro en estado 'pending' y retorna URL para subir
 * 
 * @param {Object} data - Datos de la solicitud
 * @param {string} data.organization_id - Public code de la organización
 * @param {string} data.original_name - Nombre original del archivo
 * @param {string} data.mime_type - Tipo MIME
 * @param {number} data.size_bytes - Tamaño en bytes
 * @param {string} data.category - Categoría del archivo
 * @param {string} [data.owner_type] - Tipo de propietario
 * @param {string} [data.owner_id] - ID del propietario
 * @param {Object} [data.metadata] - Metadatos adicionales
 * @param {string} userId - UUID del usuario que solicita
 * @param {string} ipAddress - IP del solicitante
 * @param {string} userAgent - User agent del solicitante
 * @returns {Promise<Object>} - DTO con URL de carga y datos del archivo
 */
export const requestUploadUrl = async (data, userId, ipAddress, userAgent) => {
    logger.info({ data, userId }, 'Solicitando URL de carga');

    // Buscar organización por public_code
    const organization = await orgRepository.findOrganizationByPublicCodeInternal(data.organization_id);
    if (!organization) {
        throw new Error('Organización no encontrada');
    }

    // Extraer extensión y sanitizar nombre
    const extension = getExtension(data.original_name);
    const sanitizedName = sanitizeFileName(data.original_name);

    // Validar archivo según categoría
    validateFileForCategory(data.category, data.mime_type, data.size_bytes, extension);

    // Generar ruta del blob
    const blobPath = generateBlobPath(organization.public_code, data.category, sanitizedName);

    // Calcular fecha de expiración (15 minutos)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Crear registro en estado pending
    const file = await repository.createFileUpload({
        organization_id: organization.id,
        blob_path: blobPath,
        original_name: data.original_name,
        file_name: sanitizedName,
        mime_type: data.mime_type,
        extension,
        size_bytes: data.size_bytes,
        category: data.category,
        owner_type: data.owner_type,
        owner_id: data.owner_id,
        uploaded_by: userId,
        expires_at: expiresAt,
        metadata: data.metadata
    });

    // Auditoría
    await logAuditAction({
        entityType: 'file_upload',
        entityId: file.id,
        action: 'request_upload_url',
        performedBy: userId,
        changes: {
            created: {
                public_code: file.public_code,
                blob_path: blobPath,
                original_name: data.original_name,
                category: data.category,
                size_bytes: data.size_bytes
            }
        },
        ipAddress,
        userAgent
    });

    logger.info({ fileId: file.public_code, blobPath }, 'URL de carga solicitada exitosamente');

    // Obtener configuración de categoría para respuesta
    const categoryConfig = FILE_CATEGORY_CONFIG[data.category];

    // Retornar DTO con información para el BFF
    // NOTA: La URL real de Azure se generará cuando se integre Azure Blob Storage
    return toUploadUrlDto({
        public_code: file.public_code,
        upload_url: `[AZURE_SAS_URL_PLACEHOLDER]/${blobPath}`, // TODO: Generar SAS URL real
        blob_path: blobPath,
        expires_at: expiresAt,
        max_size_bytes: categoryConfig.maxSizeBytes,
        allowed_mime_types: categoryConfig.mimeTypes
    });
};

/**
 * Confirmar que el upload fue exitoso
 * Cambia estado de 'pending' a 'uploaded'
 * 
 * @param {string} publicCode - Public code del archivo
 * @param {Object} confirmData - Datos de confirmación
 * @param {string} [confirmData.checksum_sha256] - Checksum del archivo
 * @param {string} [confirmData.blob_url] - URL del archivo en Azure
 * @param {Object} [confirmData.metadata] - Metadatos adicionales
 * @param {string} userId - UUID del usuario
 * @param {string} ipAddress - IP del solicitante
 * @param {string} userAgent - User agent
 * @returns {Promise<Object>} - DTO del archivo confirmado
 */
export const confirmUpload = async (publicCode, confirmData, userId, ipAddress, userAgent) => {
    logger.info({ publicCode, userId }, 'Confirmando upload');

    // Buscar archivo
    const file = await repository.findByPublicCodeInternal(publicCode);
    if (!file) {
        throw new Error('Archivo no encontrado');
    }

    // Validar que esté en estado pending
    if (file.status !== 'pending') {
        throw new Error(`No se puede confirmar archivo en estado: ${file.status}`);
    }

    // Validar que no haya expirado
    if (file.expires_at && new Date(file.expires_at) < new Date()) {
        throw new Error('La URL de carga ha expirado');
    }

    // Generar URL del blob (temporal hasta integrar Azure)
    // TODO: Obtener URL real de Azure Blob Storage
    const blobUrl = `https://[AZURE_STORAGE_ACCOUNT].blob.core.windows.net/[CONTAINER]/${file.blob_path}`;

    // Actualizar archivo
    const updatedFile = await repository.confirmUpload(file.id, {
        blob_url: confirmData.blob_url || blobUrl,
        checksum_sha256: confirmData.checksum_sha256,
        metadata: confirmData.metadata
    });

    // Auditoría
    await logAuditAction({
        entityType: 'file_upload',
        entityId: file.id,
        action: 'confirm_upload',
        performedBy: userId,
        changes: {
            old: { status: 'pending' },
            new: { 
                status: 'uploaded',
                checksum_sha256: confirmData.checksum_sha256,
                uploaded_at: updatedFile.uploaded_at
            }
        },
        ipAddress,
        userAgent
    });

    logger.info({ fileId: publicCode }, 'Upload confirmado exitosamente');

    return toUploadConfirmDto(updatedFile);
};

/**
 * Obtener archivo por public_code
 * 
 * @param {string} publicCode - Public code del archivo
 * @returns {Promise<Object>} - DTO del archivo
 */
export const getFileByPublicCode = async (publicCode) => {
    const file = await repository.findByPublicCode(publicCode);
    
    if (!file) {
        throw new Error('Archivo no encontrado');
    }

    return toPublicFileDto(file);
};

/**
 * Listar archivos con filtros
 * 
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Object>} - Lista paginada de archivos
 */
export const listFiles = async (filters) => {
    // Si viene organization_id como public_code, convertir a UUID
    if (filters.organization_id) {
        const org = await orgRepository.findOrganizationByPublicCodeInternal(filters.organization_id);
        if (org) {
            filters.organization_id = org.id;
        } else {
            // Si no existe la org, retornar vacío
            return toPublicFileListDto({
                files: [],
                total: 0,
                limit: filters.limit || 20,
                offset: filters.offset || 0
            });
        }
    }

    const result = await repository.listFiles(filters);
    return toPublicFileListDto(result);
};

/**
 * Vincular archivo a una entidad
 * 
 * @param {string} publicCode - Public code del archivo
 * @param {string} ownerType - Tipo de entidad
 * @param {string} ownerId - Public code de la entidad
 * @param {string} userId - UUID del usuario
 * @param {string} ipAddress - IP
 * @param {string} userAgent - User agent
 * @returns {Promise<Object>} - DTO del archivo actualizado
 */
export const linkFile = async (publicCode, ownerType, ownerId, userId, ipAddress, userAgent) => {
    const file = await repository.findByPublicCodeInternal(publicCode);
    
    if (!file) {
        throw new Error('Archivo no encontrado');
    }

    // Validar que esté en estado uploaded
    if (file.status !== 'uploaded') {
        throw new Error(`No se puede vincular archivo en estado: ${file.status}`);
    }

    const oldOwner = { owner_type: file.owner_type, owner_id: file.owner_id };
    
    const updatedFile = await repository.linkToEntity(file.id, ownerType, ownerId);

    // Auditoría
    await logAuditAction({
        entityType: 'file_upload',
        entityId: file.id,
        action: 'link',
        performedBy: userId,
        changes: {
            old: oldOwner,
            new: { owner_type: ownerType, owner_id: ownerId, status: 'linked' }
        },
        ipAddress,
        userAgent
    });

    logger.info({ fileId: publicCode, ownerType, ownerId }, 'Archivo vinculado');

    return toPublicFileDto(updatedFile);
};

/**
 * Eliminar archivo (soft delete)
 * 
 * @param {string} publicCode - Public code del archivo
 * @param {string} userId - UUID del usuario
 * @param {string} ipAddress - IP
 * @param {string} userAgent - User agent
 * @returns {Promise<Object>} - Resultado de eliminación
 */
export const deleteFile = async (publicCode, userId, ipAddress, userAgent) => {
    const file = await repository.findByPublicCodeInternal(publicCode);
    
    if (!file) {
        throw new Error('Archivo no encontrado');
    }

    const oldData = {
        status: file.status,
        blob_path: file.blob_path,
        original_name: file.original_name
    };

    await repository.softDelete(file.id);

    // Auditoría
    await logAuditAction({
        entityType: 'file_upload',
        entityId: file.id,
        action: 'delete',
        performedBy: userId,
        changes: {
            old: oldData,
            new: { status: 'deleted', deleted_at: new Date() }
        },
        ipAddress,
        userAgent
    });

    logger.info({ fileId: publicCode }, 'Archivo eliminado');

    // TODO: Marcar blob para eliminación en Azure (job asíncrono)

    return {
        deleted: true,
        file_id: publicCode
    };
};

/**
 * Obtener estadísticas de almacenamiento
 * 
 * @param {string} orgPublicCode - Public code de la organización
 * @returns {Promise<Object>} - Estadísticas de almacenamiento
 */
export const getStorageStats = async (orgPublicCode) => {
    const org = await orgRepository.findOrganizationByPublicCodeInternal(orgPublicCode);
    
    if (!org) {
        throw new Error('Organización no encontrada');
    }

    const stats = await repository.getStorageStats(org.id);

    // Formatear bytes a formato legible
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
        organization_id: orgPublicCode,
        total_files: stats.total_files,
        total_bytes: stats.total_bytes,
        total_formatted: formatBytes(stats.total_bytes),
        by_category: Object.entries(stats.by_category).reduce((acc, [category, data]) => {
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
