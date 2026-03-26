// modules/channels/routes.js
// Rutas REST para el módulo de Channels (Puntos de Medición de Dispositivos)

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import { validateResourceOwnership } from '../../middleware/validateResourceOwnership.js';
import * as channelServices from './services.js';
import * as channelRepository from './repository.js';
import {
    createChannelSchema,
    updateChannelSchema,
    getChannelsSchema,
    getChannelByIdSchema,
    deleteChannelSchema
} from './dtos/index.js';
import logger from '../../utils/logger.js';

const validateChannelOwnership = validateResourceOwnership({
    findById: channelRepository.findChannelById,
    findByPublicCode: channelRepository.findChannelByPublicCodeInternal,
    resourceName: 'channel',
    paramName: 'id',
    checkSoftDelete: true
});

const router = express.Router();
const channelLogger = logger.child({ component: 'channels' });


// 📄 Swagger: src/docs/swagger/channels.yaml -> POST /
router.post('/', authenticate, requireRole(['system-admin', 'org-admin']), validate(createChannelSchema), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const channel = await channelServices.createChannel(req.body, userId, ipAddress, userAgent);
        
        res.status(201).json({
            ok: true,
            data: channel,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/channels.yaml -> GET /
router.get('/', authenticate, enforceActiveOrganization, validate(getChannelsSchema), async (req, res, next) => {
    try {
        const { deviceId, measurementTypeId, status, search, notInHierarchy, limit, offset } = req.query;
        
        const result = await channelServices.listChannels({
            deviceId,
            organizationId: req.organizationContext.id,
            measurementTypeId,
            status,
            search,
            notInHierarchy,
            limit,
            offset,
            showAll: req.organizationContext.showAll || false
        });
        
        res.status(200).json({
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


// 📄 Swagger: src/docs/swagger/channels.yaml -> GET /:id
router.get('/:id', authenticate, validateChannelOwnership, validate(getChannelByIdSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const channel = await channelServices.getChannelByPublicCode(id);
        
        res.status(200).json({
            ok: true,
            data: channel,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/channels.yaml -> PUT /:id
router.put('/:id', authenticate, requireRole(['system-admin', 'org-admin']), validateChannelOwnership, validate(updateChannelSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const channel = await channelServices.updateChannel(id, req.body, userId, ipAddress, userAgent);
        
        res.status(200).json({
            ok: true,
            data: channel,
            meta: {
                timestamp: new Date().toISOString(),
                locale: req.locale
            }
        });
    } catch (error) {
        next(error);
    }
});


// 📄 Swagger: src/docs/swagger/channels.yaml -> DELETE /:id
router.delete('/:id', authenticate, requireRole(['system-admin']), validateChannelOwnership, validate(deleteChannelSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        await channelServices.deleteChannel(id, userId, ipAddress, userAgent);
        
        res.status(200).json({
            ok: true,
            data: {
                message: 'Channel eliminado exitosamente'
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
