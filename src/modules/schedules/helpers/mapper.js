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
        grid[key].push({ from: row.startTime, to: row.endTime });
    }
    return grid;
};

/**
 * Serializa un Schedule completo (con sus asociaciones Sequelize) al formato
 * que espera el frontend — idéntico al payload de entrada.
 *
 * @param {Object} schedule - Instancia Sequelize de Schedule con includes completos
 * @returns {Object} DTO público del schedule
 */
export const toScheduleDto = (schedule) => {
    const s = schedule.toJSON ? schedule.toJSON() : schedule;

    return {
        id:          s.publicCode,
        name:        s.name,
        description: s.description ?? null,
        createdAt:   s.createdAt,
        updatedAt:   s.updatedAt,
        validities: (s.validities || []).map(v => ({
            validFrom:    v.validFrom   ?? null,
            validTo:      v.validTo     ?? null,
            timeProfiles: (v.timeProfiles || []).map(tp => ({
                name: tp.name,
                grid: rowsToGrid(tp.timeRanges || [])
            }))
        })),
        exceptions: (s.exceptions || []).map(ex => ({
            date:         ex.date,
            name:         ex.name,
            type:         ex.type,
            repeatYearly: ex.repeatYearly
        }))
    };
};
