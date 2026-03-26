// modules/schedules/routes.js
// Rutas REST para el módulo de Schedules (Motor de Horarios)

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import * as services from './services.js';
import {
    createScheduleSchema,
    getScheduleSchema,
    listSchedulesSchema,
    deleteScheduleSchema,
    getValiditiesSchema,
    getValidityRangesSchema,
    updateValiditySchema,
    updateValidityRangesSchema,
    updateScheduleSchema,
    addValiditySchema,
    deleteValiditySchema,
    updateExceptionsSchema,
    updateValidityFullSchema
} from './dtos/index.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const scheduleLogger = logger.child({ component: 'schedules' });

// 📄 Swagger: src/docs/swagger/schedules.yaml -> POST /api/v1/schedules
router.post(
    '/',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    enforceActiveOrganization,
    validate(createScheduleSchema),
    async (req, res, next) => {
        try {
            const userId     = req.user.userId;
            const orgId      = req.organizationContext.id;
            const ipAddress  = req.ip || req.connection?.remoteAddress;
            const userAgent  = req.headers['user-agent'];

            const schedule = await services.createSchedule(
                req.body,
                userId,
                orgId,
                ipAddress,
                userAgent
            );

            return res.status(201).json({
                ok: true,
                data: schedule,
                meta: { timestamp: new Date().toISOString(), locale: req.locale }
            });
        } catch (error) {
            // Errores 422 del validator de negocio: formatear detalles
            if (error.status === 422) {
                return res.status(422).json({
                    ok: false,
                    error: {
                        code:    error.code || 'SCHEDULE_VALIDATION_ERROR',
                        message: error.message,
                        details: error.details || []
                    }
                });
            }
            next(error);
        }
    }
);

