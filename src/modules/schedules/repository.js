// modules/schedules/repository.js
// Capa de acceso a datos para Schedules

import { Op } from 'sequelize';
import sequelize from '../../db/sql/sequelize.js';
import Schedule from './models/Schedule.js';
import ScheduleException from './models/ScheduleException.js';
import Validity from './models/Validity.js';
import TimeProfile from './models/TimeProfile.js';
import TimeRange from './models/TimeRange.js';
import Organization from '../organizations/models/Organization.js';
import { gridToRows, toScheduleDto } from './helpers/mapper.js';
import { recalculateValidityMetrics, recalculateExceptionsCount } from './helpers/metrics.js';

// Include de organización (para system-admin viendo todos los schedules)
const orgInclude = {
    model: Organization,
    as: 'organization',
    attributes: ['publicCode', 'name', 'slug']
};

// Include ligero: solo validities con métricas (sin exceptions ni timeProfiles)
const validitiesLightInclude = [
    {
        model: Validity,
        as: 'validities',
        attributes: ['id', 'validFrom', 'validTo', 'rangesCount', 'weekCoveragePercent', 'exceptionsCount']
    }
];

// Include medio: validities + excepciones + timeProfiles (sin rangos)
const validitiesOnlyInclude = [
    {
        model: Validity,
        as: 'validities',
        attributes: ['id', 'validFrom', 'validTo', 'rangesCount', 'weekCoveragePercent', 'exceptionsCount'],
        include: [
            {
                model: ScheduleException,
                as: 'exceptions',
                attributes: ['date', 'name', 'type', 'repeatYearly']
            },
            {
                model: TimeProfile,
                as: 'timeProfiles',
                attributes: ['id', 'name']
            }
        ]
    }
];

// Include anidado completo para reconstruir el payload
const fullInclude = [
    {
        model: Validity,
        as: 'validities',
        attributes: ['id', 'validFrom', 'validTo', 'rangesCount', 'weekCoveragePercent', 'exceptionsCount'],
        include: [
            {
                model: ScheduleException,
                as: 'exceptions',
                attributes: ['date', 'name', 'type', 'repeatYearly']
            },
            {
                model: TimeProfile,
                as: 'timeProfiles',
                attributes: ['id', 'name'],
                include: [
                    {
                        model: TimeRange,
                        as: 'timeRanges',
                        attributes: ['id', 'dayOfWeek', 'startTime', 'endTime']
                    }
                ]
            }
        ]
    }
];

/**
 * Buscar schedule por publicCode — uso externo (devuelve DTO)
 * @param {string} publicCode
 * @param {'none'|'validities'|'full'} includeMode - Nivel de detalle a incluir (default: 'none')
 * @returns {Promise<Object|null>}
 */
