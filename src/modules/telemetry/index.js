/**
 * Módulo de Telemetría - Índice principal
 * 
 * Exporta rutas, servicios y repositorios del módulo de telemetría.
 */
import { Router } from 'express';
import { search, getLatest, getLatestBatch } from './services/telemetryService.js';
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

/**
 * @swagger
 * /api/v1/telemetry/channels/{channelId}/data:
 *   get:
 *     summary: Obtiene datos de telemetría de un canal
 *     description: |
 *       Consulta datos históricos de mediciones de un canal específico.
 *       Los datos se obtienen de Cassandra y se procesan según los filtros indicados.
 *     tags:
 *       - Telemetry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del canal (UUID o public_code)
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha inicio (ISO 8601 o YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha fin (ISO 8601 o YYYY-MM-DD)
 *       - in: query
 *         name: resolution
 *         schema:
 *           type: string
 *           enum: [raw, 1m, 15m, 60m, daily, monthly]
 *           default: 1m
 *         description: Resolución temporal de los datos
 *       - in: query
 *         name: tz
 *         schema:
 *           type: string
 *         description: Timezone objetivo (IANA format)
 *       - in: query
 *         name: variables
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         description: IDs de variables específicas a consultar
 *       - in: query
 *         name: excludeDays
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *             minimum: 0
 *             maximum: 6
 *         description: Días de la semana a excluir (0=Domingo, 6=Sábado)
 *     responses:
 *       200:
 *         description: Datos de telemetría
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         uuid:
 *                           type: string
 *                         timezone:
 *                           type: string
 *                         deviceName:
 *                           type: string
 *                         channelName:
 *                           type: string
 *                         resolution:
 *                           type: string
 *                         totalRecords:
 *                           type: integer
 *                     variables:
 *                       type: object
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           unit:
 *                             type: string
 *                           column:
 *                             type: string
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           ts:
 *                             type: string
 *                             format: date-time
 *                           values:
 *                             type: object
 *                             additionalProperties:
 *                               type: number
 *       400:
 *         description: Parámetros inválidos
 *       404:
 *         description: Canal no encontrado
 *       500:
 *         description: Error interno del servidor
 */
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

/**
 * @swagger
 * /api/v1/telemetry/channels/{channelId}/latest:
 *   get:
 *     summary: Obtiene el último dato de telemetría de un canal
 *     description: |
 *       Retorna el registro más reciente disponible para pseudo-realtime/polling.
 *       
 *       **Optimización de polling con `since`:**
 *       - Si se proporciona `since` y no hay datos más nuevos → retorna `hasNew: false`
 *       - Si hay datos nuevos → retorna los datos completos con `hasNew: true`
 *       - Reduce transferencia de datos en polling frecuente
 *     tags:
 *       - Telemetry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del canal (UUID, public_code CHN-XXXXX-X)
 *       - in: query
 *         name: since
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: |
 *           ISO timestamp del último dato que tiene el cliente.
 *           Si el dato más reciente no es más nuevo, retorna hasNew: false.
 *         example: "2024-12-22T14:30:00.000Z"
 *     responses:
 *       200:
 *         description: Último dato de telemetría o indicador de sin cambios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasNew:
 *                       type: boolean
 *                       description: Si hay datos nuevos respecto a `since`
 *                     lastChecked:
 *                       type: string
 *                       format: date-time
 *                     metadata:
 *                       type: object
 *                     variables:
 *                       type: object
 *                     data:
 *                       type: object
 *                       nullable: true
 *       404:
 *         description: Canal no encontrado
 */
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

/**
 * @swagger
 * /api/v1/telemetry/batch/latest:
 *   post:
 *     summary: Obtiene últimos datos de múltiples canales en paralelo
 *     description: |
 *       Ejecuta consultas en paralelo para máximo rendimiento.
 *       Cada canal consulta todas sus variables en una sola query Cassandra.
 *       Ideal para dashboards con múltiples sensores.
 *       
 *       **Tipos de identificador soportados:**
 *       - `publicCode`: "CHN-5Q775-2" (para frontend)
 *       - `channelUuid`: UUID de PostgreSQL (para cron)
 *       - `deviceChannel`: { deviceCode: "DEV-XXXXX-X", ch: 1 } (para batch)
 *     tags:
 *       - Telemetry
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channels
 *             properties:
 *               channels:
 *                 type: array
 *                 description: Array de identificadores de canal
 *                 maxItems: 50
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                       description: public_code del canal
 *                     - type: object
 *                       properties:
 *                         publicCode:
 *                           type: string
 *                         channelUuid:
 *                           type: string
 *                         deviceChannel:
 *                           type: object
 *                           properties:
 *                             deviceCode:
 *                               type: string
 *                             ch:
 *                               type: integer
 *                 example: ["CHN-5Q775-2", "CHN-7B3R2-8", "CHN-4K9P1-3"]
 *               since:
 *                 type: string
 *                 format: date-time
 *                 description: ISO timestamp para optimización de polling
 *     responses:
 *       200:
 *         description: Resultados de todos los canales
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     batchMeta:
 *                       type: object
 *                       properties:
 *                         totalChannels:
 *                           type: integer
 *                         successCount:
 *                           type: integer
 *                         withNewData:
 *                           type: integer
 *                         elapsedMs:
 *                           type: integer
 *                           description: Tiempo total de ejecución en ms
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Parámetros inválidos
 */
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
