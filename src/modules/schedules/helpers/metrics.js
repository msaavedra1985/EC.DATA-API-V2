// helpers/metrics.js
// Funciones de cálculo de métricas para schedules

import Validity from '../models/Validity.js';
import TimeProfile from '../models/TimeProfile.js';
import TimeRange from '../models/TimeRange.js';
import Schedule from '../models/Schedule.js';
import ScheduleException from '../models/ScheduleException.js';

/**
 * Convierte "HH:mm" a minutos totales.
 * Soporta "24:00" → 1440.
 * @param {string} timeString - Hora en formato HH:mm
 * @returns {number} Minutos totales
 */
export const timeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Calcula la cobertura semanal de un conjunto de TimeRanges.
 * Base: 10,080 minutos (7 días × 24 horas × 60 minutos)
 * 
 * @param {Array} timeRanges - Array de TimeRange instances o plain objects
 * @returns {Object} { minutes: number, percent: number }
 */
export const calculateWeekCoverage = (timeRanges) => {
    if (!timeRanges || timeRanges.length === 0) {
        return { minutes: 0, percent: 0.00 };
    }

    // Agrupar rangos por día
    const rangesByDay = {};
    
    for (const range of timeRanges) {
        const day = range.dayOfWeek;
        if (!rangesByDay[day]) {
            rangesByDay[day] = [];
        }
        rangesByDay[day].push({
            start: timeToMinutes(range.startTime),
            end: timeToMinutes(range.endTime)
        });
    }

    // Calcular minutos totales cubiertos
    let totalMinutes = 0;

    for (const day in rangesByDay) {
        const ranges = rangesByDay[day];
        
        // Ordenar rangos por hora de inicio
        ranges.sort((a, b) => a.start - b.start);

        // Fusionar rangos solapados y calcular minutos
        let currentStart = ranges[0].start;
        let currentEnd = ranges[0].end;

        for (let i = 1; i < ranges.length; i++) {
            const range = ranges[i];
            
            if (range.start <= currentEnd) {
                // Rangos se solapan o tocan, fusionar
                currentEnd = Math.max(currentEnd, range.end);
            } else {
                // Rango separado, agregar el anterior y empezar uno nuevo
                totalMinutes += (currentEnd - currentStart);
                currentStart = range.start;
                currentEnd = range.end;
            }
        }

        // Agregar el último rango del día
        totalMinutes += (currentEnd - currentStart);
    }

    // Calcular porcentaje (base: 10,080 minutos)
    const WEEK_TOTAL_MINUTES = 7 * 24 * 60; // 10,080
    const percent = (totalMinutes / WEEK_TOTAL_MINUTES) * 100;

    return {
        minutes: totalMinutes,
        percent: parseFloat(percent.toFixed(2))
    };
};

/**
 * Recalcula el contador de excepciones de una Validity específica.
 * Actualiza exceptionsCount.
 *
 * @param {number} validityId - ID de la validity
 * @param {Object} transaction - Transacción Sequelize (opcional)
 * @returns {Promise<void>}
 */
export const recalculateExceptionsCount = async (validityId, transaction = null) => {
    const options = transaction ? { transaction } : {};
    const count = await ScheduleException.count({
        where: { validityId },
        ...options
    });
    await Validity.update(
        { exceptionsCount: count },
        { where: { id: validityId }, ...options }
    );
};

/**
 * Recalcula las métricas de una Validity específica.
 * Actualiza rangesCount y weekCoveragePercent.
 * 
 * @param {number} validityId - ID de la validity
 * @param {Object} transaction - Transacción Sequelize (opcional)
 * @returns {Promise<void>}
 */
export const recalculateValidityMetrics = async (validityId, transaction = null) => {
    const options = transaction ? { transaction } : {};

    // Obtener todos los TimeRanges de esta validity
    const timeRanges = await TimeRange.findAll({
        include: [{
            model: TimeProfile,
            as: 'timeProfile',
            where: { validityId },
            attributes: []
        }],
        ...options
    });

    // Calcular métricas
    const rangesCount = timeRanges.length;
    const coverage = calculateWeekCoverage(timeRanges);

    // Actualizar validity
    await Validity.update(
        {
            rangesCount,
            weekCoveragePercent: coverage.percent
        },
        {
            where: { id: validityId },
            ...options
        }
    );
};

/**
 * Recalcula el contador de validities de un Schedule.
 * 
 * @param {string} scheduleId - UUID del schedule
 * @param {Object} transaction - Transacción Sequelize (opcional)
 * @returns {Promise<void>}
 */
export const recalculateScheduleMetrics = async (scheduleId, transaction = null) => {
    const options = transaction ? { transaction } : {};

    // Contar validities
    const validitiesCount = await Validity.count({
        where: { scheduleId },
        ...options
    });

    // Actualizar schedule
    await Schedule.update(
        { validitiesCount },
        {
            where: { id: scheduleId },
            ...options
        }
    );
};

/**
 * Valida la consistencia de las métricas de un schedule y recalcula si es necesario.
 * Útil para verificar integridad después de operaciones manuales o migraciones.
 * 
 * @param {string} scheduleId - UUID del schedule
 * @returns {Promise<Object>} { consistent: boolean, recalculated: boolean }
 */
export const ensureMetricsConsistency = async (scheduleId) => {
    const schedule = await Schedule.findByPk(scheduleId, {
        include: [{
            model: Validity,
            as: 'validities',
            include: [{
                model: TimeProfile,
                as: 'timeProfiles',
                include: [{
                    model: TimeRange,
                    as: 'timeRanges'
                }]
            }, {
                model: ScheduleException,
                as: 'exceptions'
            }]
        }]
    });

    if (!schedule) {
        throw new Error('Schedule no encontrado');
    }

    let needsRecalculation = false;

    // Verificar contador de validities
    const actualValiditiesCount = schedule.validities.length;
    if (schedule.validitiesCount !== actualValiditiesCount) {
        needsRecalculation = true;
    }

    // Verificar métricas de cada validity
    for (const validity of schedule.validities) {
        const allRanges = validity.timeProfiles.flatMap(tp => tp.timeRanges);
        const actualRangesCount = allRanges.length;
        const actualCoverage = calculateWeekCoverage(allRanges);
        const actualExceptionsCount = validity.exceptions?.length || 0;

        if (validity.rangesCount !== actualRangesCount || 
            Math.abs(validity.weekCoveragePercent - actualCoverage.percent) > 0.01 ||
            validity.exceptionsCount !== actualExceptionsCount) {
            needsRecalculation = true;
        }
    }

    // Recalcular si es necesario
    if (needsRecalculation) {
        await recalculateScheduleMetrics(scheduleId);
        for (const validity of schedule.validities) {
            await recalculateValidityMetrics(validity.id);
        }
    }

    return {
        consistent: !needsRecalculation,
        recalculated: needsRecalculation
    };
};
