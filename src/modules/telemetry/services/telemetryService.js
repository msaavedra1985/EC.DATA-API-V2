/**
 * TelemetryService - Servicio principal de telemetría
 * 
 * Orquesta la búsqueda de datos históricos y realtime de Cassandra.
 * Combina metadata de PostgreSQL con datos de Cassandra.
 * 
 * Flujo:
 * 1. Obtener metadata del canal (device UUID, ch, tipo medición, variables)
 * 2. Determinar tabla Cassandra correcta (prefijo + resolución)
 * 3. Construir y ejecutar queries CQL con manejo de particiones
 * 4. Post-procesar resultados (filtros timezone, mapeo columnas)
 */
import { getTelemetryMetadata } from '../repositories/metadataRepository.js';
import { 
    getTableConfig, 
    queryTelemetryData, 
    getLatestData 
} from '../repositories/cassandraRepository.js';

/**
 * @typedef {Object} TelemetrySearchRequest
 * @property {string} channelId - ID del canal (UUID o public_code)
 * @property {string} from - Fecha inicio (ISO string o YYYY-MM-DD)
 * @property {string} to - Fecha fin (ISO string o YYYY-MM-DD)
 * @property {string} [tz] - Timezone objetivo
 * @property {string} resolution - Resolución: 'raw', '1m', '15m', '60m', 'daily'
 * @property {number[]} [variables] - IDs de variables específicas
 * @property {Object} [options] - Opciones adicionales
 * @property {boolean} [options.includePhases] - Incluir datos por fase
 * @property {Object} [filters] - Filtros adicionales
 * @property {number[]} [filters.excludeDays] - Días de la semana a excluir (0-6)
 * @property {Array<[string,string]>} [filters.hourRanges] - Rangos horarios a incluir
 */

/**
 * @typedef {Object} TelemetryResult
 * @property {Object} metadata - Información del canal y device
 * @property {Object} variables - Mapa de variables consultadas
 * @property {Array<Object>} data - Datos de telemetría
 */

/**
 * Busca datos de telemetría para un canal
 * 
 * @param {TelemetrySearchRequest} req - Parámetros de búsqueda
 * @returns {Promise<TelemetryResult>} Resultado de la búsqueda
 */
export const search = async (req) => {
    const { 
        channelId, 
        from, 
        to, 
        tz, 
        resolution = '1m', 
        variables = null,
        options = {},
        filters = {}
    } = req;

    // 1. Obtener metadata del canal
    const metadata = await getTelemetryMetadata(channelId, 'es', variables);
    
    if (!metadata) {
        throw new Error(`Canal no encontrado: ${channelId}`);
    }

    if (!metadata.channel.ch) {
        throw new Error(`Canal ${channelId} no tiene número de canal físico (ch) configurado`);
    }

    if (!metadata.measurementType.id) {
        throw new Error(`Canal ${channelId} no tiene tipo de medición configurado`);
    }

    // 2. Obtener configuración de tabla
    const { tableName, partitionType } = getTableConfig(
        metadata.measurementType.tablePrefix, 
        resolution
    );

    // 3. Parsear fechas
    const fromDate = parseDate(from, metadata.device.timezone);
    const toDate = parseDate(to, metadata.device.timezone, true);

    // 4. Ejecutar query en Cassandra
    const rawData = await queryTelemetryData({
        uuid: metadata.device.id,
        ch: metadata.channel.ch,
        tableName,
        partitionType,
        columns: metadata.columns,
        from: fromDate,
        to: toDate
    });

    // 5. Post-procesar datos
    let processedData = rawData;

    // Aplicar filtro de días excluidos
    if (filters.excludeDays && filters.excludeDays.length > 0) {
        processedData = filterByExcludeDays(processedData, filters.excludeDays, tz || metadata.device.timezone);
    }

    // Aplicar filtro de rangos horarios
    if (filters.hourRanges && filters.hourRanges.length > 0) {
        processedData = filterByHourRanges(processedData, filters.hourRanges, tz || metadata.device.timezone);
    }

    // 6. Mapear a formato de respuesta
    const data = processedData.map(row => {
        const values = {};
        for (const [varId, varInfo] of Object.entries(metadata.variables)) {
            const value = row[varInfo.column];
            values[varId] = value !== undefined && value !== null ? Number(value) : null;
        }
        
        return {
            ts: row.timestamp,
            values
        };
    });

    return {
        metadata: {
            uuid: metadata.device.id,
            timezone: metadata.device.timezone,
            deviceName: metadata.device.name,
            channelName: metadata.channel.name,
            channelCh: metadata.channel.ch,
            resolution,
            tableName,
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            totalRecords: data.length
        },
        variables: metadata.variables,
        data
    };
};

