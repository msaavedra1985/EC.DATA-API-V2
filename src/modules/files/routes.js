// modules/files/routes.js
// Rutas HTTP para el módulo de files
import { Router } from 'express';
import * as fileServices from './services.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
    requestUploadUrlSchema,
    confirmUploadSchema,
    getFileByIdSchema,
    listFilesSchema,
    deleteFileSchema,
    linkFileSchema
} from './dtos/index.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FileUpload:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Public code del archivo (FILE-XXXXX-X)
 *           example: "FILE-7K9D2-X"
 *         blob_url:
 *           type: string
 *           description: URL del archivo en Azure Blob Storage
 *           example: "https://storage.blob.core.windows.net/files/ORG-XXX/logos/abc123_logo.png"
 *         original_name:
 *           type: string
 *           description: Nombre original del archivo
 *           example: "mi-logo.png"
 *         file_name:
 *           type: string
 *           description: Nombre sanitizado del archivo
 *           example: "mi_logo.png"
 *         mime_type:
 *           type: string
 *           description: Tipo MIME del archivo
 *           example: "image/png"
 *         extension:
 *           type: string
 *           description: Extensión del archivo
 *           example: "png"
 *         size_bytes:
 *           type: integer
 *           description: Tamaño en bytes
 *           example: 245760
 *         size_formatted:
 *           type: string
 *           description: Tamaño formateado
 *           example: "240 KB"
 *         checksum_sha256:
 *           type: string
 *           description: Checksum SHA-256 del archivo
 *           example: "abc123def456..."
 *         category:
 *           type: string
 *           enum: [logo, image, document, firmware, backup, export, import, attachment, other]
 *           description: Categoría del archivo
 *           example: "logo"
 *         owner_type:
 *           type: string
 *           description: Tipo de entidad propietaria
 *           example: "organization"
 *         owner_id:
 *           type: string
 *           description: Public code de la entidad propietaria
 *           example: "ORG-7K9D2-X"
 *         status:
 *           type: string
 *           enum: [pending, uploaded, linked, deleted]
 *           description: Estado del archivo
 *           example: "uploaded"
 *         is_public:
 *           type: boolean
 *           description: Si el archivo es accesible públicamente
 *           example: false
 *         uploaded_at:
 *           type: string
 *           format: date-time
 *           description: Fecha de upload completado
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     UploadUrlResponse:
 *       type: object
 *       properties:
 *         file_id:
 *           type: string
 *           description: Public code del registro creado
 *           example: "FILE-7K9D2-X"
 *         upload_url:
 *           type: string
 *           description: URL pre-firmada (SAS) para subir el archivo
 *           example: "https://storage.blob.core.windows.net/files/...?sv=2020-08-04&sig=..."
 *         blob_path:
 *           type: string
 *           description: Ruta donde se guardará el archivo
 *           example: "ORG-7K9D2-X/logos/abc123_logo.png"
 *         expires_at:
 *           type: string
 *           format: date-time
 *           description: Cuándo expira la URL de carga
 *         max_size_bytes:
 *           type: integer
 *           description: Tamaño máximo permitido para esta categoría
 *           example: 5242880
 *         allowed_mime_types:
 *           type: array
 *           items:
 *             type: string
 *           description: Tipos MIME permitidos
 *           example: ["image/png", "image/jpeg"]
 */

