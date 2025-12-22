/**
 * DateUtils - Utilidades centralizadas para manejo de fechas con timezone
 * 
 * Usa DayJS con plugins UTC y Timezone para conversiones precisas.
 * Resuelve problemas como:
 * - Fin de año: 31 dic en Lima = 31 dic 05:00 UTC a 1 ene 04:59:59 UTC
 * - Conversión timezone → UTC para queries a Cassandra
 * - Detección de años que cruza un rango de fechas
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

// Configurar plugins una sola vez
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Parsea una fecha string en una timezone específica y la convierte a UTC
 * 
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD o ISO string
 * @param {string} tz - Timezone del dispositivo (ej: 'America/Lima')
 * @param {boolean} endOfDay - Si true, establece al final del día (23:59:59.999)
 * @returns {Date} Fecha en UTC
 * 
 * @example
 * // 31 dic 2024 inicio del día en Lima = 31 dic 2024 05:00:00 UTC
 * parseLocalDateToUTC('2024-12-31', 'America/Lima', false)
 * 
 * @example
 * // 31 dic 2024 fin del día en Lima = 1 ene 2025 04:59:59.999 UTC
 * parseLocalDateToUTC('2024-12-31', 'America/Lima', true)
 */
export const parseLocalDateToUTC = (dateStr, tz, endOfDay = false) => {
    let parsed;

    // Si es formato corto YYYY-MM-DD, interpretar en la timezone local
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        if (endOfDay) {
            // Fin del día en la timezone local
            parsed = dayjs.tz(`${dateStr} 23:59:59.999`, tz);
        } else {
            // Inicio del día en la timezone local
            parsed = dayjs.tz(`${dateStr} 00:00:00.000`, tz);
        }
    } else {
        // Si ya es ISO string, parsear directamente
        parsed = dayjs(dateStr);
    }

    if (!parsed.isValid()) {
        throw new Error(`Fecha inválida: ${dateStr}`);
    }

    // Convertir a UTC y retornar como Date nativo
    return parsed.utc().toDate();
};

/**
 * Obtiene todos los años que cruza un rango de fechas UTC
 * 
 * @param {Date} fromUTC - Fecha inicio en UTC
 * @param {Date} toUTC - Fecha fin en UTC
 * @returns {number[]} Array de años
 * 
 * @example
 * // Rango: 2024-12-31T05:00:00Z a 2025-01-01T04:59:59Z
 * getYearsInRange(from, to) // [2024, 2025]
 */
export const getYearsInRange = (fromUTC, toUTC) => {
    const startYear = dayjs(fromUTC).utc().year();
    const endYear = dayjs(toUTC).utc().year();
    
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
        years.push(year);
    }
    
    return years;
};

/**
 * Obtiene todos los días que cruza un rango de fechas UTC
 * Usado para tablas con partición por día (raw data)
 * 
 * @param {Date} fromUTC - Fecha inicio en UTC
 * @param {Date} toUTC - Fecha fin en UTC
 * @returns {Array<{year: number, month: number, day: number}>} Array de particiones
 */
export const getDaysInRange = (fromUTC, toUTC) => {
    const days = [];
    let current = dayjs(fromUTC).utc().startOf('day');
    const end = dayjs(toUTC).utc();

    while (current.isBefore(end) || current.isSame(end, 'day')) {
        days.push({
            year: current.year(),
            month: current.month() + 1, // dayjs usa 0-11, Cassandra usa 1-12
            day: current.date()
        });
        current = current.add(1, 'day');
    }

    return days;
};

/**
 * Formatea una fecha UTC a string en una timezone específica
 * 
 * @param {Date} dateUTC - Fecha en UTC
 * @param {string} tz - Timezone destino
 * @param {string} format - Formato de salida (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} Fecha formateada
 */
export const formatInTimezone = (dateUTC, tz, format = 'YYYY-MM-DD HH:mm:ss') => {
    return dayjs(dateUTC).tz(tz).format(format);
};

/**
 * Obtiene la fecha actual en una timezone específica
 * 
 * @param {string} tz - Timezone
 * @returns {dayjs.Dayjs} Instancia de dayjs en la timezone
 */
export const nowInTimezone = (tz) => {
    return dayjs().tz(tz);
};

/**
 * Verifica si una fecha está en un rango específico
 * 
 * @param {Date} date - Fecha a verificar
 * @param {Date} from - Inicio del rango
 * @param {Date} to - Fin del rango
 * @returns {boolean}
 */
export const isDateInRange = (date, from, to) => {
    const d = dayjs(date);
    return d.isAfter(from) && d.isBefore(to) || d.isSame(from) || d.isSame(to);
};

/**
 * Exporta dayjs configurado para uso directo si se necesita
 */
export { dayjs };

export default {
    parseLocalDateToUTC,
    getYearsInRange,
    getDaysInRange,
    formatInTimezone,
    nowInTimezone,
    isDateInRange,
    dayjs
};
