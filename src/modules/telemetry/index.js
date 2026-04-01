/**
 * Módulo de Telemetría - Índice principal
 * 
 * Exporta rutas, servicios y repositorios del módulo de telemetría.
 */
import { Router } from 'express';
import { search, getLatest, getLatestBatch } from './services/telemetryService.js';
import { variablesRouter } from './routes/variablesRoutes.js';
import { annotationsRouter } from './routes/annotationsRoutes.js';
import { getTelemetryMetadata, resolveChannelIdentifier, getChannelVariables, getVariablesByMeasurementType } from './repositories/metadataRepository.js';
import { authenticate } from '../../middleware/auth.js';
import { z } from 'zod';
import { dayjs } from '../../utils/dateUtils.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Esquema de validación para búsqueda de telemetría
const searchSchema = z.object({
    from: z.string().min(1, 'from es requerido'),
    to: z.string().min(1, 'to es requerido'),
    comparisonFrom: z.string().regex(DATE_REGEX, 'comparisonFrom debe tener formato YYYY-MM-DD').optional(),
    comparisonTo: z.string().regex(DATE_REGEX, 'comparisonTo debe tener formato YYYY-MM-DD').optional(),
    resolution: z.enum(['raw', '1m', '15m', '60m', 'daily', 'monthly']).default('1m'),
    tz: z.string().optional(),
    variables: z.array(z.number()).optional(),
    excludeDays: z.array(z.number().min(0).max(6)).optional(),
    hourRanges: z.array(z.tuple([z.string(), z.string()])).optional()
});

/**
 * Parsea timeRanges del query param formato "HH:mm-HH:mm" a tuplas [from, to]
 * @param {string|string[]} timeRangesParam - Query param de timeRanges
 * @returns {Array<[string, string]>|undefined}
 */
const parseTimeRanges = (timeRangesParam) => {
    if (!timeRangesParam) return undefined;
    const rawArr = Array.isArray(timeRangesParam) ? timeRangesParam : [timeRangesParam];
    return rawArr.map(r => {
        const [start, end] = r.split('-');
        return [start, end];
    }).filter(([s, e]) => s && e);
};

/**
 * Construye el mapa de variables en formato v1.1 del contrato
 * @param {Object} variablesMap - Mapa de variables del servicio
 * @returns {Object} Mapa de variables en formato v1.1
 */
const buildVariablesV1 = (variablesMap) => {
    const result = {};
    for (const [varId, varInfo] of Object.entries(variablesMap)) {
        const v = {
            id: Number(varId),
            name: varInfo.name,
            unit: varInfo.unit ?? null,
            column: varInfo.column,
            chartType: varInfo.chartType ?? null,
            aggregationType: varInfo.aggregationType ?? null,
            decimalPlaces: varInfo.decimalPlaces ?? 2
        };
        if (varInfo.unitScaling) {
            v.unitScaling = varInfo.unitScaling;
        }
        result[varId] = v;
    }
    return result;
};

/**
 * Formatea un timestamp como ISO 8601 con offset de timezone
 * @param {string|Date} ts - Timestamp (puede ser string ISO o Date)
 * @param {string} tz - Timezone IANA
 * @returns {string} ISO 8601 con offset (ej: 2026-03-24T08:00:00-03:00)
 */
const formatTsWithOffset = (ts, tz) => {
    return dayjs(ts).tz(tz).format('YYYY-MM-DDTHH:mm:ssZ');
};

const router = Router();


// 📄 Swagger: src/docs/swagger/telemetry.yaml -> GET /channels/:channelId/data
// Contrato v1.1: respuesta con formato metadata/variables/data
router.get('/channels/:channelId/data', authenticate, async (req, res) => {
    try {
        const { channelId } = req.params;
        const q = req.query;
        const { from, to, comparisonFrom, comparisonTo, resolution, tz } = q;

        // Parsear arrays de query params — soporte para forma bracket (?variables[]=1) y plain (?variables=1)
        const rawVariables = q['variables[]'] ?? q.variables;
        const rawExcludeDays = q['excludeDays[]'] ?? q.excludeDays;
        const rawTimeRanges = q['timeRanges[]'] ?? q.timeRanges;

        const parsedVariables = rawVariables 
            ? (Array.isArray(rawVariables) ? rawVariables.map(Number) : [Number(rawVariables)])
            : undefined;
        
        const parsedExcludeDays = rawExcludeDays
            ? (Array.isArray(rawExcludeDays) ? rawExcludeDays.map(Number) : [Number(rawExcludeDays)])
            : undefined;

        const parsedTimeRanges = parseTimeRanges(rawTimeRanges);

        // Validar parámetros
        const validation = searchSchema.safeParse({
            from,
            to,
            comparisonFrom: comparisonFrom || undefined,
            comparisonTo: comparisonTo || undefined,
            resolution: resolution || '1m',
            tz,
            variables: parsedVariables,
            excludeDays: parsedExcludeDays,
            hourRanges: parsedTimeRanges
        });

        if (!validation.success) {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Parámetros inválidos',
                    details: validation.error.errors
                }
            });
        }

        const result = await search({
            identifier: { publicCode: channelId },
            from: validation.data.from,
            to: validation.data.to,
            comparisonFrom: validation.data.comparisonFrom || null,
            comparisonTo: validation.data.comparisonTo || null,
            resolution: validation.data.resolution,
            tz: validation.data.tz,
            variables: validation.data.variables,
            filters: {
                excludeDays: validation.data.excludeDays,
                hourRanges: validation.data.hourRanges
            }
        });

        // Timezone efectivo = tz param si se pasó, sino el del dispositivo
        const effectiveTz = validation.data.tz || result.metadata.timezone;

        // Construir respuesta v1.1
        const variablesV1 = buildVariablesV1(result.variables);

        // Helper para transformar filas: omitir valores null y usar timestamps con offset
        const transformRows = (rows) => rows.map(row => {
            const values = {};
            for (const [varId, value] of Object.entries(row.values)) {
                if (value !== null && value !== undefined) {
                    values[varId] = value;
                }
            }
            return {
                ts: formatTsWithOffset(row.ts, effectiveTz),
                values
            };
        });

        const dataV1 = transformRows(result.data);

        // Transformar bloque comparison si existe
        let comparisonV1 = null;
        if (result.comparison) {
            comparisonV1 = {
                period: result.comparison.period,
                label: result.comparison.label,
                totalRecords: result.comparison.totalRecords,
                data: transformRows(result.comparison.data)
            };
        }

        return res.json({
            ok: true,
            data: {
                metadata: {
                    uuid: result.metadata.uuid,
                    channelId: channelId,
                    channelName: result.metadata.channelName,
                    deviceName: result.metadata.deviceName,
                    timezone: effectiveTz,
                    resolution: result.metadata.resolution,
                    totalRecords: result.metadata.totalRecords,
                    period: {
                        from: validation.data.from,
                        to: validation.data.to
                    }
                },
                variables: variablesV1,
                data: dataV1,
                comparison: comparisonV1
            }
        });

    } catch (error) {
        console.error('Telemetry search error:', error);

        if (error.message.includes('no encontrado') || error.message.includes('not found')) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'NOT_FOUND',
                    message: error.message
                }
            });
        }

        return res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error al obtener datos de telemetría',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});


