// modules/schedules/services.js
// Lógica de negocio para Schedules

import { v7 as uuidv7 } from 'uuid';
import sequelize from '../../db/sql/sequelize.js';
import * as repository from './repository.js';
import { validateSchedulePayload } from './helpers/validator.js';
import { logAuditAction } from '../../helpers/auditLog.js';
import { generatePublicCode } from '../../utils/identifiers.js';
import logger from '../../utils/logger.js';

const scheduleLogger = logger.child({ component: 'schedules' });

/**
 * Crear un schedule completo con transacción atómica.
 * Valida solapamientos antes de tocar la DB.
 *
 * @param {Object} payload     - Body validado por Zod
 * @param {string} userId      - UUID del usuario autenticado
 * @param {string} orgId       - UUID de la organización activa
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<Object>} DTO del schedule creado
 */
export const createSchedule = async (payload, userId, orgId, ipAddress, userAgent) => {
    // Validar reglas de negocio (sin tocar DB)
    validateSchedulePayload(payload);

    const id         = uuidv7();
    const publicCode = generatePublicCode('SCH');

    const scheduleDto = await sequelize.transaction(async (t) => {
        return repository.createSchedule({
            id,
            publicCode,
            organizationId: orgId,
            name:           payload.name,
            description:    payload.description ?? null,
            validities:     payload.validities,
            exceptions:     payload.exceptions ?? [],
            transaction:    t
        });
    });

    await logAuditAction({
        entityType: 'schedule',
        entityId:   publicCode,
        action:     'create',
        performedBy: userId,
        changes:    { new: { name: payload.name, organizationId: orgId } },
        metadata:   { organizationId: orgId },
        ipAddress,
        userAgent
    });

    scheduleLogger.info({ scheduleId: publicCode, userId }, 'Schedule creado');

    return scheduleDto;
};

/**
 * Obtener un schedule por publicCode.
 * @param {string} publicCode
 * @returns {Promise<Object>} DTO del schedule
 */
export const getSchedule = async (publicCode) => {
    const schedule = await repository.findScheduleByPublicCode(publicCode);
    if (!schedule) {
        const err = new Error('Schedule no encontrado');
        err.status = 404;
        err.code   = 'SCHEDULE_NOT_FOUND';
        throw err;
    }
    return schedule;
};

/**
 * Listar schedules de la organización activa.
 * @param {string} orgId   - UUID de la organización
 * @param {Object} options - { limit, offset }
 * @returns {Promise<{items: Object[], total: number}>}
 */
export const listSchedules = async (orgId, options) => {
    return repository.listSchedules(orgId, options);
};

/**
 * Eliminar (soft delete) un schedule.
 * @param {string} publicCode
 * @param {string} userId
 * @param {string} ipAddress
 * @param {string} userAgent
 */
export const deleteSchedule = async (publicCode, userId, ipAddress, userAgent) => {
    const schedule = await repository.findScheduleByPublicCodeInternal(publicCode);
    if (!schedule) {
        const err = new Error('Schedule no encontrado');
        err.status = 404;
        err.code   = 'SCHEDULE_NOT_FOUND';
        throw err;
    }

    await repository.deleteSchedule(schedule.id);

    await logAuditAction({
        entityType:  'schedule',
        entityId:    publicCode,
        action:      'delete',
        performedBy: userId,
        metadata:    { organizationId: schedule.organizationId },
        ipAddress,
        userAgent
    });

    scheduleLogger.info({ scheduleId: publicCode, userId }, 'Schedule eliminado');
};
