// services/azureBlob.js
// Servicio centralizado para interactuar con Azure Blob Storage
// Maneja generación de SAS URLs y URLs públicas directas
import {
    BlobServiceClient,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
    SASProtocol
} from '@azure/storage-blob';
import { config } from '../config/env.js';
import pino from 'pino';

// Logger específico para el servicio Azure
const logger = pino({ name: 'azure-blob-service' });

/**
 * Parsear connection string de Azure para extraer account name y key
 * Formato: DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx;EndpointSuffix=core.windows.net
 * 
 * @param {string} connectionString - Connection string de Azure Storage
 * @returns {Object} - { accountName, accountKey, endpointSuffix }
 */
const parseConnectionString = (connectionString) => {
    const parts = connectionString.split(';');
    const parsed = {};

    parts.forEach(part => {
        const [key, ...valueParts] = part.split('=');
        const value = valueParts.join('='); // Manejar valores con '=' como el AccountKey
        parsed[key] = value;
    });

    return {
        accountName: parsed.AccountName,
        accountKey: parsed.AccountKey,
        endpointSuffix: parsed.EndpointSuffix || 'core.windows.net',
        protocol: parsed.DefaultEndpointsProtocol || 'https'
    };
};

// Variables del cliente (lazy initialization)
let blobServiceClient = null;
let sharedKeyCredential = null;
let azureConfig = null;

/**
 * Inicializar cliente de Azure Blob Storage
 * Usa lazy initialization para evitar errores si no hay connection string
 * 
 * @returns {Object} - { blobServiceClient, sharedKeyCredential, config }
 */
const initializeClient = () => {
    if (blobServiceClient && sharedKeyCredential) {
        return { blobServiceClient, sharedKeyCredential, config: azureConfig };
    }

    const connectionString = config.azure.connectionString;

    if (!connectionString) {
        throw new Error('AZURE_STORAGE_CONNECTION_STRING no está configurado');
    }

    // Parsear connection string
    azureConfig = parseConnectionString(connectionString);

    // Crear credenciales
    sharedKeyCredential = new StorageSharedKeyCredential(
        azureConfig.accountName,
        azureConfig.accountKey
    );

    // Crear cliente del servicio
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

    logger.info({ accountName: azureConfig.accountName }, 'Cliente Azure Blob Storage inicializado');

    return { blobServiceClient, sharedKeyCredential, config: azureConfig };
};

/**
 * Obtener URL base del storage account
 * 
 * @returns {string} - URL base (ej: https://ecblob.blob.core.windows.net)
 */
export const getStorageBaseUrl = () => {
    const { config: cfg } = initializeClient();
    return `${cfg.protocol}://${cfg.accountName}.blob.${cfg.endpointSuffix}`;
};

/**
 * Generar URL pública directa (sin SAS) para archivos en contenedor público
 * El contenedor debe tener configurado acceso anónimo en Azure Portal
 * 
 * @param {string} blobPath - Ruta del blob (ej: organization/ORG-XXX/logo.png)
 * @returns {string} - URL pública directa
 */
export const getPublicUrl = (blobPath) => {
    const baseUrl = getStorageBaseUrl();
    const containerName = config.azure.containerPublic;
    return `${baseUrl}/${containerName}/${blobPath}`;
};

/**
 * Generar SAS URL de carga (write) para archivos privados
 * Permite al cliente subir un archivo directamente a Azure
 * 
 * @param {string} blobPath - Ruta del blob (ej: site/SITE-XXX/documento.pdf)
 * @param {number} [expiryMinutes] - Minutos hasta expiración (default: config.azure.sasExpiryMinutes)
 * @returns {Object} - { sasUrl, expiresAt }
 */
export const generateUploadSasUrl = (blobPath, expiryMinutes = null) => {
    const { sharedKeyCredential, config: cfg } = initializeClient();
    const containerName = config.azure.containerPrivate;
    const expiry = expiryMinutes || config.azure.sasExpiryMinutes;

    // Calcular fechas
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiry * 60 * 1000);

    // Permisos de escritura para upload
    const permissions = BlobSASPermissions.parse('cw'); // create + write

    // Generar token SAS
    const sasToken = generateBlobSASQueryParameters({
        containerName,
        blobName: blobPath,
        permissions,
        startsOn,
        expiresOn,
        protocol: SASProtocol.Https
    }, sharedKeyCredential).toString();

    const baseUrl = getStorageBaseUrl();
    const sasUrl = `${baseUrl}/${containerName}/${blobPath}?${sasToken}`;

    logger.debug({ blobPath, expiresOn }, 'SAS URL de carga generada');

    return {
        sasUrl,
        expiresAt: expiresOn
    };
};

/**
 * Generar SAS URL de carga para archivos públicos
 * Después de subir, el archivo será accesible públicamente
 * 
 * @param {string} blobPath - Ruta del blob
 * @param {number} [expiryMinutes] - Minutos hasta expiración
 * @returns {Object} - { sasUrl, expiresAt, publicUrl }
 */
