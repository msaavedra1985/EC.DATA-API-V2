// modules/files/dtos/index.js
// Esquemas de validación Zod para el módulo de files
import { z } from 'zod';

/**
 * Categorías permitidas para archivos
 */
export const FILE_CATEGORIES = [
    'logo',
    'image', 
    'document',
    'firmware',
    'backup',
    'export',
    'import',
    'attachment',
    'other'
];

/**
 * Estados de archivo permitidos
 */
export const FILE_STATUSES = ['pending', 'uploaded', 'linked', 'deleted'];

/**
 * Configuración de archivos permitidos por categoría
 * Define tipos MIME, extensiones y tamaños máximos para cada categoría
 */
export const FILE_CATEGORY_CONFIG = {
    logo: {
        mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
        extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
        maxSizeBytes: 5 * 1024 * 1024, // 5 MB
        description: 'Logos e iconos de organizaciones'
    },
    image: {
        mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'],
        extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'],
        maxSizeBytes: 10 * 1024 * 1024, // 10 MB
        description: 'Imágenes generales'
    },
    document: {
        mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv'
        ],
        extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
        maxSizeBytes: 50 * 1024 * 1024, // 50 MB
        description: 'Documentos de oficina y PDFs'
    },
    firmware: {
        mimeTypes: ['application/octet-stream', 'application/zip', 'application/x-tar', 'application/gzip'],
        extensions: ['bin', 'hex', 'zip', 'tar', 'gz', 'tgz'],
        maxSizeBytes: 100 * 1024 * 1024, // 100 MB
        description: 'Archivos de firmware para dispositivos'
    },
    backup: {
        mimeTypes: ['application/zip', 'application/x-tar', 'application/gzip', 'application/x-7z-compressed'],
        extensions: ['zip', 'tar', 'gz', 'tgz', '7z', 'bak'],
        maxSizeBytes: 500 * 1024 * 1024, // 500 MB
        description: 'Archivos de backup'
    },
    export: {
        mimeTypes: [
            'application/json',
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip'
        ],
        extensions: ['json', 'csv', 'xls', 'xlsx', 'zip'],
        maxSizeBytes: 100 * 1024 * 1024, // 100 MB
        description: 'Archivos de exportación de datos'
    },
    import: {
        mimeTypes: [
            'application/json',
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        extensions: ['json', 'csv', 'xls', 'xlsx'],
        maxSizeBytes: 50 * 1024 * 1024, // 50 MB
        description: 'Archivos para importación de datos'
    },
    attachment: {
        mimeTypes: [
            'image/png', 'image/jpeg', 'image/webp', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'application/zip'
        ],
        extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip'],
        maxSizeBytes: 25 * 1024 * 1024, // 25 MB
        description: 'Archivos adjuntos generales'
    },
    other: {
        mimeTypes: ['application/octet-stream'],
        extensions: ['*'],
        maxSizeBytes: 50 * 1024 * 1024, // 50 MB
        description: 'Otros tipos de archivos'
    }
};

/**
 * Schema para solicitar URL de carga (upload-url)
 */
export const requestUploadUrlSchema = z.object({
    body: z.object({
        organization_id: z.string()
            .min(1, 'organization_id es requerido')
            .describe('Public code de la organización'),
        original_name: z.string()
            .min(1, 'original_name es requerido')
            .max(255, 'Nombre de archivo muy largo (máx 255 caracteres)')
            .describe('Nombre original del archivo'),
        mime_type: z.string()
            .min(1, 'mime_type es requerido')
            .describe('Tipo MIME del archivo'),
        size_bytes: z.number()
            .int()
            .positive('size_bytes debe ser positivo')
            .describe('Tamaño del archivo en bytes'),
        category: z.enum(FILE_CATEGORIES)
            .default('other')
            .describe('Categoría del archivo'),
        owner_type: z.string()
            .max(50)
            .optional()
            .describe('Tipo de entidad propietaria (site, device, user, etc.)'),
        owner_id: z.string()
            .max(50)
            .optional()
            .describe('Public code de la entidad propietaria'),
        is_public: z.boolean()
            .optional()
            .default(false)
            .describe('Si true, el archivo se guarda en contenedor público (acceso directo sin SAS)'),
        metadata: z.record(z.any())
            .optional()
            .describe('Metadatos adicionales')
    })
});