export const findScheduleByPublicCode = async (publicCode, includeMode = 'none', { includeOrg = false, organizationId = null } = {}) => {
    const includeMap = {
        'none':       [],
        'validities': validitiesOnlyInclude,
        'full':       fullInclude
    };
    const modeInclude = includeMap[includeMode] ?? [];
    const include = [
        ...(includeOrg ? [orgInclude] : []),
        ...modeInclude
    ];
    const where = { publicCode };
    if (organizationId) where.organizationId = organizationId;
    const schedule = await Schedule.findOne({ where, include });
    if (!schedule) return null;
    return toScheduleDto(schedule, includeMode);
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
 * @param {string|null} organizationId - UUID interno de la organización (null = todos los schedules, system-admin)
 * @param {Object} options
 * @param {number} options.limit
 * @param {number} options.offset
 * @param {'none'|'validities'|'full'} options.includeMode - Nivel de detalle (default: 'none')
 * @returns {Promise<{items: Object[], total: number}>}
 */
export const listSchedules = async (organizationId, { limit = 20, offset = 0, includeMode = 'none' } = {}) => {
    const where = organizationId ? { organizationId } : {};
    const includeOrg = !organizationId;   // include org data when querying all

    const includeMap = {
        'none':       [],
        'validities': validitiesLightInclude,
        'full':       fullInclude
    };
    const modeInclude = includeMap[includeMode] ?? [];

    const dtoModeMap = {
        'none':       'none',
        'validities': 'validities-light',
        'full':       'full'
    };
    const dtoMode = dtoModeMap[includeMode] ?? 'none';

    const { rows, count } = await Schedule.findAndCountAll({
        where,
        include: [
            ...(includeOrg ? [orgInclude] : []),
            ...modeInclude
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        distinct: true
    });

    return {
        items: rows.map(s => toScheduleDto(s, dtoMode)),
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
 * @param {Array}  params.validities    - Array del payload (cada validity puede incluir exceptions)
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
    transaction
}) => {
    const t = transaction;

    // 1. Crear Schedule
    const schedule = await Schedule.create(
        { id, publicCode, organizationId, name, description },
        { transaction: t }
    );

    // 2. Crear Validities → Exceptions → TimeProfiles → TimeRanges
    for (const validityPayload of validities) {
        const validity = await Validity.create(
            {
                scheduleId: schedule.id,
                validFrom:  validityPayload.validFrom ?? null,
                validTo:    validityPayload.validTo   ?? null
            },
            { transaction: t }
        );

        // 2.1. Crear ScheduleExceptions para esta validity
        if (validityPayload.exceptions && validityPayload.exceptions.length > 0) {
            await ScheduleException.bulkCreate(
                validityPayload.exceptions.map(ex => ({
                    validityId:   validity.id,
                    name:         ex.name,
                    type:         ex.type,
                    date:         ex.date,
                    repeatYearly: ex.repeatYearly ?? false
                })),
                { transaction: t }
            );
            await recalculateExceptionsCount(validity.id, t);
        }

        // 2.2. Crear TimeProfiles y TimeRanges
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

        await recalculateValidityMetrics(validity.id, t);
    }

    // 4. Recargar con todas las asociaciones para construir el DTO
    const created = await Schedule.findByPk(schedule.id, {
        include: fullInclude,
        transaction: t
    });

    return toScheduleDto(created, 'full');
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

/**
 * Obtener todas las validities de un schedule por scheduleId interno
 * @param {string} scheduleId - UUID interno del schedule
 * @param {boolean} includeRanges - Si incluir rangos completos (default: false)
 * @returns {Promise<Array>} Array de validities
 */
export const findValiditiesByScheduleId = async (scheduleId, includeRanges = false) => {
    const include = includeRanges ? [
        {
            model: TimeProfile,
            as: 'timeProfiles',
            attributes: ['id', 'name'],
            include: [{
                model: TimeRange,
                as: 'timeRanges',
                attributes: ['id', 'dayOfWeek', 'startTime', 'endTime']
            }]
        }
    ] : [
        {
            model: TimeProfile,
            as: 'timeProfiles',
            attributes: ['id', 'name']
        }
    ];

    return Validity.findAll({
        where: { scheduleId },
        attributes: ['id', 'validFrom', 'validTo', 'rangesCount', 'weekCoveragePercent', 'exceptionsCount'],
        include: [
            ...include,
            {
                model: ScheduleException,
                as: 'exceptions',
                attributes: ['date', 'name', 'type', 'repeatYearly']
            }
        ],
        order: [['validFrom', 'ASC NULLS FIRST']]
    });
};

/**
 * Obtener una validity específica por ID con timeProfiles (rangos) y excepciones.
 * Usado para construir la respuesta completa del PUT /validities/:validityId.
 * @param {number} validityId - ID de la validity
 * @returns {Promise<Object|null>}
 */
export const findValidityByIdFull = async (validityId) => {
    return Validity.findByPk(validityId, {
        attributes: ['id', 'scheduleId', 'validFrom', 'validTo', 'rangesCount', 'weekCoveragePercent', 'exceptionsCount'],
        include: [
            {
                model: ScheduleException,
                as: 'exceptions',
                attributes: ['date', 'name', 'type', 'repeatYearly']
            },
            {
                model: TimeProfile,
                as: 'timeProfiles',
                attributes: ['id', 'name'],
                include: [{
                    model: TimeRange,
                    as: 'timeRanges',
                    attributes: ['id', 'dayOfWeek', 'startTime', 'endTime']
                }]
            }
        ]
    });
};

/**
 * Obtener una validity específica por ID
 * @param {number} validityId - ID de la validity
 * @param {boolean} includeRanges - Si incluir rangos completos (default: true)
 * @returns {Promise<Object|null>}
 */
export const findValidityById = async (validityId, includeRanges = true) => {
    const include = includeRanges ? [
        {
            model: TimeProfile,
            as: 'timeProfiles',
            attributes: ['id', 'name'],
            include: [{
                model: TimeRange,
                as: 'timeRanges',
                attributes: ['id', 'dayOfWeek', 'startTime', 'endTime']
            }]
        }
    ] : [];

    return Validity.findByPk(validityId, {
        attributes: ['id', 'scheduleId', 'validFrom', 'validTo', 'rangesCount', 'weekCoveragePercent'],
        include
    });
};

/**
 * Actualizar una validity (validFrom, validTo)
 * @param {number} validityId - ID de la validity
 * @param {Object} data - { validFrom?, validTo? }
 * @param {Object} transaction - Transacción Sequelize
 * @returns {Promise<Object>} Validity actualizada
 */
export const updateValidity = async (validityId, data, transaction = null) => {
    const options = transaction ? { transaction } : {};

    const updateData = {};
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
    if (data.validTo !== undefined) updateData.validTo = data.validTo;

    // `returning: true` (PostgreSQL) devuelve el row actualizado en la misma
    // conexión, evitando leer datos stale cuando se ejecuta dentro de una transacción.
    const [, updatedRows] = await Validity.update(updateData, {
        where:     { id: validityId },
        returning: true,
        ...options
    });

    return updatedRows[0];
};

/**
 * Actualizar campos básicos de un schedule (name, description)
 * @param {string} scheduleId - UUID interno del schedule
 * @param {Object} data - { name?, description? }
 * @param {Object} transaction - Transacción Sequelize (opcional)
 * @returns {Promise<Object>} DTO actualizado del schedule
 */
export const updateScheduleFields = async (scheduleId, data, transaction = null) => {
    const options = transaction ? { transaction } : {};

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    await Schedule.update(updateData, { where: { id: scheduleId }, ...options });

    return Schedule.findByPk(scheduleId, { ...options });
};

/**
 * Agregar una validity completa a un schedule existente.
 * Crea validity, timeProfiles y timeRanges en una transacción.
 *
 * @param {string} scheduleId - UUID interno del schedule
 * @param {Object} validityPayload - { validFrom, validTo, timeProfiles }
 * @param {Object} transaction - Transacción Sequelize
 * @returns {Promise<Object>} Validity creada con métricas
 */
export const addValidity = async (scheduleId, validityPayload, transaction) => {
    const t = transaction;

    const validity = await Validity.create(
        {
            scheduleId,
            validFrom: validityPayload.validFrom ?? null,
            validTo:   validityPayload.validTo   ?? null
        },
        { transaction: t }
    );

    // Crear excepciones si vienen en el payload
    if (validityPayload.exceptions && validityPayload.exceptions.length > 0) {
        await ScheduleException.bulkCreate(
            validityPayload.exceptions.map(ex => ({
                validityId:   validity.id,
                name:         ex.name,
                type:         ex.type,
                date:         ex.date,
                repeatYearly: ex.repeatYearly ?? false
            })),
            { transaction: t }
        );
        await recalculateExceptionsCount(validity.id, t);
    }

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

    await recalculateValidityMetrics(validity.id, t);

    return validity.id;
};

/**
 * Eliminar una validity (hard delete, hooks actualizan validitiesCount).
 * @param {number} validityId - ID de la validity
 * @param {Object} transaction - Transacción Sequelize (opcional)
 * @returns {Promise<boolean>}
 */
export const deleteValidity = async (validityId, transaction = null) => {
    const options = transaction ? { transaction } : {};
    const validity = await Validity.findByPk(validityId);
    if (!validity) return false;
    await validity.destroy(options);
    return true;
};

/**
 * Sincronizar excepciones de una validity con detección inteligente de cambios.
 * Diff por `date` como clave de identidad.
 *
 * @param {number} validityId - ID de la validity
 * @param {Array} exceptionsPayload - Array de { date, name, type, repeatYearly }
 * @param {Object} transaction - Transacción Sequelize
 * @returns {Promise<Object>} { created, updated, deleted }
 */
export const syncExceptions = async (validityId, exceptionsPayload, transaction = null) => {
    const t = transaction;
    const options = t ? { transaction: t } : {};
    const changes = { created: 0, updated: 0, deleted: 0 };

    const existing = await ScheduleException.findAll({ where: { validityId }, ...options });

    const existingMap = new Map();
    for (const ex of existing) {
        existingMap.set(ex.date, ex);
    }

    const incomingMap = new Map();
    for (const ex of exceptionsPayload) {
        incomingMap.set(ex.date, ex);
    }

    // Crear o actualizar
    for (const [date, incoming] of incomingMap) {
        const existing = existingMap.get(date);
        if (!existing) {
            await ScheduleException.create(
                { validityId, date: incoming.date, name: incoming.name, type: incoming.type, repeatYearly: incoming.repeatYearly ?? false },
                options
            );
            changes.created++;
        } else {
            const changed =
                existing.name         !== incoming.name ||
                existing.type         !== incoming.type ||
                existing.repeatYearly !== (incoming.repeatYearly ?? false);

            if (changed) {
                await existing.update(
                    { name: incoming.name, type: incoming.type, repeatYearly: incoming.repeatYearly ?? false },
                    options
                );
                changes.updated++;
            }
        }
    }

    // Eliminar las que ya no están
    for (const [date, ex] of existingMap) {
        if (!incomingMap.has(date)) {
            await ex.destroy(options);
            changes.deleted++;
        }
    }

    return changes;
};

/**
 * Update completo de una validity: fechas + timeProfiles con diff por ID + excepciones opcionales.
 * - Profile con id → match por ID, actualizar name si cambió, sincronizar rangos
 * - Profile sin id → crear nuevo
 * - Profiles existentes no referenciados → eliminar (cascade a ranges)
 * - Si payload.exceptions está definido → reemplaza excepciones de forma atómica
 *
 * @param {number} validityId - ID de la validity
 * @param {Object} payload - { validFrom, validTo, timeProfiles, exceptions? }
 * @param {Object} transaction - Transacción Sequelize
 * @returns {Promise<Object>} { profilesCreated, profilesDeleted, rangesCreated, rangesDeleted, exceptionsChanges? }
 */
export const syncValidityFull = async (validityId, payload, transaction) => {
    const t = transaction;
    const changes = { profilesCreated: 0, profilesDeleted: 0, rangesCreated: 0, rangesDeleted: 0 };

    // 1. Actualizar fechas si cambiaron
    const dateUpdate = {};
    if (payload.validFrom !== undefined) dateUpdate.validFrom = payload.validFrom;
    if (payload.validTo   !== undefined) dateUpdate.validTo   = payload.validTo;
    if (Object.keys(dateUpdate).length > 0) {
        await Validity.update(dateUpdate, { where: { id: validityId }, transaction: t });
    }

    // 2. Obtener profiles existentes con sus rangos
    const existingProfiles = await TimeProfile.findAll({
        where: { validityId },
        include: [{ model: TimeRange, as: 'timeRanges' }],
        transaction: t
    });

    const existingById = new Map(existingProfiles.map(p => [p.id, p]));

    // IDs de profiles que llegan en el payload (solo los que tienen id)
    const referencedIds = new Set(
        payload.timeProfiles.filter(p => p.id != null).map(p => p.id)
    );

    // 3. Procesar cada profile del payload
    for (const profilePayload of payload.timeProfiles) {
        let profile = profilePayload.id != null
            ? existingById.get(profilePayload.id)
            : null;

        if (!profile) {
            // Perfil nuevo (sin id o id no encontrado): crear
            profile = await TimeProfile.create(
                { validityId, name: profilePayload.name },
                { transaction: t }
            );
            changes.profilesCreated++;

            const rows = gridToRows(profilePayload.grid);
            if (rows.length > 0) {
                await TimeRange.bulkCreate(
                    rows.map(row => ({ timeProfileId: profile.id, ...row })),
                    { transaction: t }
                );
                changes.rangesCreated += rows.length;
            }
        } else {
            // Perfil existente: actualizar name si cambió
            if (profile.name !== profilePayload.name) {
                await profile.update({ name: profilePayload.name }, { transaction: t });
            }

            // Sincronizar rangos por clave dayOfWeek-startTime-endTime
            const incomingRanges = gridToRows(profilePayload.grid);
            const existingRanges = profile.timeRanges || [];

            const existingRangesMap = new Map();
            for (const r of existingRanges) {
                existingRangesMap.set(`${r.dayOfWeek}-${r.startTime}-${r.endTime}`, r);
            }

            const incomingRangesMap = new Map();
            for (const r of incomingRanges) {
                incomingRangesMap.set(`${r.dayOfWeek}-${r.startTime}-${r.endTime}`, r);
            }

            const toCreate = [];
            for (const [key, r] of incomingRangesMap) {
                if (!existingRangesMap.has(key)) {
                    toCreate.push({ timeProfileId: profile.id, ...r });
                }
            }

            const toDelete = [];
            for (const [key, r] of existingRangesMap) {
                if (!incomingRangesMap.has(key)) {
                    toDelete.push(r.id);
                }
            }

            if (toCreate.length > 0) {
                await TimeRange.bulkCreate(toCreate, { transaction: t });
                changes.rangesCreated += toCreate.length;
            }

            if (toDelete.length > 0) {
                await TimeRange.destroy({ where: { id: toDelete }, transaction: t });
                changes.rangesDeleted += toDelete.length;
            }
        }
    }

    // 4. Eliminar profiles no referenciados en el payload
    for (const [id, profile] of existingById) {
        if (!referencedIds.has(id)) {
            const rangesCount = profile.timeRanges?.length || 0;
            await TimeProfile.destroy({ where: { id: profile.id }, transaction: t });
            changes.profilesDeleted++;
            changes.rangesDeleted += rangesCount;
        }
    }

    // 5. Sincronizar excepciones si fueron proporcionadas en el payload
    if (payload.exceptions !== undefined) {
        const exceptionsChanges = await syncExceptions(validityId, payload.exceptions, t);
        changes.exceptionsChanges = exceptionsChanges;
    }

    await recalculateValidityMetrics(validityId, t);

    return changes;
};

/**
 * Sincronizar TimeRanges de una validity con detección inteligente de cambios.
 * Compara los rangos enviados vs existentes y detecta qué crear/actualizar/eliminar.
 * 
 * @param {number} validityId - ID de la validity
 * @param {Array} timeProfilesPayload - Array de { name, grid }
 * @param {Object} transaction - Transacción Sequelize
 * @returns {Promise<Object>} { created: number, updated: number, deleted: number }
 */
export const syncTimeRanges = async (validityId, timeProfilesPayload, transaction = null) => {
    const t = transaction;
    const changes = { created: 0, updated: 0, deleted: 0 };

    // 1. Obtener TimeProfiles existentes de esta validity
    const existingProfiles = await TimeProfile.findAll({
        where: { validityId },
        include: [{
            model: TimeRange,
            as: 'timeRanges'
        }],
        transaction: t
    });

    // 2. Crear un mapa de profiles existentes por nombre
    const existingProfilesMap = new Map();
    for (const profile of existingProfiles) {
        existingProfilesMap.set(profile.name, profile);
    }

    // 3. Procesar cada profile del payload
    for (const profilePayload of timeProfilesPayload) {
        const existingProfile = existingProfilesMap.get(profilePayload.name);

        if (!existingProfile) {
            // Profile nuevo: crear profile y todos sus rangos
            const newProfile = await TimeProfile.create(
                { validityId, name: profilePayload.name },
                { transaction: t }
            );

            const rows = gridToRows(profilePayload.grid);
            if (rows.length > 0) {
                await TimeRange.bulkCreate(
                    rows.map(row => ({ timeProfileId: newProfile.id, ...row })),
                    { transaction: t }
                );
                changes.created += rows.length;
            }
        } else {
            // Profile existente: sincronizar rangos
            const incomingRanges = gridToRows(profilePayload.grid);
            const existingRanges = existingProfile.timeRanges || [];

            // Crear mapas para comparación
            const existingRangesMap = new Map();
            for (const range of existingRanges) {
                const key = `${range.dayOfWeek}-${range.startTime}-${range.endTime}`;
                existingRangesMap.set(key, range);
            }

            const incomingRangesMap = new Map();
            for (const range of incomingRanges) {
                const key = `${range.dayOfWeek}-${range.startTime}-${range.endTime}`;
                incomingRangesMap.set(key, range);
            }

            // Detectar rangos a crear (están en incoming pero no en existing)
            const toCreate = [];
            for (const [key, range] of incomingRangesMap) {
                if (!existingRangesMap.has(key)) {
                    toCreate.push({
                        timeProfileId: existingProfile.id,
                        dayOfWeek: range.dayOfWeek,
                        startTime: range.startTime,
                        endTime: range.endTime
                    });
                }
            }

            // Detectar rangos a eliminar (están en existing pero no en incoming)
            const toDelete = [];
            for (const [key, range] of existingRangesMap) {
                if (!incomingRangesMap.has(key)) {
                    toDelete.push(range.id);
                }
            }

            // Ejecutar operaciones
            if (toCreate.length > 0) {
                await TimeRange.bulkCreate(toCreate, { transaction: t });
                changes.created += toCreate.length;
            }

            if (toDelete.length > 0) {
                await TimeRange.destroy({
                    where: { id: toDelete },
                    transaction: t
                });
                changes.deleted += toDelete.length;
            }

            // Marcar como procesado
            existingProfilesMap.delete(profilePayload.name);
        }
    }

    // 4. Eliminar profiles que ya no están en el payload
    for (const [name, profile] of existingProfilesMap) {
        const rangesCount = profile.timeRanges?.length || 0;
        await TimeProfile.destroy({
            where: { id: profile.id },
            transaction: t
        });
        changes.deleted += rangesCount;
    }

    await recalculateValidityMetrics(validityId, t);

    return changes;
};