export const generatePublicUploadSasUrl = (blobPath, expiryMinutes = null) => {
    const { sharedKeyCredential, config: cfg } = initializeClient();
    const containerName = config.azure.containerPublic;
    const expiry = expiryMinutes || config.azure.sasExpiryMinutes;

    // Calcular fechas
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiry * 60 * 1000);

    // Permisos de escritura para upload
    const permissions = BlobSASPermissions.parse('cw'); // create + write

    // Generar token SAS
    const sasToken = generateBlobSASQueryParameters({
        containerName,
        blobName: blobPath,
        permissions,
        startsOn,
        expiresOn,
        protocol: SASProtocol.Https
    }, sharedKeyCredential).toString();

    const baseUrl = getStorageBaseUrl();
    const sasUrl = `${baseUrl}/${containerName}/${blobPath}?${sasToken}`;
    const publicUrl = `${baseUrl}/${containerName}/${blobPath}`;

    logger.debug({ blobPath, expiresOn }, 'SAS URL de carga pública generada');

    return {
        sasUrl,
        expiresAt: expiresOn,
        publicUrl // URL sin SAS para acceso después de subir
    };
};

/**
 * Generar SAS URL de lectura (read) para archivos privados
 * Permite al cliente descargar un archivo privado
 * 
 * @param {string} blobPath - Ruta del blob
 * @param {number} [expiryMinutes] - Minutos hasta expiración
 * @returns {Object} - { sasUrl, expiresAt }
 */
export const generateReadSasUrl = (blobPath, expiryMinutes = null) => {
    const { sharedKeyCredential, config: cfg } = initializeClient();
    const containerName = config.azure.containerPrivate;
    const expiry = expiryMinutes || config.azure.sasExpiryMinutes;

    // Calcular fechas
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiry * 60 * 1000);

    // Permisos de lectura
    const permissions = BlobSASPermissions.parse('r'); // read only

    // Generar token SAS
    const sasToken = generateBlobSASQueryParameters({
        containerName,
        blobName: blobPath,
        permissions,
        startsOn,
        expiresOn,
        protocol: SASProtocol.Https
    }, sharedKeyCredential).toString();

    const baseUrl = getStorageBaseUrl();
    const sasUrl = `${baseUrl}/${containerName}/${blobPath}?${sasToken}`;

    logger.debug({ blobPath, expiresOn }, 'SAS URL de lectura generada');

    return {
        sasUrl,
        expiresAt: expiresOn
    };
};

/**
 * Verificar si un blob existe en el storage
 * 
 * @param {string} blobPath - Ruta del blob
 * @param {boolean} isPublic - Si está en contenedor público
 * @returns {Promise<boolean>} - true si existe
 */
export const blobExists = async (blobPath, isPublic = false) => {
    const { blobServiceClient } = initializeClient();
    const containerName = isPublic ? config.azure.containerPublic : config.azure.containerPrivate;

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobPath);

    return await blobClient.exists();
};

/**
 * Eliminar un blob del storage
 * 
 * @param {string} blobPath - Ruta del blob
 * @param {boolean} isPublic - Si está en contenedor público
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
export const deleteBlob = async (blobPath, isPublic = false) => {
    const { blobServiceClient } = initializeClient();
    const containerName = isPublic ? config.azure.containerPublic : config.azure.containerPrivate;

    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobPath);

        await blobClient.deleteIfExists();

        logger.info({ blobPath, containerName }, 'Blob eliminado');
        return true;
    } catch (error) {
        logger.error({ error, blobPath }, 'Error al eliminar blob');
        return false;
    }
};

/**
 * Obtener propiedades de un blob
 * 
 * @param {string} blobPath - Ruta del blob
 * @param {boolean} isPublic - Si está en contenedor público
 * @returns {Promise<Object|null>} - Propiedades del blob o null si no existe
 */
export const getBlobProperties = async (blobPath, isPublic = false) => {
    const { blobServiceClient } = initializeClient();
    const containerName = isPublic ? config.azure.containerPublic : config.azure.containerPrivate;

    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobPath);

        const properties = await blobClient.getProperties();

        return {
            contentLength: properties.contentLength,
            contentType: properties.contentType,
            lastModified: properties.lastModified,
            etag: properties.etag,
            contentMD5: properties.contentMD5
        };
    } catch (error) {
        if (error.statusCode === 404) {
            return null;
        }
        throw error;
    }
};

/**
 * Verificar conexión con Azure Blob Storage
 * 
 * @returns {Promise<Object>} - { connected, accountName, containers }
 */
export const verifyConnection = async () => {
    try {
        const { blobServiceClient, config: cfg } = initializeClient();

        // Intentar listar contenedores (verificación de conexión)
        const containers = [];
        for await (const container of blobServiceClient.listContainers()) {
            containers.push(container.name);
        }

        logger.info({ accountName: cfg.accountName, containers }, 'Conexión Azure verificada');

        return {
            connected: true,
            accountName: cfg.accountName,
            containers
        };
    } catch (error) {
        logger.error({ error }, 'Error al verificar conexión Azure');
        return {
            connected: false,
            error: error.message
        };
    }
};

export default {
    getStorageBaseUrl,
    getPublicUrl,
    generateUploadSasUrl,
    generatePublicUploadSasUrl,
    generateReadSasUrl,
    blobExists,
    deleteBlob,
    getBlobProperties,
    verifyConnection
};
