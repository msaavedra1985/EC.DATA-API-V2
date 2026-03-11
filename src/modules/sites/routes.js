// modules/sites/routes.js
// Rutas REST para el módulo de Sites (Locaciones Físicas)

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import { validateResourceOwnership } from '../../middleware/validateResourceOwnership.js';
import * as siteServices from './services.js';
import * as siteRepository from './repository.js';
import {
    createSiteSchema,
    updateSiteSchema,
    listSitesSchema,
    getSiteSchema,
    deleteSiteSchema
} from './dtos/index.js';
import logger from '../../utils/logger.js';

// Middleware de validación de ownership para Sites
// Verifica que el recurso pertenece a una organización accesible por el usuario
const validateSiteOwnership = validateResourceOwnership({
    findById: siteRepository.findSiteById,
    findByPublicCode: siteRepository.findSiteByPublicCodeInternal,
    resourceName: 'site',
    paramName: 'id',
    checkSoftDelete: true
});

const router = express.Router();
const siteLogger = logger.child({ component: 'sites' });


// 📄 Swagger: src/docs/swagger/sites.yaml -> POST /
router.post('/', authenticate, requireRole(['system-admin', 'org-admin']), enforceActiveOrganization, validate(createSiteSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const orgContext = req.organizationContext;
        
        const site = await siteServices.createSite(req.body, userId, ipAddress, userAgent, orgContext);
        
        res.status(201).json({
            ok: true,
            data: site,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/sites.yaml -> GET /
router.get('/', authenticate, enforceActiveOrganization, validate(listSitesSchema), async (req, res, next) => {
    try {
        // Usa la organización del contexto establecido por el middleware
        // Si showAll=true (God View), no filtra por organización
        const result = await siteServices.listSites({
            ...req.query,
            organizationId: req.organizationContext.id,
            showAll: req.organizationContext.showAll || false
        });
        
        // Respuesta con estructura estándar: data[] + meta{}
        res.json({
            ok: true,
            data: result.items,
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                timestamp: new Date().toISOString(),
                locale: req.locale,
                organizationFilter: req.organizationFilter
            }
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/sites.yaml -> GET /:id
router.get('/:id', authenticate, validateSiteOwnership, validate(getSiteSchema), async (req, res, next) => {
    try {
        // El middleware validateSiteOwnership ya validó el acceso
        // Usamos el servicio para obtener el DTO público completo con relaciones
        const site = await siteServices.getSiteByPublicCode(req.params.id);
        
        res.json({
            ok: true,
            data: site,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/sites.yaml -> PUT /:id
router.put('/:id', authenticate, requireRole(['system-admin', 'org-admin']), validateSiteOwnership, validate(updateSiteSchema), async (req, res, next) => {
    try {
        // El middleware validateSiteOwnership ya validó el acceso
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const site = await siteServices.updateSite(req.params.id, req.body, userId, ipAddress, userAgent);
        
        res.json({
            ok: true,
            data: site,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/sites.yaml -> DELETE /:id
router.delete('/:id', authenticate, requireRole(['system-admin']), validateSiteOwnership, validate(deleteSiteSchema), async (req, res, next) => {
    try {
        // El middleware validateSiteOwnership ya validó el acceso y existencia
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const deleted = await siteServices.deleteSite(req.params.id, userId, ipAddress, userAgent);
        
        if (!deleted) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'SITE_NOT_FOUND',
                    message: 'Site no encontrado'
                }
            });
        }
        
        res.json({
            ok: true,
            data: {
                message: 'Site eliminado exitosamente'
            },
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
