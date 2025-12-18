/**
 * Módulo de Telemetría - Índice principal
 * 
 * Exporta rutas, servicios y repositorios del módulo de telemetría.
 */
import { Router } from 'express';
import { search, getLatest } from './services/telemetryService.js';
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
 *     description: Retorna el registro más reciente disponible para visualización en tiempo real.
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
 *     responses:
 *       200:
 *         description: Último dato de telemetría
 *       404:
 *         description: Canal no encontrado
 */
router.get('/channels/:channelId/latest', async (req, res) => {
    try {
        const { channelId } = req.params;

        const result = await getLatest(channelId);

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

// Exportar router y servicios
export { router as telemetryRouter };
export { search, getLatest } from './services/telemetryService.js';
export { getTelemetryMetadata } from './repositories/metadataRepository.js';
export * from './models/index.js';

export default router;
