// modules/files/routes.js
// Rutas HTTP para el módulo de files
import { Router } from 'express';
import * as fileServices from './services.js';
import * as fileRepository from './repository.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import { validateResourceOwnership } from '../../middleware/validateResourceOwnership.js';
import {
    requestUploadUrlSchema,
    confirmUploadSchema,
    getFileByIdSchema,
    listFilesSchema,
    deleteFileSchema,
    linkFileSchema
} from './dtos/index.js';

// Middleware de validación de ownership para Files
// Verifica que el recurso pertenece a una organización accesible por el usuario
const validateFileOwnership = validateResourceOwnership({
    findById: fileRepository.findById,
    findByPublicCode: fileRepository.findByPublicCodeInternal,
    resourceName: 'file',
    paramName: 'id',
    checkSoftDelete: true
});

const router = Router();


// 📄 Swagger: src/docs/swagger/files.yaml -> POST /upload-url
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


// 📄 Swagger: src/docs/swagger/files.yaml -> POST /:id/confirm
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


// 📄 Swagger: src/docs/swagger/files.yaml -> POST /:id/link
router.post('/:id/link', authenticate, validate(linkFileSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { ownerType, ownerId } = req.body;
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await fileServices.linkFile(id, ownerType, ownerId, userId, ipAddress, userAgent);

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


// 📄 Swagger: src/docs/swagger/files.yaml -> GET /
router.get('/', authenticate, enforceActiveOrganization, validate(listFilesSchema), async (req, res, next) => {
    try {
        // Usa la organización del contexto establecido por el middleware
        // Si showAll=true (God View), no filtra por organización
        const result = await fileServices.listFiles({
            ...req.query,
            organizationId: req.organizationContext.id,
            showAll: req.organizationContext.showAll || false
        });

        res.json({
            ok: true,
            data: result,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale,
                organizationFilter: req.organizationFilter
            }
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/files.yaml -> GET /:id
router.get('/:id', authenticate, validateFileOwnership, validate(getFileByIdSchema), async (req, res, next) => {
    try {
        // El middleware validateFileOwnership ya validó el acceso
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


// 📄 Swagger: src/docs/swagger/files.yaml -> DELETE /:id
router.delete('/:id', authenticate, requireRole(['system-admin']), validateFileOwnership, validate(deleteFileSchema), async (req, res, next) => {
    try {
        // El middleware validateFileOwnership ya validó el acceso y existencia
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


// 📄 Swagger: src/docs/swagger/files.yaml -> GET /stats/:organizationId
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