/**
 * Schema para confirmar upload completado
 */
export const confirmUploadSchema = z.object({
    body: z.object({
        checksum_sha256: z.string()
            .length(64, 'checksum_sha256 debe tener 64 caracteres')
            .optional()
            .describe('Checksum SHA-256 del archivo subido'),
        metadata: z.record(z.any())
            .optional()
            .describe('Metadatos adicionales del archivo')
    }),
    params: z.object({
        id: z.string()
            .min(1, 'id es requerido')
            .describe('Public code del archivo (FILE-XXXXX-X)')
    })
});

/**
 * Schema para obtener archivo por ID
 */
export const getFileByIdSchema = z.object({
    params: z.object({
        id: z.string()
            .min(1, 'id es requerido')
            .describe('Public code del archivo (FILE-XXXXX-X)')
    })
});

/**
 * Schema para listar archivos con filtros
 * 
 * Comportamiento del filtro por organización:
 * - Sin filtro: Usa la organización activa del usuario (del JWT)
 * - Con organization_id: Filtra por esa organización (si tiene acceso)
 * - Con all=true: Solo admins, muestra todos los archivos accesibles (org-admins limitados a su scope)
 * - organization_ids: Array interno usado por el middleware (no expuesto a clientes)
 */
export const listFilesSchema = z.object({
    query: z.object({
        organization_id: z.string()
            .optional()
            .describe('Filtrar por organización'),
        organization_ids: z
            .array(z.string())
            .optional()
            .describe('INTERNO: Array de UUIDs de organizaciones (inyectado por middleware)'),
        all: z.string()
            .optional()
            .describe('Solo admins: si es "true", muestra todos los archivos sin filtrar por organización'),
        category: z.enum(FILE_CATEGORIES)
            .optional()
            .describe('Filtrar por categoría'),
        status: z.enum(FILE_STATUSES)
            .optional()
            .describe('Filtrar por estado'),
        owner_type: z.string()
            .optional()
            .describe('Filtrar por tipo de propietario'),
        owner_id: z.string()
            .optional()
            .describe('Filtrar por ID de propietario'),
        mime_type: z.string()
            .optional()
            .describe('Filtrar por tipo MIME'),
        search: z.string()
            .optional()
            .describe('Búsqueda en nombre de archivo'),
        page: z
            .string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => !isNaN(val) && val >= 1, {
                message: 'page debe ser un entero mayor o igual a 1'
            })
            .optional(),
        limit: z.string()
            .transform(val => parseInt(val, 10))
            .pipe(z.number().int().min(1).max(100).default(20))
            .optional()
            .describe('Límite de resultados (máx 100)'),
        offset: z.string()
            .transform(val => parseInt(val, 10))
            .pipe(z.number().int().min(0).default(0))
            .optional()
            .describe('Offset para paginación')
    }).transform((data) => {
        if (data.page !== undefined && data.page >= 1) {
            const limit = data.limit || 20;
            return { ...data, offset: (data.page - 1) * limit };
        }
        return data;
    })
});

/**
 * Schema para eliminar archivo
 */
export const deleteFileSchema = z.object({
    params: z.object({
        id: z.string()
            .min(1, 'id es requerido')
            .describe('Public code del archivo (FILE-XXXXX-X)')
    })
});

/**
 * Schema para vincular archivo a una entidad
 */
export const linkFileSchema = z.object({
    body: z.object({
        owner_type: z.string()
            .min(1, 'owner_type es requerido')
            .max(50)
            .describe('Tipo de entidad propietaria'),
        owner_id: z.string()
            .min(1, 'owner_id es requerido')
            .max(50)
            .describe('Public code de la entidad propietaria')
    }),
    params: z.object({
        id: z.string()
            .min(1, 'id es requerido')
            .describe('Public code del archivo (FILE-XXXXX-X)')
    })
});