/**
 * @swagger
 * /api/v1/files/upload-url:
 *   post:
 *     summary: Solicitar URL de carga (SAS URL)
 *     description: |
 *       Genera una URL pre-firmada (SAS) para que el BFF suba un archivo a Azure Blob Storage.
 *       El archivo queda en estado 'pending' hasta que se confirme el upload.
 *       
 *       **Flujo:**
 *       1. BFF solicita URL de carga con metadata del archivo
 *       2. API valida y genera registro en estado 'pending'
 *       3. API retorna SAS URL con TTL de 15 minutos
 *       4. BFF sube archivo directamente a Azure
 *       5. BFF confirma upload exitoso en /files/{id}/confirm
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization_id
 *               - original_name
 *               - mime_type
 *               - size_bytes
 *               - category
 *             properties:
 *               organization_id:
 *                 type: string
 *                 description: Public code de la organización
 *                 example: "ORG-7K9D2-X"
 *               original_name:
 *                 type: string
 *                 description: Nombre original del archivo
 *                 example: "mi-logo.png"
 *               mime_type:
 *                 type: string
 *                 description: Tipo MIME del archivo
 *                 example: "image/png"
 *               size_bytes:
 *                 type: integer
 *                 description: Tamaño del archivo en bytes
 *                 example: 245760
 *               category:
 *                 type: string
 *                 enum: [logo, image, document, firmware, backup, export, import, attachment, other]
 *                 description: Categoría del archivo
 *                 example: "logo"
 *               owner_type:
 *                 type: string
 *                 description: Tipo de entidad propietaria (opcional)
 *                 example: "organization"
 *               owner_id:
 *                 type: string
 *                 description: Public code de la entidad propietaria (opcional)
 *                 example: "ORG-7K9D2-X"
 *               metadata:
 *                 type: object
 *                 description: Metadatos adicionales
 *     responses:
 *       201:
 *         description: URL de carga generada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UploadUrlResponse'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Error de validación - Tipo MIME o tamaño no permitido
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Organización no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.post('/upload-url', authenticate, validate(requestUploadUrlSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await fileServices.requestUploadUrl(req.body, userId, ipAddress, userAgent);

        res.status(201).json({
            ok: true,
            data: result,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/files/{id}/confirm:
 *   post:
 *     summary: Confirmar upload completado
 *     description: |
 *       El BFF llama a este endpoint después de subir el archivo exitosamente a Azure.
 *       Cambia el estado del archivo de 'pending' a 'uploaded'.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code del archivo (FILE-XXXXX-X)
 *         schema:
 *           type: string
 *           example: "FILE-7K9D2-X"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               checksum_sha256:
 *                 type: string
 *                 description: Checksum SHA-256 del archivo subido (64 caracteres)
 *                 example: "abc123def456789..."
 *               metadata:
 *                 type: object
 *                 description: Metadatos adicionales (ej. dimensiones de imagen)
 *     responses:
 *       200:
 *         description: Upload confirmado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "FILE-7K9D2-X"
 *                     blob_url:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "uploaded"
 *                     uploaded_at:
 *                       type: string
 *                       format: date-time
 *                 meta:
 *                   type: object
 *       400:
 *         description: Archivo no está en estado 'pending' o URL expirada
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Archivo no encontrado
 */
