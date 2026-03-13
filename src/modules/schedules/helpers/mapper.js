// helpers/mapper.js
// Transformaciones bidireccionales entre payload del frontend y filas de la DB

/**
 * Convierte el grid del payload a filas individuales para insertar en time_ranges.
 * { "1": [{from, to}, ...], "7": [...] } → [{dayOfWeek, startTime, endTime}, ...]
 *
 * @param {Object} grid - Grid del frontend: keys = "1"-"7", values = array de {from, to}
 * @returns {Array<{dayOfWeek: number, startTime: string, endTime: string}>}
 */
export const gridToRows = (grid) => {
    const rows = [];
    for (const [day, ranges] of Object.entries(grid)) {
        const dayOfWeek = parseInt(day, 10);
        for (const range of ranges) {
            rows.push({
                dayOfWeek,
                startTime: range.from,
                endTime:   range.to
            });
        }
    }
    return rows;
};

/**
 * Reconstruye el grid del frontend a partir de filas de la DB.
 * [{dayOfWeek, startTime, endTime}, ...] → {"1": [{from, to}], "7": [...]}
 *
 * @param {Array} rows - Filas de time_ranges (models de Sequelize o plain objects)
 * @returns {Object} Grid agrupado por dayOfWeek
 */
export const rowsToGrid = (rows) => {
    const grid = {};
    for (const row of rows) {
        const key = String(row.dayOfWeek);
        if (!grid[key]) grid[key] = [];
        const entry = { from: row.startTime, to: row.endTime };
        if (row.id != null) entry.id = row.id;
        grid[key].push(entry);
    }
    return grid;
};

/**
 * Serializa un Schedule (con sus asociaciones Sequelize) al formato público.
 *
 * @param {Object} schedule   - Instancia Sequelize de Schedule
 * @param {'none'|'validities'|'full'} includeMode - Nivel de detalle a incluir (default: 'none')
 * @returns {Object} DTO público del schedule
 */
export const toScheduleDto = (schedule, includeMode = 'none') => {
    const s = schedule.toJSON ? schedule.toJSON() : schedule;

    const dto = {
        id:              s.publicCode,
        name:            s.name,
        description:     s.description ?? null,
        validitiesCount: s.validitiesCount ?? 0,
        createdAt:       s.createdAt,
        updatedAt:       s.updatedAt
    };

    // Incluir organización cuando está disponible (vista de system-admin)
    if (s.organization) {
        dto.organization = {
            id:   s.organization.publicCode,
            name: s.organization.name,
            slug: s.organization.slug
        };
    }

    if (includeMode === 'validities-light') {
        dto.validities = (s.validities || []).map(v => ({
            id:                  v.id,
            validFrom:           v.validFrom           ?? null,
            validTo:             v.validTo             ?? null,
            rangesCount:         v.rangesCount         ?? 0,
            weekCoveragePercent: v.weekCoveragePercent ?? 0.00,
            exceptionsCount:     v.exceptionsCount     ?? 0
        }));
    } else if (includeMode === 'validities' || includeMode === 'full') {
        dto.validities = (s.validities || []).map(v => ({
            id:                  v.id,
            validFrom:           v.validFrom           ?? null,
            validTo:             v.validTo             ?? null,
            rangesCount:         v.rangesCount         ?? 0,
            weekCoveragePercent: v.weekCoveragePercent ?? 0.00,
            exceptionsCount:     v.exceptionsCount     ?? 0,
            exceptions: (v.exceptions || []).map(ex => ({
                date:         ex.date,
                name:         ex.name,
                type:         ex.type,
                repeatYearly: ex.repeatYearly
            })),
            timeProfiles: (v.timeProfiles || []).map(tp => {
                const profile = { id: tp.id, name: tp.name };
                if (includeMode === 'full') {
                    profile.grid = rowsToGrid(tp.timeRanges || []);
                }
                return profile;
            })
        }));
    }

    return dto;
};
