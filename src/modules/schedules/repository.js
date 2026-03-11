// modules/schedules/repository.js
// Capa de acceso a datos para Schedules

import { Op } from 'sequelize';
import sequelize from '../../db/sql/sequelize.js';
import Schedule from './models/Schedule.js';
import ScheduleException from './models/ScheduleException.js';
import Validity from './models/Validity.js';
import TimeProfile from './models/TimeProfile.js';
import TimeRange from './models/TimeRange.js';
import { gridToRows, toScheduleDto } from './helpers/mapper.js';

// Include anidado completo para reconstruir el payload
const fullInclude = [
    {
        model: ScheduleException,
        as: 'exceptions',
        attributes: ['date', 'name', 'type', 'repeatYearly']
    },
    {
        model: Validity,
        as: 'validities',
        attributes: ['id', 'validFrom', 'validTo'],
        include: [
            {
                model: TimeProfile,
                as: 'timeProfiles',
                attributes: ['id', 'name'],
                include: [
                    {
                        model: TimeRange,
                        as: 'timeRanges',
                        attributes: ['dayOfWeek', 'startTime', 'endTime']
                    }
                ]
            }
        ]
    }
];

/**
 * Buscar schedule por publicCode — uso externo (devuelve DTO)
 * @param {string} publicCode
 * @returns {Promise<Object|null>}
 */
export const findScheduleByPublicCode = async (publicCode) => {
    const schedule = await Schedule.findOne({
        where: { publicCode },
        include: fullInclude
    });
    if (!schedule) return null;
    return toScheduleDto(schedule);
};

/**
 * Buscar schedule por publicCode — uso interno (devuelve instancia Sequelize)
 * @param {string} publicCode
 * @returns {Promise<Schedule|null>}
 */
export const findScheduleByPublicCodeInternal = async (publicCode) => {
    return Schedule.findOne({ where: { publicCode } });
};

/**
 * Listar schedules de una organización con paginación
 * @param {string} organizationId - UUID interno de la organización
 * @param {Object} options
 * @param {number} options.limit
 * @param {number} options.offset
 * @returns {Promise<{items: Object[], total: number}>}
 */
export const listSchedules = async (organizationId, { limit = 20, offset = 0 } = {}) => {
    const { rows, count } = await Schedule.findAndCountAll({
        where: { organizationId },
        include: fullInclude,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        distinct: true
    });

    return {
        items: rows.map(toScheduleDto),
        total: count
    };
};

/**
 * Crear un schedule completo en una transacción.
 * Descompone el payload en las 5 tablas relacionadas.
 *
 * @param {Object} params
 * @param {string} params.id            - UUID del schedule
 * @param {string} params.publicCode    - Código público
 * @param {string} params.organizationId
 * @param {string} params.name
 * @param {string|null} params.description
 * @param {Array}  params.validities    - Array del payload
 * @param {Array}  params.exceptions    - Array del payload
 * @param {Object} params.transaction   - Transacción Sequelize
 * @returns {Promise<Object>} DTO del schedule creado
 */
export const createSchedule = async ({
    id,
    publicCode,
    organizationId,
    name,
    description,
    validities,
    exceptions,
    transaction
}) => {
    const t = transaction;

    // 1. Crear Schedule
    const schedule = await Schedule.create(
        { id, publicCode, organizationId, name, description },
        { transaction: t }
    );

    // 2. Crear ScheduleExceptions
    if (exceptions && exceptions.length > 0) {
        await ScheduleException.bulkCreate(
            exceptions.map(ex => ({
                scheduleId:   schedule.id,
                name:         ex.name,
                type:         ex.type,
                date:         ex.date,
                repeatYearly: ex.repeatYearly ?? false
            })),
            { transaction: t }
        );
    }

    // 3. Crear Validities → TimeProfiles → TimeRanges
    for (const validityPayload of validities) {
        const validity = await Validity.create(
            {
                scheduleId: schedule.id,
                validFrom:  validityPayload.validFrom ?? null,
                validTo:    validityPayload.validTo   ?? null
            },
            { transaction: t }
        );

        for (const profilePayload of validityPayload.timeProfiles) {
            const profile = await TimeProfile.create(
                { validityId: validity.id, name: profilePayload.name },
                { transaction: t }
            );

            const rows = gridToRows(profilePayload.grid);
            if (rows.length > 0) {
                await TimeRange.bulkCreate(
                    rows.map(row => ({ timeProfileId: profile.id, ...row })),
                    { transaction: t }
                );
            }
        }
    }

    // 4. Recargar con todas las asociaciones para construir el DTO
    const created = await Schedule.findByPk(schedule.id, {
        include: fullInclude,
        transaction: t
    });

    return toScheduleDto(created);
};

/**
 * Soft delete de un schedule
 * @param {string} id - UUID interno del schedule
 * @returns {Promise<boolean>}
 */
export const deleteSchedule = async (id) => {
    const schedule = await Schedule.findByPk(id);
    if (!schedule) return false;
    await schedule.destroy();
    return true;
};
