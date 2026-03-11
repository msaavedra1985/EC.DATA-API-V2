// helpers/validator.js
// Validaciones de negocio para horarios (puras, sin DB)

const MIN_DATE = '0000-01-01';
const MAX_DATE = '9999-12-31';

/**
 * Convierte "HH:mm" a minutos totales.
 * Soporta "24:00" → 1440.
 * @param {string} t - Hora en formato HH:mm
 * @returns {number} Minutos totales
 */
const timeToMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

/**
 * Determina si dos rangos de hora se solapan.
 * Válido: A.to == B.from (se tocan pero no se pisan).
 * Fórmula: (A.from < B.to) AND (A.to > B.from)
 * @param {{ from: string, to: string }} a
 * @param {{ from: string, to: string }} b
 * @returns {boolean}
 */
const overlapsTimeRange = (a, b) => {
    const aFrom = timeToMinutes(a.from);
    const aTo   = timeToMinutes(a.to);
    const bFrom = timeToMinutes(b.from);
    const bTo   = timeToMinutes(b.to);
    return aFrom < bTo && aTo > bFrom;
};

/**
 * Determina si dos vigencias se solapan.
 * null = infinito (validFrom null = desde siempre, validTo null = sin vencimiento).
 * Fórmula: (A.from < B.to) AND (A.to > B.from)
 * @param {{ validFrom: string|null, validTo: string|null }} a
 * @param {{ validFrom: string|null, validTo: string|null }} b
 * @returns {boolean}
 */
const overlapsValidity = (a, b) => {
    const aFrom = a.validFrom ?? MIN_DATE;
    const aTo   = a.validTo   ?? MAX_DATE;
    const bFrom = b.validFrom ?? MIN_DATE;
    const bTo   = b.validTo   ?? MAX_DATE;
    return aFrom < bTo && aTo > bFrom;
};

/**
 * Valida el payload de creación de schedule.
 * Lanza un error 422 con detalles si encuentra problemas.
 *
 * Regla A: Las validities NO pueden solaparse (null = infinito).
 * Regla B: Dentro de una validity, los rangos de un mismo día (cruzando
 *          todos sus timeProfiles) no pueden pisarse.
 *          Válido: 12:00-fin y 12:00-inicio (se tocan, no se pisan).
 *
 * @param {Object} payload - Payload tal como viene del frontend
 * @throws {Error} Error con status 422 si hay violaciones
 */
export const validateSchedulePayload = (payload) => {
    const errors = [];
    const validities = payload.validities || [];

    // Regla A — solapamiento de vigencias
    for (let i = 0; i < validities.length; i++) {
        for (let j = i + 1; j < validities.length; j++) {
            if (overlapsValidity(validities[i], validities[j])) {
                errors.push(
                    `Regla A: Las vigencias en posición ${i} y ${j} se solapan. ` +
                    `(${validities[i].validFrom ?? '∞'} ~ ${validities[i].validTo ?? '∞'}) ` +
                    `vs (${validities[j].validFrom ?? '∞'} ~ ${validities[j].validTo ?? '∞'})`
                );
            }
        }
    }

    // Regla B — solapamiento de rangos horarios por día dentro de cada validity
    for (let vi = 0; vi < validities.length; vi++) {
        const validity = validities[vi];
        // Agrupar todos los rangos de todos los timeProfiles por día
        const rangesByDay = {};

        for (const profile of validity.timeProfiles || []) {
            for (const [day, ranges] of Object.entries(profile.grid || {})) {
                if (!rangesByDay[day]) rangesByDay[day] = [];
                for (const range of ranges) {
                    rangesByDay[day].push({ ...range, _profile: profile.name });
                }
            }
        }

        for (const [day, ranges] of Object.entries(rangesByDay)) {
            for (let i = 0; i < ranges.length; i++) {
                for (let j = i + 1; j < ranges.length; j++) {
                    if (overlapsTimeRange(ranges[i], ranges[j])) {
                        errors.push(
                            `Regla B: En vigencia ${vi}, día ${day}: ` +
                            `"${ranges[i].from}-${ranges[i].to}" (${ranges[i]._profile}) ` +
                            `se solapa con "${ranges[j].from}-${ranges[j].to}" (${ranges[j]._profile})`
                        );
                    }
                }
            }
        }
    }

    if (errors.length > 0) {
        const err = new Error('Validación de horario fallida');
        err.status = 422;
        err.code = 'SCHEDULE_VALIDATION_ERROR';
        err.details = errors;
        throw err;
    }
};