// 📄 E2 — Variables catalog por canal (contrato v1.1)
// Orden garantizado: display_order ASC NULLS LAST, variable_id ASC (igual que el query SQL)
router.get('/channels/:channelId/variables', authenticate, async (req, res) => {
    try {
        const { channelId } = req.params;

        // Resolver el canal por publicCode
        const resolved = await resolveChannelIdentifier({ publicCode: channelId });
        if (!resolved) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'NOT_FOUND',
                    message: `Canal no encontrado: ${channelId}`
                }
            });
        }

        // Obtener variables directamente del SQL para preservar display_order ASC
        // Misma estrategia que getTelemetryMetadata: fallback a tipo de medición si el canal no tiene vars explícitas
        let rows = await getChannelVariables(resolved.channelId, 'es', null);

        if (rows.length === 0) {
            // Obtener el measurementTypeId del canal para el fallback
            const channelMeta = await getTelemetryMetadata(resolved.channelId, 'es');
            if (channelMeta && channelMeta.measurementType.id) {
                rows = await getVariablesByMeasurementType(channelMeta.measurementType.id, 'es', null);
            }
        }

        // Mapear variables al formato catálogo v1.1 (orden preservado del SQL)
        const variablesList = rows.map(v => {
            const entry = {
                id: v.variable_id,
                name: v.variable_name,
                unit: v.unit ?? null,
                column: v.column_name,
                chartType: v.chart_type ?? null,
                aggregationType: v.aggregation_type ?? null,
                decimalPlaces: v.decimal_places ?? 2
            };
            if (v.unit_scaling) {
                entry.unitScaling = v.unit_scaling;
            }
            return entry;
        });

        return res.json({
            ok: true,
            data: {
                channelId,
                variables: variablesList
            }
        });

    } catch (error) {
        console.error('Channel variables error:', error);

        if (error.message.includes('no encontrado') || error.message.includes('not found') || error.message.includes('inválido')) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'NOT_FOUND',
                    message: error.message
                }
            });
        }

        return res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error al obtener variables del canal',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/telemetry.yaml -> GET /channels/:channelId/latest
router.get('/channels/:channelId/latest', async (req, res) => {
    try {
        const { channelId } = req.params;
        const { since } = req.query;

        const result = await getLatest(channelId, { since });

        return res.json({
            ok: true,
            data: result
        });

    } catch (error) {
        console.error('Telemetry latest error:', error);

        if (error.message.includes('no encontrado')) {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'NOT_FOUND',
                    message: error.message
                }
            });
        }

        return res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error al obtener último dato',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});


// 📄 Swagger: src/docs/swagger/telemetry.yaml -> POST /batch/latest
router.post('/batch/latest', async (req, res) => {
    try {
        const { channels, since } = req.body;

        // Validar que channels es un array
        if (!channels || !Array.isArray(channels)) {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Se requiere un array de canales en el body'
                }
            });
        }

        // Limitar cantidad de canales por request
        if (channels.length > 50) {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Máximo 50 canales por request batch'
                }
            });
        }

        const result = await getLatestBatch(channels, { since });

        return res.json({
            ok: true,
            data: result
        });

    } catch (error) {
        console.error('Telemetry batch error:', error);

        return res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error al obtener datos batch',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});

// Montar rutas de variables
// 📄 Swagger: src/docs/swagger/telemetry.yaml -> USE /variables
router.use('/variables', variablesRouter);

// Montar rutas de annotations por canal
router.use('/channels/:channelId/annotations', annotationsRouter);

// Exportar router y servicios
export { router as telemetryRouter };
export { search, getLatest, getLatestBatch } from './services/telemetryService.js';
export { 
    getTelemetryMetadata, 
    resolveChannelIdentifier,
    resolveChannelIdentifierWithCh,
    warmUpTelemetryCache,
    loadGlobalVariables,
    loadGlobalMeasurementTypes
} from './repositories/metadataRepository.js';
export * from './cache.js';
export * from './models/index.js';

export default router;
