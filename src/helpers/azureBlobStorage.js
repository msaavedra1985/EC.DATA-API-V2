// helpers/azureBlobStorage.js
// Helper para Azure Blob Storage - Generación de Presigned URLs

import { BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential, BlobSASPermissions } from '@azure/storage-blob';
import { config } from '../config/env.js';
import { apiLogger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Cliente de Azure Blob Storage
 * Configurado con las credenciales de las variables de entorno
 */
let blobServiceClient = null;
let sharedKeyCredential = null;

/**
 * Inicializa el cliente de Azure Blob Storage
 * @returns {BlobServiceClient}
 */
const initializeBlobClient = () => {
    if (blobServiceClient) {
        return blobServiceClient;
    }

    try {
        const accountName = config.azure?.storageAccountName;
        const accountKey = config.azure?.storageAccountKey;

        if (!accountName || !accountKey) {
            throw new Error('Azure Blob Storage credentials not configured. Set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY');
        }

        // Crear credenciales compartidas
        sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

        // Crear cliente del servicio
        blobServiceClient = new BlobServiceClient(
            `https://${accountName}.blob.core.windows.net`,
            sharedKeyCredential
        );

        apiLogger.info('✅ Azure Blob Storage client initialized');
        return blobServiceClient;
    } catch (error) {
        apiLogger.error({ err: error }, '❌ Error initializing Azure Blob Storage client');
        throw error;
    }
};

/**
 * Genera un nombre único para el archivo
 * Formato: {prefix}-{timestamp}-{random}.{extension}
 * 
 * @param {string} originalFilename - Nombre original del archivo
 * @param {string} prefix - Prefijo para el nombre (ej: 'org-logo', 'user-avatar')
 * @returns {string} Nombre único del archivo
 * 
 * @example
 * generateUniqueFilename('logo.png', 'org-logo')
 * // => 'org-logo-1704817200000-a1b2c3d4.png'
 */
export const generateUniqueFilename = (originalFilename, prefix = 'file') => {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString('hex');
    const extension = originalFilename.split('.').pop().toLowerCase();
    
    // Sanitizar el prefix (solo alfanuméricos y guiones)
    const sanitizedPrefix = prefix.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    
    return `${sanitizedPrefix}-${timestamp}-${randomString}.${extension}`;
};

/**
 * Genera una Presigned URL para upload directo a Azure Blob Storage
 * 
 * @param {Object} options - Opciones de generación
 * @param {string} options.filename - Nombre del archivo original
 * @param {string} options.contentType - MIME type del archivo (ej: 'image/png')
 * @param {string} options.containerName - Nombre del container (default: env.AZURE_STORAGE_CONTAINER_NAME)
 * @param {string} options.prefix - Prefijo para el nombre del archivo (default: 'file')
 * @param {number} options.expiryMinutes - Minutos de validez de la URL (default: 60)
 * @returns {Promise<{uploadUrl: string, publicUrl: string, blobName: string, expiresAt: Date}>}
 * 
 * @example
 * const result = await generatePresignedUploadUrl({
 *   filename: 'logo.png',
 *   contentType: 'image/png',
 *   prefix: 'org-logo',
 *   expiryMinutes: 60
 * });
 * 
 * // Frontend usa uploadUrl para subir el archivo
 * // Backend guarda publicUrl en la base de datos
 */
export const generatePresignedUploadUrl = async ({
    filename,
    contentType,
    containerName = config.azure?.storageContainerName || 'uploads',
    prefix = 'file',
    expiryMinutes = 60
}) => {
    try {
        // Validaciones
        if (!filename) {
            throw new Error('filename is required');
        }
        
        if (!contentType) {
            throw new Error('contentType is required');
        }

        // Inicializar cliente si no está inicializado
        const client = initializeBlobClient();
        
        // Generar nombre único para el blob
        const blobName = generateUniqueFilename(filename, prefix);
        
        // Obtener referencia al container
        const containerClient = client.getContainerClient(containerName);
        
        // Obtener referencia al blob
        const blobClient = containerClient.getBlobClient(blobName);
        
        // Crear SAS token para upload
        const expiresOn = new Date(Date.now() + expiryMinutes * 60 * 1000);
        
        const sasPermissions = new BlobSASPermissions();
        sasPermissions.write = true; // Permitir escritura
        sasPermissions.create = true; // Permitir creación
        
        const sasToken = generateBlobSASQueryParameters(
            {
                containerName,
                blobName,
                permissions: sasPermissions,
                expiresOn,
                contentType // Forzar content-type en upload
            },
            sharedKeyCredential
        ).toString();
        
        // URL para upload (con SAS token)
        const uploadUrl = `${blobClient.url}?${sasToken}`;
        
        // URL pública (sin SAS token - el container debe ser público para lectura)
        const publicUrl = blobClient.url;
        
        apiLogger.info({
            msg: 'Presigned URL generated',
            blobName,
            containerName,
            expiresAt: expiresOn.toISOString()
        });
        
        return {
            uploadUrl,
            publicUrl,
            blobName,
            expiresAt: expiresOn
        };
    } catch (error) {
        apiLogger.error({ err: error }, 'Error generating presigned URL');
        throw error;
    }
};

/**
 * Elimina un blob del storage
 * 
 * @param {string} blobName - Nombre del blob a eliminar
 * @param {string} containerName - Nombre del container
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
export const deleteBlob = async (blobName, containerName = config.azure?.storageContainerName || 'uploads') => {
    try {
        const client = initializeBlobClient();
        const containerClient = client.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);
        
        await blobClient.deleteIfExists();
        
        apiLogger.info({
            msg: 'Blob deleted',
            blobName,
            containerName
        });
        
        return true;
    } catch (error) {
        apiLogger.error({ err: error, blobName }, 'Error deleting blob');
        throw error;
    }
};

/**
 * Extrae el nombre del blob de una URL pública de Azure
 * 
 * @param {string} url - URL del blob
 * @returns {string|null} Nombre del blob o null si no es válida
 * 
 * @example
 * extractBlobNameFromUrl('https://account.blob.core.windows.net/container/file.png')
 * // => 'file.png'
 */
export const extractBlobNameFromUrl = (url) => {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        // Formato: /container-name/blob-name
        return pathParts.length >= 2 ? pathParts.slice(2).join('/') : null;
    } catch (error) {
        apiLogger.warn({ url }, 'Invalid Azure Blob URL');
        return null;
    }
};

/**
 * Valida el tipo de contenido para uploads de imágenes
 * 
 * @param {string} contentType - MIME type a validar
 * @returns {boolean} true si es un tipo permitido
 */
export const isValidImageContentType = (contentType) => {
    const allowedTypes = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/svg+xml'
    ];
    
    return allowedTypes.includes(contentType.toLowerCase());
};

/**
 * Valida el tamaño máximo del archivo (en bytes)
 * 
 * @param {number} fileSize - Tamaño del archivo en bytes
 * @param {number} maxSizeMB - Tamaño máximo permitido en MB (default: 5)
 * @returns {boolean} true si el tamaño es válido
 */
export const isValidFileSize = (fileSize, maxSizeMB = 5) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return fileSize <= maxSizeBytes;
};

export default {
    generatePresignedUploadUrl,
    generateUniqueFilename,
    deleteBlob,
    extractBlobNameFromUrl,
    isValidImageContentType,
    isValidFileSize
};
