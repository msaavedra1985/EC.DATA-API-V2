// modules/devices/routes.js
// Rutas REST para el módulo de Devices (Dispositivos IoT/Edge)

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import { validateResourceOwnership } from '../../middleware/validateResourceOwnership.js';
import * as deviceServices from './services.js';
import * as deviceRepository from './repository.js';
import {
    createDeviceSchema,
    updateDeviceSchema,
    getDevicesSchema,
    getDeviceByIdSchema,
    deleteDeviceSchema
} from './dtos/index.js';
import logger from '../../utils/logger.js';
import deviceMetadataRoutes from '../device-metadata/routes.js';

// Middleware de validación de ownership para Devices
// Verifica que el recurso pertenece a una organización accesible por el usuario
const validateDeviceOwnership = validateResourceOwnership({
    findById: deviceRepository.findDeviceById,
    findByPublicCode: deviceRepository.findDeviceByPublicCodeInternal,
    resourceName: 'device',
    paramName: 'id',
    checkSoftDelete: true
});

const router = express.Router();
const deviceLogger = logger.child({ component: 'devices' });


// 📄 Swagger: src/docs/swagger/devices.yaml -> POST /
router.post('/', authenticate, requireRole(['system-admin', 'org-admin']), enforceActiveOrganization, validate(createDeviceSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const orgContext = req.organizationContext;
        
        const device = await deviceServices.createDevice(req.body, userId, ipAddress, userAgent, orgContext);
        
        res.status(201).json({
            ok: true,
            data: device,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/devices.yaml -> GET /
router.get('/', authenticate, enforceActiveOrganization, validate(getDevicesSchema), async (req, res, next) => {
    try {
        // Usa la organización del contexto establecido por el middleware
        // Si showAll=true (God View), no filtra por organización
        const result = await deviceServices.listDevices({
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


// Rutas de device metadata (catálogos para formularios)
// IMPORTANTE: Debe estar ANTES de las rutas con :id para evitar que "metadata" sea capturado como ID
// 📄 Swagger: src/docs/swagger/devices.yaml -> USE /
router.use('/', deviceMetadataRoutes);

// 📄 Swagger: src/docs/swagger/devices.yaml -> GET /:id
router.get('/:id', authenticate, validateDeviceOwnership, validate(getDeviceByIdSchema), async (req, res, next) => {
    try {
        // El middleware validateDeviceOwnership ya validó el acceso
        const device = await deviceServices.getDeviceByPublicCode(req.params.id);
        
        res.json({
            ok: true,
            data: device,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/devices.yaml -> PUT /:id
router.put('/:id', authenticate, requireRole(['system-admin', 'org-admin']), validateDeviceOwnership, validate(updateDeviceSchema), async (req, res, next) => {
    try {
        // El middleware validateDeviceOwnership ya validó el acceso
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const device = await deviceServices.updateDevice(req.params.id, req.body, userId, ipAddress, userAgent);
        
        res.json({
            ok: true,
            data: device,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/devices.yaml -> DELETE /:id
router.delete('/:id', authenticate, requireRole(['system-admin']), validateDeviceOwnership, validate(deleteDeviceSchema), async (req, res, next) => {
    try {
        // El middleware validateDeviceOwnership ya validó el acceso y existencia
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const result = await deviceServices.deleteDevice(req.params.id, userId, ipAddress, userAgent);
        
        // Respuesta canónica con envelope estándar
        res.json({
            ok: true,
            data: result, // { device, cascade, deletionStatus }
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale,
                action: 'delete'
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
