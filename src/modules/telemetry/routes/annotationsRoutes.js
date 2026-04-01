/**
 * Rutas de Annotations de Telemetría
 *
 * CRUD de anotaciones sobre puntos/rangos de tiempo en canales.
 *
 * Permisos:
 *   - GET: cualquier usuario autenticado
 *   - POST: cualquier usuario autenticado
 *   - PUT / DELETE: autor de la anotación o admin
 */
import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import {
    getAnnotations,
    postAnnotation,
    putAnnotation,
    removeAnnotation
} from '../services/annotationsService.js';

const router = Router({ mergeParams: true });

const handleError = (res, error, defaultMessage) => {
    if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
            ok: false,
            error: { code: 'NOT_FOUND', message: error.message }
        });
    }
    if (error.code === 'VALIDATION_ERROR') {
        return res.status(400).json({
            ok: false,
            error: { code: 'VALIDATION_ERROR', message: error.message }
        });
    }
    if (error.code === 'FORBIDDEN') {
        return res.status(403).json({
            ok: false,
            error: { code: 'FORBIDDEN', message: error.message }
        });
    }
    return res.status(500).json({
        ok: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: defaultMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
    });
};

/**
 * GET /api/v1/telemetry/channels/:channelId/annotations
 *
 * Devuelve las anotaciones del canal en el período especificado.
 * Las anotaciones privadas solo son visibles al autor (admins ven todas).
 *
 * Query params:
 *   from — YYYY-MM-DD o Unix ms (requerido)
 *   to   — YYYY-MM-DD o Unix ms (requerido)
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { channelId } = req.params;
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({
                ok: false,
                error: { code: 'VALIDATION_ERROR', message: 'Los parámetros from y to son requeridos' }
            });
        }

        const annotations = await getAnnotations(channelId, from, to, req.user);

        return res.json({ ok: true, data: annotations });
    } catch (error) {
        return handleError(res, error, 'Error al obtener anotaciones');
    }
});

/**
 * POST /api/v1/telemetry/channels/:channelId/annotations
 *
 * Crea una anotación en el canal.
 *
 * Body (JSON):
 *   from        — Unix ms (requerido)
 *   to          — Unix ms (requerido, puede ser igual a from para point-in-time)
 *   text        — string (requerido)
 *   category    — 'observation' | 'incident' | 'maintenance' | 'alert_auto' (default: observation)
 *   visibility  — 'public' | 'private' (default: public)
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { channelId } = req.params;
        const annotation = await postAnnotation(channelId, req.body, req.user);

        return res.status(201).json({ ok: true, data: annotation });
    } catch (error) {
        return handleError(res, error, 'Error al crear anotación');
    }
});

/**
 * PUT /api/v1/telemetry/channels/:channelId/annotations/:annotationId
 *
 * Actualiza una anotación. Solo el autor o un admin puede editarla.
 *
 * Body (JSON, todos opcionales):
 *   from, to, text, category, visibility
 */
router.put('/:annotationId', authenticate, async (req, res) => {
    try {
        const { channelId, annotationId } = req.params;
        const annotation = await putAnnotation(channelId, annotationId, req.body, req.user);

        return res.json({ ok: true, data: annotation });
    } catch (error) {
        return handleError(res, error, 'Error al actualizar anotación');
    }
});

/**
 * DELETE /api/v1/telemetry/channels/:channelId/annotations/:annotationId
 *
 * Elimina una anotación. Solo el autor o un admin puede eliminarla.
 */
router.delete('/:annotationId', authenticate, async (req, res) => {
    try {
        const { channelId, annotationId } = req.params;
        const result = await removeAnnotation(channelId, annotationId, req.user);

        return res.json({ ok: true, data: result });
    } catch (error) {
        return handleError(res, error, 'Error al eliminar anotación');
    }
});

export { router as annotationsRouter };
export default router;
