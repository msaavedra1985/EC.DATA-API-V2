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
    deleteScheduleSchema
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
            const orgId  = req.organizationContext.id;
            const limit  = req.query?.limit  ?? 20;
            const offset = req.query?.offset ?? 0;

            const result = await services.listSchedules(orgId, { limit, offset });

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
    validate(getScheduleSchema),
    async (req, res, next) => {
        try {
            const schedule = await services.getSchedule(req.params.id);

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

export default router;
