/**
 * CassandraRepository - Repositorio para queries de telemetría en Cassandra
 * 
 * Maneja la construcción y ejecución de queries CQL para obtener datos
 * de mediciones históricos. Considera las estrategias de particionamiento:
 * - Tablas agregadas (1m, 15m, 60m, diario): partition por (uuid, canal, year)
 * - Tablas raw/realtime: partition por (uuid, canal, year, month, day)
 * 
 * IMPORTANTE: Las fechas ya vienen convertidas a UTC desde el servicio.
 * Este repositorio solo se encarga de detectar qué particiones (años/días)
 * cruza el rango UTC y ejecutar las queries correspondientes.
 */
import { execute, getCassandraClient } from '../../../db/cassandra/client.js';
import { getYearsInRange, getDaysInRange } from '../../../utils/dateUtils.js';

/**
 * Resoluciones soportadas y sus sufijos de tabla
 */
const RESOLUTION_CONFIG = {
    '1m': { suffix: '1m_t_datos', partitionType: 'year' },
    '15m': { suffix: '15m_t_datos', partitionType: 'year' },
    '60m': { suffix: '60m_t_datos', partitionType: 'year' },
    'daily': { suffix: 'diario_t_datos', partitionType: 'year' },
    'monthly': { suffix: 'mensual_t_datos', partitionType: 'year' },
    'raw': { suffix: 'datoscrudosnew', partitionType: 'day' }
};

/**
 * Resoluciones para tablas IoT (prefijo 'sim')
 */
const IOT_RESOLUTION_CONFIG = {
    '1m': { suffix: '1m_t_datos', partitionType: 'year' },
    '15m': { suffix: '15m_t_datos', partitionType: 'year' },
    '60m': { suffix: '60m_t_datos', partitionType: 'year' },
    'daily': { suffix: 'diario_t_datos', partitionType: 'year' },
    'raw': { suffix: 'datoscrudos', partitionType: 'day' }
};

/**
 * Construye el nombre de tabla Cassandra basado en tipo de medición y resolución
 * 
 * @param {string} tablePrefix - Prefijo de tabla ('', 'sim', 'btu')
 * @param {string} resolution - Resolución ('1m', '15m', '60m', 'daily', 'raw')
 * @returns {Object} { tableName, partitionType }
 */
export const getTableConfig = (tablePrefix, resolution) => {
    const config = tablePrefix === 'sim' || tablePrefix === 'btu' 
        ? IOT_RESOLUTION_CONFIG[resolution] 
        : RESOLUTION_CONFIG[resolution];

    if (!config) {
        throw new Error(`Resolución no soportada: ${resolution}`);
    }

    const tableName = tablePrefix ? `${tablePrefix}${config.suffix}` : config.suffix;
    
    return {
        tableName,
        partitionType: config.partitionType
    };
};

/**
 * Genera los rangos de partición según el tipo de particionamiento
 * Usa las funciones de dateUtils que manejan correctamente los rangos UTC
 * 
 * @param {Date} from - Fecha inicio (UTC)
 * @param {Date} to - Fecha fin (UTC)
 * @param {string} partitionType - 'year' o 'day'
 * @returns {Array<Object>} Lista de particiones { year } o { year, month, day }
 * 
 * @example
 * // Rango de fin de año: 2024-12-31T05:00:00Z a 2025-01-01T04:59:59Z
 * // Retorna: [{ year: 2024 }, { year: 2025 }]
 */
export const generatePartitionRanges = (from, to, partitionType) => {
    if (partitionType === 'year') {
        // Usa getYearsInRange que detecta todos los años que cruza el rango UTC
        const years = getYearsInRange(from, to);
        return years.map(year => ({ year }));
    } else if (partitionType === 'day') {
        // Usa getDaysInRange que detecta todos los días que cruza el rango UTC
        return getDaysInRange(from, to);
    }

    return [];
};

/**
 * Construye y ejecuta query CQL para obtener datos de telemetría
 * 
 * @param {Object} params - Parámetros de la query
 * @param {string} params.uuid - UUID del device
 * @param {number} params.ch - Número de canal físico
 * @param {string} params.tableName - Nombre de la tabla Cassandra
 * @param {string} params.partitionType - Tipo de partición ('year' o 'day')
 * @param {Array<string>} params.columns - Columnas a seleccionar
 * @param {Date} params.from - Fecha inicio
 * @param {Date} params.to - Fecha fin
 * @returns {Promise<Array>} Datos de telemetría
 */
export const queryTelemetryData = async ({ uuid, ch, tableName, partitionType, columns, from, to }) => {
    // Generar particiones a consultar
    const partitions = generatePartitionRanges(from, to, partitionType);
    
    // Construir lista de columnas para SELECT (siempre incluir timestamp)
    const selectColumns = ['timestamp', ...columns.filter(c => c !== 'timestamp')];
    const columnsStr = selectColumns.join(', ');

    // Ejecutar queries por cada partición
    const allResults = [];

    for (const partition of partitions) {
        let cql;
        let params;

        if (partitionType === 'year') {
            cql = `
                SELECT ${columnsStr}
                FROM sensores.${tableName}
                WHERE uuid = ?
                  AND canal = ?
                  AND year = ?
                  AND timestamp >= ?
                  AND timestamp <= ?
            `;
            params = [uuid, ch, partition.year, from, to];
        } else {
            cql = `
                SELECT ${columnsStr}
                FROM sensores.${tableName}
                WHERE uuid = ?
                  AND canal = ?
                  AND year = ?
                  AND month = ?
                  AND day = ?
                  AND timestamp >= ?
                  AND timestamp <= ?
            `;
            params = [uuid, ch, partition.year, partition.month, partition.day, from, to];
        }

        try {
            const result = await execute(cql, params);
            if (result && result.rows) {
                allResults.push(...result.rows);
            }
        } catch (error) {
            // Loguear pero continuar con otras particiones
            console.warn(`Error querying partition ${JSON.stringify(partition)}:`, error.message);
        }
    }

    // Ordenar por timestamp
    allResults.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return allResults;
};

/**
 * Obtiene el último dato de un canal (para realtime)
 * 
 * @param {Object} params - Parámetros
 * @param {string} params.uuid - UUID del device
 * @param {number} params.ch - Número de canal físico
 * @param {string} params.tablePrefix - Prefijo de tabla
 * @param {Array<string>} params.columns - Columnas a obtener
 * @returns {Promise<Object|null>} Último registro o null
 */
export const getLatestData = async ({ uuid, ch, tablePrefix, columns }) => {
    const now = new Date();
    const { tableName, partitionType } = getTableConfig(tablePrefix, '1m');
    
    const selectColumns = ['timestamp', ...columns.filter(c => c !== 'timestamp')];
    const columnsStr = selectColumns.join(', ');

    // Buscar en el año actual
    const cql = `
        SELECT ${columnsStr}
        FROM sensores.${tableName}
        WHERE uuid = ?
          AND canal = ?
          AND year = ?
        ORDER BY timestamp DESC
        LIMIT 1
    `;

    try {
        const result = await execute(cql, [uuid, ch, now.getFullYear()]);
        if (result && result.rows && result.rows.length > 0) {
            return result.rows[0];
        }
    } catch (error) {
        console.warn('Error getting latest data:', error.message);
    }

    return null;
};

export default {
    getTableConfig,
    generatePartitionRanges,
    queryTelemetryData,
    getLatestData
};