// 📄 Swagger: src/docs/swagger/schedules.yaml -> GET /api/v1/schedules
router.get(
    '/',
    authenticate,
    enforceActiveOrganization,
    validate(listSchedulesSchema),
    async (req, res, next) => {
        try {
            const canAccessAll = req.organizationContext?.canAccessAll ?? false;
            const orgId  = canAccessAll ? null : req.organizationContext.id;
            const limit  = req.query?.limit  ?? 20;
            const offset = req.query?.offset ?? 0;
            const includeMode = req.query?.include ?? 'none';

            const result = await services.listSchedules(orgId, { limit, offset, includeMode });

            return res.json({
                ok: true,
                data: result.items,
                meta: {
                    total:     result.total,
                    limit:     Number(limit),
                    offset:    Number(offset),
                    timestamp: new Date().toISOString(),
                    locale:    req.locale
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// 📄 Swagger: src/docs/swagger/schedules.yaml -> GET /api/v1/schedules/:id
router.get(
    '/:id',
    authenticate,
    enforceActiveOrganization,
    validate(getScheduleSchema),
    async (req, res, next) => {
        try {
            const includeMode = req.query?.include ?? 'none';
            const canAccessAll = req.organizationContext?.canAccessAll ?? false;
            const orgId = canAccessAll ? null : req.organizationContext.id;
            const schedule = await services.getSchedule(req.params.id, includeMode, { includeOrg: canAccessAll, organizationId: orgId });

            return res.json({
                ok: true,
                data: schedule,
                meta: { timestamp: new Date().toISOString(), locale: req.locale }
            });
        } catch (error) {
            next(error);
        }
    }
);

// 📄 Swagger: src/docs/swagger/schedules.yaml -> DELETE /api/v1/schedules/:id
router.delete(
    '/:id',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    validate(deleteScheduleSchema),
    async (req, res, next) => {
        try {
            const userId    = req.user.userId;
            const ipAddress = req.ip || req.connection?.remoteAddress;
            const userAgent = req.headers['user-agent'];

            await services.deleteSchedule(req.params.id, userId, ipAddress, userAgent);

            return res.json({
                ok: true,
                data: { deleted: true },
                meta: { timestamp: new Date().toISOString(), locale: req.locale }
            });
        } catch (error) {
            next(error);
        }
    }
);

// 📄 Swagger: src/docs/swagger/schedules.yaml -> GET /api/v1/schedules/:id/validities
router.get(
    '/:id/validities',
    authenticate,
    validate(getValiditiesSchema),
    async (req, res, next) => {
        try {
            const validities = await services.getScheduleValidities(req.params.id);

            return res.json({
                ok: true,
                data: validities,
                meta: { timestamp: new Date().toISOString(), locale: req.locale }
            });
        } catch (error) {
            next(error);
        }
    }
);

// 📄 Swagger: src/docs/swagger/schedules.yaml -> GET /api/v1/schedules/:id/validities/:validityId/ranges
router.get(
    '/:id/validities/:validityId/ranges',
    authenticate,
    validate(getValidityRangesSchema),
    async (req, res, next) => {
        try {
            const ranges = await services.getValidityRanges(
                req.params.id,
                parseInt(req.params.validityId, 10)
            );

            return res.json({
                ok: true,
                data: ranges,
                meta: { timestamp: new Date().toISOString(), locale: req.locale }
            });
        } catch (error) {
            next(error);
        }
    }
);

// 📄 Swagger: src/docs/swagger/schedules.yaml -> PATCH /api/v1/schedules/:id/validities/:validityId
router.patch(
    '/:id/validities/:validityId',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    enforceActiveOrganization,
    validate(updateValiditySchema),
    async (req, res, next) => {
        try {
            const userId    = req.user.userId;
            const ipAddress = req.ip || req.connection?.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const validity = await services.updateValidity(
                req.params.id,
                parseInt(req.params.validityId, 10),
                req.body,
                userId,
                ipAddress,
                userAgent
            );

            return res.json({
                ok: true,
                data: validity,
                meta: { timestamp: new Date().toISOString(), locale: req.locale }
            });
        } catch (error) {
            if (error.status === 422) {
                return res.status(422).json({
                    ok: false,
                    error: {
                        code:    error.code || 'VALIDITY_VALIDATION_ERROR',
                        message: error.message,
                        details: error.details || []
                    }
                });
            }
            next(error);
        }
    }
);

// 📄 Swagger: src/docs/swagger/schedules.yaml -> PATCH /api/v1/schedules/:id
router.patch(
    '/:id',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    validate(updateScheduleSchema),
    async (req, res, next) => {
        try {
            const userId    = req.user.userId;
            const ipAddress = req.ip || req.connection?.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const schedule = await services.updateSchedule(
                req.params.id,
                req.body,
                userId,
                ipAddress,
                userAgent
            );

            return res.json({
                ok: true,
                data: schedule,
                meta: { timestamp: new Date().toISOString(), locale: req.locale }
            });
        } catch (error) {
            next(error);
        }
    }
);

// 📄 Swagger: src/docs/swagger/schedules.yaml -> POST /api/v1/schedules/:id/validities
router.post(
    '/:id/validities',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    enforceActiveOrganization,
    validate(addValiditySchema),
    async (req, res, next) => {
        try {
            const userId    = req.user.userId;
            const ipAddress = req.ip || req.connection?.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const validity = await services.addValidity(
                req.params.id,
                req.body,
                userId,
                ipAddress,
                userAgent
            );

            return res.status(201).json({
                ok: true,
                data: validity,
                meta: { timestamp: new Date().toISOString(), locale: req.locale }
            });
        } catch (error) {
            if (error.status === 422) {
                return res.status(422).json({
                    ok: false,
                    error: {
                        code:    error.code || 'SCHEDULE_VALIDATION_ERROR',
                        message: error.message,
                        details: error.details || []
                    }
                });
            }
            next(error);
        }
    }
);

// 📄 Swagger: src/docs/swagger/schedules.yaml -> DELETE /api/v1/schedules/:id/validities/:validityId
router.delete(
    '/:id/validities/:validityId',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    validate(deleteValiditySchema),
    async (req, res, next) => {
        try {
            const userId    = req.user.userId;
            const ipAddress = req.ip || req.connection?.remoteAddress;
            const userAgent = req.headers['user-agent'];

            await services.deleteValidity(
                req.params.id,
                parseInt(req.params.validityId, 10),
                userId,
                ipAddress,
                userAgent
            );

            return res.json({
                ok: true,
                data: { deleted: true },
                meta: { timestamp: new Date().toISOString(), locale: req.locale }
            });
        } catch (error) {
            next(error);
        }
    }
);

// 📄 Swagger: src/docs/swagger/schedules.yaml -> PUT /api/v1/schedules/:id/validities/:validityId/exceptions
router.put(
    '/:id/validities/:validityId/exceptions',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    enforceActiveOrganization,
    validate(updateExceptionsSchema),
    async (req, res, next) => {
        try {
            const userId    = req.user.userId;
            const ipAddress = req.ip || req.connection?.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const result = await services.updateExceptions(
                req.params.id,
                parseInt(req.params.validityId, 10),
                req.body.exceptions,
                userId,
                ipAddress,
                userAgent
            );

            return res.json({
                ok: true,
                data: result,
                meta: { timestamp: new Date().toISOString(), locale: req.locale }
            });
        } catch (error) {
            next(error);
        }
    }
);

// 📄 Swagger: src/docs/swagger/schedules.yaml -> PUT /api/v1/schedules/:id/validities/:validityId
router.put(
    '/:id/validities/:validityId',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    enforceActiveOrganization,
    validate(updateValidityFullSchema),
    async (req, res, next) => {
        try {
            const userId    = req.user.userId;
            const ipAddress = req.ip || req.connection?.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const result = await services.updateValidityFull(
                req.params.id,
                parseInt(req.params.validityId, 10),
                req.body,
                userId,
                ipAddress,
                userAgent
            );

            return res.json({
                ok: true,
                data: result,
                meta: { timestamp: new Date().toISOString(), locale: req.locale }
            });
        } catch (error) {
            if (error.status === 422) {
                return res.status(422).json({
                    ok: false,
                    error: {
                        code:    error.code || 'VALIDITY_VALIDATION_ERROR',
                        message: error.message,
                        details: error.details || []
                    }
                });
            }
            next(error);
        }
    }
);

// 📄 Swagger: src/docs/swagger/schedules.yaml -> PUT /api/v1/schedules/:id/validities/:validityId/ranges
router.put(
    '/:id/validities/:validityId/ranges',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    enforceActiveOrganization,
    validate(updateValidityRangesSchema),
    async (req, res, next) => {
        try {
            const userId    = req.user.userId;
            const ipAddress = req.ip || req.connection?.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const result = await services.updateValidityRanges(
                req.params.id,
                parseInt(req.params.validityId, 10),
                req.body.timeProfiles,
                userId,
                ipAddress,
                userAgent
            );

            return res.json({
                ok: true,
                data: result,
                meta: { timestamp: new Date().toISOString(), locale: req.locale }
            });
        } catch (error) {
            if (error.status === 422) {
                return res.status(422).json({
                    ok: false,
                    error: {
                        code:    error.code || 'RANGES_VALIDATION_ERROR',
                        message: error.message,
                        details: error.details || []
                    }
                });
            }
            next(error);
        }
    }
);

export default router;