router.post('/:id/confirm', authenticate, validate(confirmUploadSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await fileServices.confirmUpload(id, req.body, userId, ipAddress, userAgent);

        res.json({
            ok: true,
            data: result,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/files/{id}/link:
 *   post:
 *     summary: Vincular archivo a una entidad
 *     description: |
 *       Vincula un archivo subido a una entidad específica (organization, site, device, etc.).
 *       Cambia el estado de 'uploaded' a 'linked'.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code del archivo
 *         schema:
 *           type: string
 *           example: "FILE-7K9D2-X"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - owner_type
 *               - owner_id
 *             properties:
 *               owner_type:
 *                 type: string
 *                 description: Tipo de entidad (organization, site, device, etc.)
 *                 example: "organization"
 *               owner_id:
 *                 type: string
 *                 description: Public code de la entidad
 *                 example: "ORG-7K9D2-X"
 *     responses:
 *       200:
 *         description: Archivo vinculado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/FileUpload'
 *       400:
 *         description: Archivo no está en estado 'uploaded'
 *       404:
 *         description: Archivo no encontrado
 */
router.post('/:id/link', authenticate, validate(linkFileSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { owner_type, owner_id } = req.body;
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await fileServices.linkFile(id, owner_type, owner_id, userId, ipAddress, userAgent);

        res.json({
            ok: true,
            data: result,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/files:
 *   get:
 *     summary: Listar archivos con filtros
 *     description: |
 *       Obtiene lista paginada de archivos con filtros opcionales.
 *       Por defecto excluye archivos en estado 'deleted'.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *         description: Filtrar por organización (public code)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [logo, image, document, firmware, backup, export, import, attachment, other]
 *         description: Filtrar por categoría
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, uploaded, linked, deleted]
 *         description: Filtrar por estado
 *       - in: query
 *         name: owner_type
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de propietario
 *       - in: query
 *         name: owner_id
 *         schema:
 *           type: string
 *         description: Filtrar por ID de propietario
 *       - in: query
 *         name: mime_type
 *         schema:
 *           type: string
 *         description: Filtrar por tipo MIME (búsqueda parcial)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en nombre de archivo
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Límite de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset para paginación
 *     responses:
 *       200:
 *         description: Lista de archivos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     files:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FileUpload'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         has_more:
 *                           type: boolean
 *       401:
 *         description: No autenticado
 */
router.get('/', authenticate, validate(listFilesSchema), async (req, res, next) => {
    try {
        const result = await fileServices.listFiles(req.query);

        res.json({
            ok: true,
            data: result,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/files/{id}:
 *   get:
 *     summary: Obtener archivo por ID
 *     description: Obtiene los detalles de un archivo específico por su public code.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code del archivo (FILE-XXXXX-X)
 *         schema:
 *           type: string
 *           example: "FILE-7K9D2-X"
 *     responses:
 *       200:
 *         description: Archivo obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/FileUpload'
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Archivo no encontrado
 */
router.get('/:id', authenticate, validate(getFileByIdSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await fileServices.getFileByPublicCode(id);

        res.json({
            ok: true,
            data: result,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/files/{id}:
 *   delete:
 *     summary: Eliminar archivo (soft delete)
 *     description: |
 *       Marca un archivo como eliminado (soft delete).
 *       El archivo no se borra inmediatamente de Azure, se procesa en background.
 *       Requiere rol system-admin.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Public code del archivo (FILE-XXXXX-X)
 *         schema:
 *           type: string
 *           example: "FILE-7K9D2-X"
 *     responses:
 *       200:
 *         description: Archivo eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted:
 *                       type: boolean
 *                       example: true
 *                     file_id:
 *                       type: string
 *                       example: "FILE-7K9D2-X"
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos (requiere system-admin)
 *       404:
 *         description: Archivo no encontrado
 */
router.delete('/:id', authenticate, requireRole(['system-admin']), validate(deleteFileSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await fileServices.deleteFile(id, userId, ipAddress, userAgent);

        res.json({
            ok: true,
            data: result,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/files/stats/{organizationId}:
 *   get:
 *     summary: Obtener estadísticas de almacenamiento
 *     description: |
 *       Obtiene estadísticas de uso de almacenamiento para una organización.
 *       Incluye total de archivos, bytes, y desglose por categoría.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         description: Public code de la organización
 *         schema:
 *           type: string
 *           example: "ORG-7K9D2-X"
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     organization_id:
 *                       type: string
 *                       example: "ORG-7K9D2-X"
 *                     total_files:
 *                       type: integer
 *                       example: 45
 *                     total_bytes:
 *                       type: integer
 *                       example: 157286400
 *                     total_formatted:
 *                       type: string
 *                       example: "150 MB"
 *                     by_category:
 *                       type: object
 *                       example:
 *                         logo:
 *                           count: 5
 *                           bytes: 2621440
 *                           formatted: "2.5 MB"
 *                         document:
 *                           count: 40
 *                           bytes: 154664960
 *                           formatted: "147.5 MB"
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Organización no encontrada
 */
router.get('/stats/:organizationId', authenticate, async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const result = await fileServices.getStorageStats(organizationId);

        res.json({
            ok: true,
            data: result,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
