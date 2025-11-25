// modules/files/helpers/serializers.js
// Serializadores para convertir modelos internos a DTOs públicos

/**
 * Convertir modelo FileUpload a DTO público
 * Expone public_code como 'id', oculta UUID interno
 * 
 * POLÍTICA DE SEGURIDAD:
 * - Nunca exponer el UUID interno en APIs públicas
 * - Siempre usar public_code como 'id' en respuestas
 * - UUIDs solo para operaciones internas de base de datos
 * 
 * @param {FileUpload} file - Modelo Sequelize FileUpload
 * @returns {Object} - DTO público para respuestas API
 */
export const toPublicFileDto = (file) => {
    if (!file) return null;
    
    const dto = {
        id: file.public_code, // CRÍTICO: exponer public_code como 'id'
        blob_url: file.blob_url,
        original_name: file.original_name,
        file_name: file.file_name,
        mime_type: file.mime_type,
        extension: file.extension,
        size_bytes: parseInt(file.size_bytes, 10), // BIGINT viene como string
        size_formatted: formatFileSize(parseInt(file.size_bytes, 10)),
        checksum_sha256: file.checksum_sha256,
        category: file.category,
        owner_type: file.owner_type,
        owner_id: file.owner_id,
        status: file.status,
        is_public: file.is_public,
        uploaded_at: file.uploaded_at,
        expires_at: file.expires_at,
        metadata: file.metadata || {},
        created_at: file.created_at,
        updated_at: file.updated_at
    };
    
    // Incluir organization si está presente
    if (file.organization) {
        dto.organization = {
            id: file.organization.public_code,
            slug: file.organization.slug,
            name: file.organization.name
        };
    }
    
    // Incluir uploader si está presente
    if (file.uploader) {
        dto.uploaded_by = {
            id: file.uploader.public_code || file.uploader.id,
            email: file.uploader.email,
            first_name: file.uploader.first_name,
            last_name: file.uploader.last_name
        };
    }
    
    return dto;
};

/**
 * Convertir array de files a DTOs públicos
 * 
 * @param {FileUpload[]} files - Array de modelos Sequelize FileUpload
 * @returns {Object[]} - Array de DTOs públicos
 */
export const toPublicFileDtoList = (files) => {
    if (!Array.isArray(files)) return [];
    return files.map(toPublicFileDto);
};

/**
 * DTO para respuesta de upload URL (SAS URL)
 * Contiene información necesaria para que el BFF suba el archivo
 * 
 * @param {Object} uploadData - Datos del upload
 * @returns {Object} - DTO para respuesta de upload URL
 */
export const toUploadUrlDto = (uploadData) => {
    const dto = {
        file_id: uploadData.public_code, // Public code del registro creado
        upload_url: uploadData.upload_url, // SAS URL para subir archivo
        blob_path: uploadData.blob_path, // Ruta donde se guardará
        expires_at: uploadData.expires_at, // Cuándo expira la SAS URL
        max_size_bytes: uploadData.max_size_bytes, // Tamaño máximo permitido
        allowed_mime_types: uploadData.allowed_mime_types, // Tipos MIME permitidos
        is_public: uploadData.is_public || false // Si el archivo es público
    };

    // Incluir URL pública solo si es archivo público
    if (uploadData.is_public && uploadData.public_url) {
        dto.public_url = uploadData.public_url;
    }

    return dto;
};

/**
 * DTO para respuesta de confirmación de upload
 * 
 * @param {FileUpload} file - Modelo Sequelize FileUpload actualizado
 * @returns {Object} - DTO para confirmación de upload
 */
export const toUploadConfirmDto = (file) => {
    return {
        id: file.public_code,
        blob_url: file.blob_url,
        original_name: file.original_name,
        file_name: file.file_name,
        mime_type: file.mime_type,
        extension: file.extension,
        size_bytes: parseInt(file.size_bytes, 10),
        size_formatted: formatFileSize(parseInt(file.size_bytes, 10)),
        checksum_sha256: file.checksum_sha256,
        category: file.category,
        status: file.status,
        uploaded_at: file.uploaded_at
    };
};

/**
 * Formatear tamaño de archivo a formato legible
 * 
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} - Tamaño formateado (ej: "2.5 MB")
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Serializar lista de archivos con paginación
 * 
 * @param {Object} result - Resultado de listFiles con files y total
 * @returns {Object} - Lista serializada con paginación
 */
export const toPublicFileListDto = (result) => {
    return {
        files: toPublicFileDtoList(result.files),
        pagination: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            has_more: result.total > result.offset + result.files.length
        }
    };
};
