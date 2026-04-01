/**
 * TelemetryService - Servicio principal de telemetría
 * 
 * Orquesta la búsqueda de datos históricos y realtime de Cassandra.
 * Combina metadata de PostgreSQL con datos de Cassandra.
 * 
 * Flujo:
 * 1. Resolver identificador del canal (soporta múltiples tipos)
 * 2. Obtener metadata del canal (device UUID, ch, tipo medición, variables)
 * 3. Determinar tabla Cassandra correcta (prefijo + resolución)
 * 4. Convertir fechas locales a UTC considerando timezone del dispositivo
 * 5. Construir y ejecutar queries CQL con manejo de particiones (incluye años cruzados)
 * 6. Post-procesar resultados (filtros timezone, mapeo columnas)
 */
import { 
    getTelemetryMetadata, 
    resolveChannelIdentifier,
    resolveChannelIdentifierWithCh 
} from '../repositories/metadataRepository.js';
import { 
    getTableConfig, 
    queryTelemetryData, 
    getLatestData 
} from '../repositories/cassandraRepository.js';
import { parseLocalDateToUTC, remapTimestamps, buildComparisonLabel, dayjs } from '../../../utils/dateUtils.js';
import {
    cacheLatestData,
    getCachedLatestData,
    cacheHistoricalData,
    getCachedHistoricalData,
    TELEMETRY_CACHE_TTL
} from '../cache.js';

/**
 * @typedef {Object} ChannelIdentifier
 * @property {string} [publicCode] - Código público del canal (CHN-XXXXX-X) - Para frontend
 * @property {string} [channelUuid] - UUID de PostgreSQL del canal - Para cron interno
 * @property {string} [legacyUuid] - UUID legacy del dispositivo en Cassandra - Para migración/debug
 * @property {Object} [deviceChannel] - Combo dispositivo + canal - Para batch processing
 * @property {string} [deviceChannel.deviceCode] - Código público del dispositivo (DEV-XXXXX-X)
 * @property {number} [deviceChannel.ch] - Número de canal físico
 */

/**
 * @typedef {Object} TelemetrySearchRequest
 * @property {string|ChannelIdentifier} identifier - Identificador del canal (string para compatibilidad, objeto para nuevos usos)
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
 * Normaliza un identificador de canal al formato objeto esperado
 * Mantiene compatibilidad con el formato legacy (string directo)
 * 
 * @param {string|ChannelIdentifier} identifier - Identificador en cualquier formato
 * @returns {ChannelIdentifier} Identificador normalizado como objeto
 */
const normalizeIdentifier = (identifier) => {
    // Si ya es objeto, retornar como está
    if (identifier && typeof identifier === 'object') {
        return identifier;
    }
    
    // Si es string, intentar determinar el tipo automáticamente
    if (typeof identifier === 'string') {
        // Formato CHN-XXX-XXX -> publicCode
        if (/^CHN-[A-Z2-9]{3}-[A-Z2-9]{3}$/.test(identifier)) {
            return { publicCode: identifier };
        }
        
        // Formato UUID -> channelUuid
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)) {
            return { channelUuid: identifier };
        }
        
        // Fallback: asumir publicCode para mantener compatibilidad
        return { publicCode: identifier };
    }
    
    throw new Error('Identificador inválido: debe ser string o objeto');
};

/**
 * Busca datos de telemetría para un canal
 * 
 * CACHE (solo para resoluciones agregadas estables):
 * - daily: TTL 1h (datos cambian durante el día actual)
 * - monthly: TTL 24h (datos casi inmutables)
 * - raw/1m/15m/60m: sin cache (cambian frecuentemente)
 * 
 * @param {TelemetrySearchRequest} req - Parámetros de búsqueda
 * @returns {Promise<TelemetryResult>} Resultado de la búsqueda
 */