/**
 * Obtiene el último dato de un canal (para realtime)
 * 
 * @param {string} channelId - ID del canal
 * @returns {Promise<Object>} Último dato disponible
 */
export const getLatest = async (channelId) => {
    const metadata = await getTelemetryMetadata(channelId, 'es');
    
    if (!metadata) {
        throw new Error(`Canal no encontrado: ${channelId}`);
    }

    if (!metadata.channel.ch) {
        throw new Error(`Canal ${channelId} no tiene ch configurado`);
    }

    const latestRow = await getLatestData({
        uuid: metadata.device.id,
        ch: metadata.channel.ch,
        tablePrefix: metadata.measurementType.tablePrefix,
        columns: metadata.columns
    });

    if (!latestRow) {
        return {
            metadata: {
                uuid: metadata.device.id,
                deviceName: metadata.device.name,
                channelName: metadata.channel.name
            },
            variables: metadata.variables,
            data: null
        };
    }

    const values = {};
    for (const [varId, varInfo] of Object.entries(metadata.variables)) {
        const value = latestRow[varInfo.column];
        values[varId] = value !== undefined && value !== null ? Number(value) : null;
    }

    return {
        metadata: {
            uuid: metadata.device.id,
            deviceName: metadata.device.name,
            channelName: metadata.channel.name,
            timestamp: latestRow.timestamp
        },
        variables: metadata.variables,
        data: {
            ts: latestRow.timestamp,
            values
        }
    };
};

/**
 * Parsea fecha string a Date, considerando timezone
 * 
 * @param {string} dateStr - Fecha en formato ISO o YYYY-MM-DD
 * @param {string} timezone - Timezone del device
 * @param {boolean} endOfDay - Si true, establece al final del día
 * @returns {Date}
 */
const parseDate = (dateStr, timezone, endOfDay = false) => {
    let date;
    
    // Si es formato corto YYYY-MM-DD, agregar hora
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        if (endOfDay) {
            date = new Date(`${dateStr}T23:59:59.999Z`);
        } else {
            date = new Date(`${dateStr}T00:00:00.000Z`);
        }
    } else {
        date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) {
        throw new Error(`Fecha inválida: ${dateStr}`);
    }

    return date;
};

/**
 * Filtra datos excluyendo días específicos de la semana
 * 
 * @param {Array} data - Datos a filtrar
 * @param {number[]} excludeDays - Días a excluir (0=Domingo, 6=Sábado)
 * @param {string} timezone - Timezone para determinar día
 * @returns {Array}
 */
const filterByExcludeDays = (data, excludeDays, timezone) => {
    return data.filter(row => {
        const date = new Date(row.timestamp);
        const dayOfWeek = date.getDay();
        return !excludeDays.includes(dayOfWeek);
    });
};

/**
 * Filtra datos por rangos horarios
 * 
 * @param {Array} data - Datos a filtrar
 * @param {Array<[string,string]>} hourRanges - Rangos horarios (ej: [['08:00','12:00'],['14:00','18:00']])
 * @param {string} timezone - Timezone para determinar hora
 * @returns {Array}
 */
const filterByHourRanges = (data, hourRanges, timezone) => {
    // Parsear rangos a minutos desde medianoche
    const parsedRanges = hourRanges.map(([start, end]) => {
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        return {
            startMinutes: startH * 60 + startM,
            endMinutes: endH * 60 + endM
        };
    });

    return data.filter(row => {
        const date = new Date(row.timestamp);
        const minutes = date.getHours() * 60 + date.getMinutes();
        
        return parsedRanges.some(range => 
            minutes >= range.startMinutes && minutes <= range.endMinutes
        );
    });
};

export default {
    search,
    getLatest
};
