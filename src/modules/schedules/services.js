// modules/schedules/services.js
// Lógica de negocio para Schedules

import { v7 as uuidv7 } from 'uuid';
import sequelize from '../../db/sql/sequelize.js';
import * as repository from './repository.js';
import { validateSchedulePayload, validateValidityUpdate, validateRangesUpdate, validateSingleValidity } from './helpers/validator.js';
import { rowsToGrid } from './helpers/mapper.js';
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
 * @param {'none'|'validities'|'full'} include - Nivel de detalle (default: 'none')
 * @returns {Promise<Object>} DTO del schedule
 */
export const getSchedule = async (publicCode, include = 'none', { includeOrg = false, organizationId = null } = {}) => {
    const schedule = await repository.findScheduleByPublicCode(publicCode, include, { includeOrg, organizationId });
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

/**
 * Obtener todas las validities de un schedule con árbol completo.
 * @param {string} publicCode - Public code del schedule
 * @returns {Promise<Array>} Array de validities con timeProfiles y rangos completos
 */
export const getScheduleValidities = async (publicCode) => {
    const schedule = await repository.findScheduleByPublicCodeInternal(publicCode);
    if (!schedule) {
        const err = new Error('Schedule no encontrado');
        err.status = 404;
        err.code = 'SCHEDULE_NOT_FOUND';
        throw err;
    }

    // Incluir rangos completos (includeRanges = true)
    const validities = await repository.findValiditiesByScheduleId(schedule.id, true);
    
    // Serializar validities con árbol completo (timeProfiles + grid)
    return validities.map(v => {
        const validity = v.toJSON ? v.toJSON() : v;
        return {
            id: validity.id,
            validFrom: validity.validFrom ?? null,
            validTo: validity.validTo ?? null,
            rangesCount: validity.rangesCount ?? 0,
            weekCoveragePercent: validity.weekCoveragePercent ?? 0.00,
            timeProfiles: (validity.timeProfiles || []).map(tp => ({
                id: tp.id,
                name: tp.name,
                grid: rowsToGrid(tp.timeRanges || [])
            }))
        };
    });
};

/**
 * Obtener los rangos completos de una validity específica.
 * @param {string} publicCode - Public code del schedule
 * @param {number} validityId - ID de la validity
 * @returns {Promise<Object>} Validity con rangos completos y métricas
 */
export const getValidityRanges = async (publicCode, validityId) => {
    const schedule = await repository.findScheduleByPublicCodeInternal(publicCode);
    if (!schedule) {
        const err = new Error('Schedule no encontrado');
        err.status = 404;
        err.code = 'SCHEDULE_NOT_FOUND';
        throw err;
    }

    const validity = await repository.findValidityById(validityId, true);
    if (!validity || validity.scheduleId !== schedule.id) {
        const err = new Error('Validity no encontrada');
        err.status = 404;
        err.code = 'VALIDITY_NOT_FOUND';
        throw err;
    }

    const v = validity.toJSON ? validity.toJSON() : validity;
    
    return {
        validityId: v.id,
        validFrom: v.validFrom ?? null,
        validTo: v.validTo ?? null,
        rangesCount: v.rangesCount ?? 0,
        weekCoveragePercent: v.weekCoveragePercent ?? 0.00,
        timeProfiles: (v.timeProfiles || []).map(tp => ({
            name: tp.name,
            grid: rowsToGrid(tp.timeRanges || [])
        }))
    };
};

/**
 * Actualizar una validity (validFrom, validTo).
 * Valida que no se solape con otras validities del schedule.
 * 
 * @param {string} publicCode - Public code del schedule
 * @param {number} validityId - ID de la validity
 * @param {Object} data - { validFrom?, validTo? }
 * @param {string} userId - UUID del usuario
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<Object>} Validity actualizada
 */
export const updateValidity = async (publicCode, validityId, data, userId, ipAddress, userAgent) => {
    const schedule = await repository.findScheduleByPublicCodeInternal(publicCode);
    if (!schedule) {
        const err = new Error('Schedule no encontrado');
        err.status = 404;
        err.code = 'SCHEDULE_NOT_FOUND';
        throw err;
    }

    // Obtener todas las validities para validar solapamiento
    const allValidities = await repository.findValiditiesByScheduleId(schedule.id, false);
    const allValiditiesPlain = allValidities.map(v => v.toJSON ? v.toJSON() : v);

    // Validar que no se solape con otras validities
    validateValidityUpdate(allValiditiesPlain, validityId, data);

    // Actualizar validity en transacción
    const updated = await sequelize.transaction(async (t) => {
        return repository.updateValidity(validityId, data, t);
    });

    // Audit log
    await logAuditAction({
        entityType: 'schedule_validity',
        entityId: `${publicCode}/validity/${validityId}`,
        action: 'update',
        performedBy: userId,
        changes: { new: data },
        metadata: { scheduleId: publicCode, validityId },
        ipAddress,
        userAgent
    });

    scheduleLogger.info({ scheduleId: publicCode, validityId, userId }, 'Validity actualizada');

    const v = updated.toJSON ? updated.toJSON() : updated;
    return {
        id: v.id,
        validFrom: v.validFrom ?? null,
        validTo: v.validTo ?? null,
        rangesCount: v.rangesCount ?? 0,
        weekCoveragePercent: v.weekCoveragePercent ?? 0.00
    };
};

/**
 * Actualizar los rangos de una validity con detección inteligente de cambios.
 * Valida que los rangos no se solapen en el mismo día.
 * 
 * @param {string} publicCode - Public code del schedule
 * @param {number} validityId - ID de la validity
 * @param {Array} timeProfilesPayload - Array de { name, grid }
 * @param {string} userId - UUID del usuario
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<Object>} Resultado con métricas actualizadas y cambios
 */
export const updateValidityRanges = async (publicCode, validityId, timeProfilesPayload, userId, ipAddress, userAgent) => {
    const schedule = await repository.findScheduleByPublicCodeInternal(publicCode);
    if (!schedule) {
        const err = new Error('Schedule no encontrado');
        err.status = 404;
        err.code = 'SCHEDULE_NOT_FOUND';
        throw err;
    }

    const validity = await repository.findValidityById(validityId, false);
    if (!validity || validity.scheduleId !== schedule.id) {
        const err = new Error('Validity no encontrada');
        err.status = 404;
        err.code = 'VALIDITY_NOT_FOUND';
        throw err;
    }

    // Validar que los rangos no se solapen
    validateRangesUpdate(timeProfilesPayload);

    // Sincronizar rangos en transacción
    const changes = await sequelize.transaction(async (t) => {
        return repository.syncTimeRanges(validityId, timeProfilesPayload, t);
    });

    // Obtener validity actualizada con métricas
    const updated = await repository.findValidityById(validityId, false);
    const v = updated.toJSON ? updated.toJSON() : updated;

    // Audit log
    await logAuditAction({
        entityType: 'schedule_validity_ranges',
        entityId: `${publicCode}/validity/${validityId}/ranges`,
        action: 'update',
        performedBy: userId,
        changes: { 
            new: { timeProfilesCount: timeProfilesPayload.length },
            stats: changes
        },
        metadata: { scheduleId: publicCode, validityId },
        ipAddress,
        userAgent
    });

    scheduleLogger.info({ 
        scheduleId: publicCode, 
        validityId, 
        userId, 
        changes 
    }, 'Rangos de validity actualizados');

    return {
        validityId: v.id,
        rangesCount: v.rangesCount ?? 0,
        weekCoveragePercent: v.weekCoveragePercent ?? 0.00,
        changes
    };
};

/**
 * Actualizar nombre y/o descripción de un schedule.
 * @param {string} publicCode
 * @param {Object} data - { name?, description? }
 * @param {string} userId
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<Object>} DTO básico del schedule actualizado
 */
export const updateSchedule = async (publicCode, data, userId, ipAddress, userAgent) => {
    const schedule = await repository.findScheduleByPublicCodeInternal(publicCode);
    if (!schedule) {
        const err = new Error('Schedule no encontrado');
        err.status = 404;
        err.code = 'SCHEDULE_NOT_FOUND';
        throw err;
    }

    const updated = await repository.updateScheduleFields(schedule.id, data);
    const s = updated.toJSON ? updated.toJSON() : updated;

    await logAuditAction({
        entityType:  'schedule',
        entityId:    publicCode,
        action:      'update',
        performedBy: userId,
        changes:     { new: data },
        metadata:    { organizationId: schedule.organizationId },
        ipAddress,
        userAgent
    });

    scheduleLogger.info({ scheduleId: publicCode, userId }, 'Schedule actualizado');

    return {
        id:          s.publicCode,
        name:        s.name,
        description: s.description ?? null,
        validitiesCount: s.validitiesCount ?? 0,
        updatedAt:   s.updatedAt
    };
};

/**
 * Agregar una validity completa a un schedule existente.
 * @param {string} publicCode
 * @param {Object} validityPayload - { validFrom, validTo, timeProfiles }
 * @param {string} userId
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<Object>} Validity creada con métricas
 */
export const addValidity = async (publicCode, validityPayload, userId, ipAddress, userAgent) => {
    const schedule = await repository.findScheduleByPublicCodeInternal(publicCode);
    if (!schedule) {
        const err = new Error('Schedule no encontrado');
        err.status = 404;
        err.code = 'SCHEDULE_NOT_FOUND';
        throw err;
    }

    // Obtener validities existentes para validar solapamiento
    const existingValidities = await repository.findValiditiesByScheduleId(schedule.id, false);
    const existingPlain = existingValidities.map(v => v.toJSON ? v.toJSON() : v);

    // Regla A + Regla B
    validateSingleValidity(existingPlain, validityPayload);

    const validity = await sequelize.transaction(async (t) => {
        return repository.addValidity(schedule.id, validityPayload, t);
    });

    await logAuditAction({
        entityType:  'schedule_validity',
        entityId:    `${publicCode}/validity/new`,
        action:      'create',
        performedBy: userId,
        changes:     { new: { validFrom: validityPayload.validFrom, validTo: validityPayload.validTo } },
        metadata:    { scheduleId: publicCode },
        ipAddress,
        userAgent
    });

    scheduleLogger.info({ scheduleId: publicCode, userId }, 'Validity agregada');

    const v = validity.toJSON ? validity.toJSON() : validity;
    return {
        id:                 v.id,
        validFrom:          v.validFrom ?? null,
        validTo:            v.validTo   ?? null,
        rangesCount:        v.rangesCount ?? 0,
        weekCoveragePercent: v.weekCoveragePercent ?? 0.00,
        timeProfiles: (v.timeProfiles || []).map(tp => ({
            id:   tp.id,
            name: tp.name,
            grid: rowsToGrid(tp.timeRanges || [])
        }))
    };
};

/**
 * Eliminar una validity de un schedule.
 * @param {string} publicCode
 * @param {number} validityId
 * @param {string} userId
 * @param {string} ipAddress
 * @param {string} userAgent
 */
export const deleteValidity = async (publicCode, validityId, userId, ipAddress, userAgent) => {
    const schedule = await repository.findScheduleByPublicCodeInternal(publicCode);
    if (!schedule) {
        const err = new Error('Schedule no encontrado');
        err.status = 404;
        err.code = 'SCHEDULE_NOT_FOUND';
        throw err;
    }

    const validity = await repository.findValidityById(validityId, false);
    if (!validity || validity.scheduleId !== schedule.id) {
        const err = new Error('Validity no encontrada');
        err.status = 404;
        err.code = 'VALIDITY_NOT_FOUND';
        throw err;
    }

    await sequelize.transaction(async (t) => {
        await repository.deleteValidity(validityId, t);
    });

    await logAuditAction({
        entityType:  'schedule_validity',
        entityId:    `${publicCode}/validity/${validityId}`,
        action:      'delete',
        performedBy: userId,
        metadata:    { scheduleId: publicCode, validityId },
        ipAddress,
        userAgent
    });

    scheduleLogger.info({ scheduleId: publicCode, validityId, userId }, 'Validity eliminada');
};

/**
 * Reemplazar todas las excepciones de una validity con detección de cambios.
 * @param {string} publicCode - Public code del schedule
 * @param {number} validityId - ID de la validity
 * @param {Array} exceptions - Array de { date, name, type, repeatYearly }
 * @param {string} userId
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<Object>} { exceptionsCount, changes }
 */
export const updateExceptions = async (publicCode, validityId, exceptions, userId, ipAddress, userAgent) => {
    const schedule = await repository.findScheduleByPublicCodeInternal(publicCode);
    if (!schedule) {
        const err = new Error('Schedule no encontrado');
        err.status = 404;
        err.code = 'SCHEDULE_NOT_FOUND';
        throw err;
    }

    // Verificar que la validity pertenece al schedule
    const validity = await repository.findValidityById(validityId);
    if (!validity || validity.scheduleId !== schedule.id) {
        const err = new Error('Validity no encontrada');
        err.status = 404;
        err.code = 'VALIDITY_NOT_FOUND';
        throw err;
    }

    const changes = await sequelize.transaction(async (t) => {
        return repository.syncExceptions(validityId, exceptions, t);
    });

    // Recargar validity con contador actualizado
    const updated = await repository.findValidityById(validityId);
    const v = updated.toJSON ? updated.toJSON() : updated;

    await logAuditAction({
        entityType:  'validity_exceptions',
        entityId:    `${publicCode}/validities/${validityId}/exceptions`,
        action:      'update',
        performedBy: userId,
        changes:     { stats: changes },
        metadata:    { scheduleId: publicCode, validityId },
        ipAddress,
        userAgent
    });

    scheduleLogger.info({ scheduleId: publicCode, validityId, userId, changes }, 'Excepciones de validity actualizadas');

    return {
        exceptionsCount: v.exceptionsCount ?? 0,
        changes
    };
};

/**
 * Update completo de una validity: fechas + timeProfiles con diff por ID.
 * @param {string} publicCode
 * @param {number} validityId
 * @param {Object} payload - { validFrom, validTo, timeProfiles }
 * @param {string} userId
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<Object>} Validity actualizada con métricas y changes
 */
export const updateValidityFull = async (publicCode, validityId, payload, userId, ipAddress, userAgent) => {
    const schedule = await repository.findScheduleByPublicCodeInternal(publicCode);
    if (!schedule) {
        const err = new Error('Schedule no encontrado');
        err.status = 404;
        err.code = 'SCHEDULE_NOT_FOUND';
        throw err;
    }

    const validity = await repository.findValidityById(validityId, false);
    if (!validity || validity.scheduleId !== schedule.id) {
        const err = new Error('Validity no encontrada');
        err.status = 404;
        err.code = 'VALIDITY_NOT_FOUND';
        throw err;
    }

    // Regla A — validar fechas contra otras validities (excluyendo la actual)
    const allValidities = await repository.findValiditiesByScheduleId(schedule.id, false);
    const allPlain = allValidities.map(v => v.toJSON ? v.toJSON() : v);
    validateValidityUpdate(allPlain, validityId, {
        validFrom: payload.validFrom,
        validTo:   payload.validTo
    });

    // Regla B — validar rangos del payload
    validateRangesUpdate(payload.timeProfiles);

    const changes = await sequelize.transaction(async (t) => {
        return repository.syncValidityFull(validityId, payload, t);
    });

    // Recargar validity con métricas actualizadas (incluyendo excepciones si fueron procesadas)
    const updated = await repository.findValidityByIdFull(validityId);
    const v = updated.toJSON ? updated.toJSON() : updated;

    await logAuditAction({
        entityType:  'schedule_validity',
        entityId:    `${publicCode}/validity/${validityId}`,
        action:      'update',
        performedBy: userId,
        changes:     { stats: changes },
        metadata:    { scheduleId: publicCode, validityId },
        ipAddress,
        userAgent
    });

    scheduleLogger.info({ scheduleId: publicCode, validityId, userId, changes }, 'Validity actualizada (full)');

    const result = {
        validityId:          v.id,
        validFrom:           v.validFrom ?? null,
        validTo:             v.validTo   ?? null,
        rangesCount:         v.rangesCount ?? 0,
        weekCoveragePercent: v.weekCoveragePercent ?? 0.00,
        exceptionsCount:     v.exceptionsCount ?? 0,
        exceptions: (v.exceptions || []).map(ex => ({
            date:         ex.date,
            name:         ex.name,
            type:         ex.type,
            repeatYearly: ex.repeatYearly
        })),
        timeProfiles: (v.timeProfiles || []).map(tp => ({
            id:   tp.id,
            name: tp.name,
            grid: rowsToGrid(tp.timeRanges || [])
        })),
        changes
    };

    return result;
};