export const search = async (req) => {
    const { 
        identifier,
        channelId,  // Legacy: mantener compatibilidad con código existente
        from, 
        to,
        comparisonFrom = null,
        comparisonTo = null,
        tz, 
        resolution = '1m', 
        variables = null,
        options = {},
        filters = {},
        skipCache = false
    } = req;

    // 1. Normalizar y resolver identificador
    // Soporta tanto el nuevo formato (identifier) como el legacy (channelId)
    const rawIdentifier = identifier || channelId;
    if (!rawIdentifier) {
        throw new Error('Se requiere identifier o channelId');
    }
    
    const normalizedIdentifier = normalizeIdentifier(rawIdentifier);
    const resolved = await resolveChannelIdentifier(normalizedIdentifier);
    
    if (!resolved) {
        throw new Error(`Canal no encontrado: ${JSON.stringify(rawIdentifier)}`);
    }

    // 2. Obtener metadata del canal usando el UUID resuelto
    const metadata = await getTelemetryMetadata(resolved.channelId, 'es', variables);
    
    if (!metadata) {
        throw new Error(`Metadata no encontrada para canal: ${resolved.channelId}`);
    }

    if (!metadata.channel.ch) {
        throw new Error(`Canal ${resolved.channelId} no tiene número de canal físico (ch) configurado`);
    }

    if (!metadata.measurementType.id) {
        throw new Error(`Canal ${resolved.channelId} no tiene tipo de medición configurado`);
    }

    // 2. Obtener configuración de tabla
    const { tableName, partitionType } = getTableConfig(
        metadata.measurementType.tablePrefix, 
        resolution
    );

    // 3. Validar timezone del dispositivo (obligatorio para conversiones correctas)
    if (!metadata.device.timezone) {
        throw new Error(`Dispositivo ${metadata.device.name} no tiene timezone configurado. Configure timezone en la tabla devices.`);
    }

    // 4. Parsear fechas locales a UTC considerando timezone efectivo
    // tz param (override del cliente) tiene prioridad sobre el timezone del dispositivo
    // Esto permite que el analyzer solicite datos en su propia zona horaria
    const effectiveTimezone = tz || metadata.device.timezone;
    const fromDate = parseLocalDateToUTC(from, effectiveTimezone, false);
    const toDate = parseLocalDateToUTC(to, effectiveTimezone, true);

    // 5. Verificar cache para resoluciones agregadas (daily, monthly)
    // Solo cachear sin filtros adicionales para mantener simplicidad
    const shouldCache = !skipCache && 
                        ['daily', 'monthly'].includes(resolution) && 
                        !filters.excludeDays?.length && 
                        !filters.hourRanges?.length &&
                        !tz;  // No cachear cuando hay tz override — las fechas UTC varían según zona
    
    if (shouldCache) {
        const cached = await getCachedHistoricalData(
            resolved.channelId,
            resolution,
            from,
            to
        );
        if (cached) {
            return { ...cached, fromCache: true };
        }
    }

    // 6. Ejecutar query en Cassandra
    const rawData = await queryTelemetryData({
        uuid: metadata.device.id,
        ch: metadata.channel.ch,
        tableName,
        partitionType,
        columns: metadata.columns,
        from: fromDate,
        to: toDate
    });

    // 7. Post-procesar datos
    let processedData = rawData;

    // Aplicar filtro de días excluidos
    if (filters.excludeDays && filters.excludeDays.length > 0) {
        processedData = filterByExcludeDays(processedData, filters.excludeDays, tz || metadata.device.timezone);
    }

    // Aplicar filtro de rangos horarios
    if (filters.hourRanges && filters.hourRanges.length > 0) {
        processedData = filterByHourRanges(processedData, filters.hourRanges, tz || metadata.device.timezone);
    }

    // 8. Mapear a formato de respuesta
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

    const result = {
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

    // 9. Cachear resultado (solo para daily/monthly sin filtros)
    if (shouldCache && data.length > 0) {
        await cacheHistoricalData(
            resolved.channelId,
            resolution,
            from,
            to,
            result
        );
    }

    // 10. Período de comparación (opcional)
    // Cuando se proveen comparisonFrom/comparisonTo, ejecutar una segunda consulta
    // con los mismos filtros y variables, luego reasignar los timestamps para alinearlos
    // con el período principal en el eje X del gráfico.
    let comparison = null;

    if (comparisonFrom && comparisonTo) {
        // Convertir fechas del período principal a ms para calcular el offset
        const mainStartMs = parseLocalDateToUTC(from, metadata.device.timezone, false).getTime();
        const compStartMs = parseLocalDateToUTC(comparisonFrom, metadata.device.timezone, false).getTime();
        const offsetMs = mainStartMs - compStartMs;

        // Parsear fechas del período de comparación a UTC
        const compFromDate = parseLocalDateToUTC(comparisonFrom, metadata.device.timezone, false);
        const compToDate = parseLocalDateToUTC(comparisonTo, metadata.device.timezone, true);

        // Ejecutar query para el período de comparación
        const compRawData = await queryTelemetryData({
            uuid: metadata.device.id,
            ch: metadata.channel.ch,
            tableName,
            partitionType,
            columns: metadata.columns,
            from: compFromDate,
            to: compToDate
        });

        // Aplicar los mismos filtros al período de comparación
        let compProcessedData = compRawData;

        if (filters.excludeDays && filters.excludeDays.length > 0) {
            compProcessedData = filterByExcludeDays(compProcessedData, filters.excludeDays, tz || metadata.device.timezone);
        }

        if (filters.hourRanges && filters.hourRanges.length > 0) {
            compProcessedData = filterByHourRanges(compProcessedData, filters.hourRanges, tz || metadata.device.timezone);
        }

        // Mapear a formato de respuesta
        const compData = compProcessedData.map(row => {
            const values = {};
            for (const [varId, varInfo] of Object.entries(metadata.variables)) {
                const value = row[varInfo.column];
                values[varId] = value !== undefined && value !== null ? Number(value) : null;
            }
            return { ts: row.timestamp, values };
        });

        // Reasignar timestamps al período principal
        const remappedData = remapTimestamps(compData, offsetMs);

        comparison = {
            period: {
                from: comparisonFrom,
                to: comparisonTo
            },
            label: buildComparisonLabel(comparisonFrom, comparisonTo),
            totalRecords: remappedData.length,
            data: remappedData
        };
    }

    result.comparison = comparison;

    return result;
};

/**
 * @typedef {Object} GetLatestOptions
 * @property {string} [since] - ISO timestamp del último dato que tiene el cliente
 *                              Si el dato más reciente no es más nuevo, retorna hasNew: false
 *                              Optimiza polling reduciendo transferencia de datos
 * @property {boolean} [skipCache=false] - Saltear cache (para forzar query fresca)
 */

/**
 * Obtiene el último dato de un canal (para pseudo-realtime/polling)
 * 
 * CACHE: TTL 30s - Balance entre frescura y reducción de carga
 * 
 * Soporta parámetro `since` para optimizar polling:
 * - Si hay datos más nuevos que `since` → retorna los datos
 * - Si no hay datos nuevos → retorna { hasNew: false }
 * 
 * @param {string|ChannelIdentifier} rawIdentifier - Identificador del canal (string o objeto)
 * @param {GetLatestOptions} [options={}] - Opciones adicionales
 * @returns {Promise<Object>} Último dato disponible o { hasNew: false }
 */
export const getLatest = async (rawIdentifier, options = {}) => {
    const { since, skipCache = false } = options;
    
    // Normalizar y resolver identificador
    const normalizedIdentifier = normalizeIdentifier(rawIdentifier);
    const resolved = await resolveChannelIdentifier(normalizedIdentifier);
    
    if (!resolved) {
        throw new Error(`Canal no encontrado: ${JSON.stringify(rawIdentifier)}`);
    }

    const metadata = await getTelemetryMetadata(resolved.channelId, 'es');
    
    if (!metadata) {
        throw new Error(`Metadata no encontrada para canal: ${resolved.channelId}`);
    }

    if (!metadata.channel.ch) {
        throw new Error(`Canal ${resolved.channelId} no tiene ch configurado`);
    }

    // Intentar obtener desde cache (si no hay since y no se solicita skip)
    // El cache guarda el último dato sin procesar "since" logic
    if (!skipCache) {
        const cached = await getCachedLatestData(resolved.channelId);
        if (cached) {
            // Aplicar lógica de "since" sobre dato cacheado
            if (since && cached.data) {
                const sinceDate = new Date(since);
                const latestDate = new Date(cached.data.ts);
                
                if (latestDate <= sinceDate) {
                    return {
                        hasNew: false,
                        lastChecked: new Date().toISOString(),
                        latestTimestamp: cached.data.ts,
                        metadata: cached.metadata,
                        fromCache: true
                    };
                }
            }
            // Retornar con flag fromCache para debugging
            return { ...cached, fromCache: true };
        }
    }

    const latestRow = await getLatestData({
        uuid: metadata.device.id,
        ch: metadata.channel.ch,
        tablePrefix: metadata.measurementType.tablePrefix,
        columns: metadata.columns
    });

    // Si no hay datos, retornar sin data (no cachear respuestas vacías)
    if (!latestRow) {
        return {
            hasNew: false,
            lastChecked: new Date().toISOString(),
            metadata: {
                uuid: metadata.device.id,
                deviceName: metadata.device.name,
                channelName: metadata.channel.name
            },
            variables: metadata.variables,
            data: null
        };
    }

    // Hay datos nuevos, construir respuesta completa
    const values = {};
    for (const [varId, varInfo] of Object.entries(metadata.variables)) {
        const value = latestRow[varInfo.column];
        values[varId] = value !== undefined && value !== null ? Number(value) : null;
    }

    const result = {
        hasNew: true,
        lastChecked: new Date().toISOString(),
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

    // Cachear el resultado (TTL 30s)
    await cacheLatestData(resolved.channelId, result);

    // Aplicar lógica de "since" post-cache
    if (since) {
        const sinceDate = new Date(since);
        const latestDate = new Date(latestRow.timestamp);
        
        if (latestDate <= sinceDate) {
            return {
                hasNew: false,
                lastChecked: new Date().toISOString(),
                latestTimestamp: latestRow.timestamp,
                metadata: result.metadata
            };
        }
    }

    return result;
};

/**
 * Obtiene datos de múltiples canales en paralelo
 * 
 * Ejecuta Promise.all sobre cada canal para máximo rendimiento.
 * Cada canal obtiene todas sus variables en una sola query Cassandra.
 * 
 * @param {Array<string|ChannelIdentifier>} identifiers - Array de identificadores de canal
 * @param {Object} [options={}] - Opciones compartidas
 * @param {string} [options.since] - ISO timestamp para optimización de polling
 * @returns {Promise<Object>} Resultados indexados por identificador
 */
export const getLatestBatch = async (identifiers, options = {}) => {
    const startTime = Date.now();
    
    // Ejecutar todas las consultas en paralelo
    const promises = identifiers.map(async (identifier, index) => {
        try {
            const result = await getLatest(identifier, options);
            return { 
                index,
                identifier,
                success: true, 
                ...result 
            };
        } catch (error) {
            return { 
                index,
                identifier,
                success: false, 
                error: error.message 
            };
        }
    });

    const results = await Promise.all(promises);
    const elapsed = Date.now() - startTime;

    // Estadísticas de la operación batch
    const successCount = results.filter(r => r.success).length;
    const withNewData = results.filter(r => r.success && r.hasNew).length;

    return {
        batchMeta: {
            totalChannels: identifiers.length,
            successCount,
            withNewData,
            elapsedMs: elapsed,
            timestamp: new Date().toISOString()
        },
        results
    };
};


/**
 * Filtra datos excluyendo días específicos de la semana
 * Usa dayjs con timezone para determinar el día correcto en la zona horaria local
 * 
 * @param {Array} data - Datos a filtrar
 * @param {number[]} excludeDays - Días a excluir (0=Domingo, 6=Sábado)
 * @param {string} tz - Timezone para determinar día
 * @returns {Array}
 */
const filterByExcludeDays = (data, excludeDays, tz) => {
    return data.filter(row => {
        // Convertir timestamp UTC a timezone local para obtener día correcto
        const localDay = dayjs(row.timestamp).tz(tz).day();
        return !excludeDays.includes(localDay);
    });
};

/**
 * Filtra datos por rangos horarios
 * Usa dayjs con timezone para determinar la hora correcta en la zona horaria local
 * 
 * @param {Array} data - Datos a filtrar
 * @param {Array<[string,string]>} hourRanges - Rangos horarios (ej: [['08:00','12:00'],['14:00','18:00']])
 * @param {string} tz - Timezone para determinar hora
 * @returns {Array}
 */
const filterByHourRanges = (data, hourRanges, tz) => {
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
        // Convertir timestamp UTC a timezone local para obtener hora correcta
        const local = dayjs(row.timestamp).tz(tz);
        const minutes = local.hour() * 60 + local.minute();
        
        return parsedRanges.some(range => 
            minutes >= range.startMinutes && minutes <= range.endMinutes
        );
    });
};

export default {
    search,
    getLatest,
    getLatestBatch
};
