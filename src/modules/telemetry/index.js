/**
 * Módulo de Telemetría - Índice principal
 * 
 * Exporta rutas, servicios y repositorios del módulo de telemetría.
 */
import { Router } from 'express';
import { search, getLatest, getLatestBatch } from './services/telemetryService.js';
import { variablesRouter } from './routes/variablesRoutes.js';
import { z } from 'zod';

// Esquema de validación para búsqueda de telemetría
const searchSchema = z.object({
    from: z.string().min(1, 'from es requerido'),
    to: z.string().min(1, 'to es requerido'),
    resolution: z.enum(['raw', '1m', '15m', '60m', 'daily', 'monthly']).default('1m'),
    tz: z.string().optional(),
    variables: z.array(z.number()).optional(),
    excludeDays: z.array(z.number().min(0).max(6)).optional(),
    hourRanges: z.array(z.tuple([z.string(), z.string()])).optional()
});

const router = Router();


// 📄 Swagger: src/docs/swagger/telemetry.yaml -> GET /channels/:channelId/data
router.get('/channels/:channelId/data', async (req, res) => {
    try {
        const { channelId } = req.params;
        const { from, to, resolution, tz, variables, excludeDays, hourRanges } = req.query;

        // Parsear arrays de query params
        const parsedVariables = variables 
            ? (Array.isArray(variables) ? variables.map(Number) : [Number(variables)])
            : undefined;
        
        const parsedExcludeDays = excludeDays
            ? (Array.isArray(excludeDays) ? excludeDays.map(Number) : [Number(excludeDays)])
            : undefined;

        // Validar parámetros
        const validation = searchSchema.safeParse({
            from,
            to,
            resolution: resolution || '1m',
            tz,
            variables: parsedVariables,
            excludeDays: parsedExcludeDays
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
            channelId,
            from: validation.data.from,
            to: validation.data.to,
            resolution: validation.data.resolution,
            tz: validation.data.tz,
            variables: validation.data.variables,
            filters: {
                excludeDays: validation.data.excludeDays,
                hourRanges: validation.data.hourRanges
            }
        });

        return res.json({
            ok: true,
            data: result
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
