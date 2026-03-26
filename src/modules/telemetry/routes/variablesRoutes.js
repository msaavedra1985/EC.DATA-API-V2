/**
 * Rutas de Variables de Telemetría
 * 
 * CRUD completo para gestión del diccionario de variables.
 * 
 * Permisos:
 *   - GET: cualquier usuario autenticado
 *   - POST / PUT / DELETE: solo system-admin
 */
import { Router } from 'express';
import { authenticate, requireRole } from '../../../middleware/auth.js';
import {
    listVariables,
    getVariable,
    createVariable,
    updateVariable,
    deleteVariable
} from '../services/variablesService.js';

const router = Router();

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Extrae el contexto de auditoría del request para logAuditAction
 */
const getAuditContext = (req) => ({
    userId: req.user?.id,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
});

/**
 * Maneja errores de servicio y responde con el código HTTP correspondiente
 */
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
            error: { code: 'VALIDATION_ERROR', message: error.message, details: error.details }
        });
    }
    if (error.code === 'DUPLICATE_ERROR') {
        return res.status(409).json({
            ok: false,
            error: { code: 'DUPLICATE_ERROR', message: error.message }
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

// ─── Endpoints ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/telemetry/variables
 * 
 * Lista variables con filtros opcionales y paginación.
 * 
 * Query params:
 *   lang             — idioma de traducción (default: 'es')
 *   include_inactive — incluir inactivas (default: false)
 *   with_translations — incluir objeto completo de traducciones por idioma (default: false)
 *   search           — búsqueda por nombre, descripción o column_name
 *   measurement_type_id — filtrar por tipo de medición
 *   is_realtime      — filtrar por soporte realtime
 *   is_default       — filtrar por variable por defecto
 *   show_in_billing  — filtrar por visibilidad en facturación
 *   show_in_analysis — filtrar por visibilidad en análisis
 *   chart_type       — filtrar por tipo de gráfico
 *   aggregation_type — filtrar por tipo de agregación
 *   page / limit / offset / sort_by / sort_order
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            lang: req.query.lang,
            includeInactive: req.query.include_inactive,
            withTranslations: req.query.with_translations,
            search: req.query.search,
            measurementTypeId: req.query.measurement_type_id,
            isRealtime: req.query.is_realtime,
            isDefault: req.query.is_default,
            showInBilling: req.query.show_in_billing,
            showInAnalysis: req.query.show_in_analysis,
            chartType: req.query.chart_type,
            aggregationType: req.query.aggregation_type,
            page: req.query.page,
            limit: req.query.limit,
            offset: req.query.offset,
            sortBy: req.query.sort_by,
            sortOrder: req.query.sort_order
        };

        // Eliminar claves undefined para no interferir con defaults de Zod
        Object.keys(filters).forEach(k => filters[k] === undefined && delete filters[k]);

        const result = await listVariables(filters);

        return res.json({
            ok: true,
            data: result.items,
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit
            }
        });

    } catch (error) {
        return handleError(res, error, 'Error al listar variables');
    }
});

/**
 * GET /api/v1/telemetry/variables/:id
 * 
 * Detalle de una variable con todas las traducciones disponibles.
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const lang = req.query.lang || 'es';

        if (isNaN(id)) {
            return res.status(400).json({
                ok: false,
                error: { code: 'VALIDATION_ERROR', message: 'El ID debe ser un número entero' }
            });
        }

        const variable = await getVariable(id, lang);

        return res.json({ ok: true, data: variable });

    } catch (error) {
        return handleError(res, error, 'Error al obtener variable');
    }
});

/**
 * POST /api/v1/telemetry/variables
 * 
 * Crea una nueva variable. Requiere rol system-admin.
 * 
 * Body (JSON):
 *   code            — string snake_case único (requerido, inmutable)
 *   measurementTypeId — integer (requerido)
 *   columnName      — string (requerido) — columna en Cassandra
 *   unit            — string
 *   chartType       — enum: column | spline | line | area | bar | pie | scatter | gauge | none
 *   axisName        — string
 *   axisId          — string
 *   axisMin         — number
 *   axisFunction    — string
 *   aggregationType — enum: sum | avg | min | max | count | last | first | none
 *   displayOrder    — integer
 *   showInBilling   — boolean (default: false)
 *   showInAnalysis  — boolean (default: true)
 *   isRealtime      — boolean (default: false)
 *   isDefault       — boolean (default: false)
 *   decimalPlaces   — integer (default: 2)
 *   icon            — string (nombre de ícono lucide/heroicons)
 *   color           — string hex (ej: #3B82F6)
 *   isActive        — boolean (default: true)
 *   translations    — objeto { es: { name, description }, en: { name, description } }
 *                     Requiere al menos traducción 'es'
 */
router.post('/', authenticate, requireRole(['system-admin']), async (req, res) => {
    try {
        const variable = await createVariable(req.body, getAuditContext(req));

        return res.status(201).json({ ok: true, data: variable });

    } catch (error) {
        return handleError(res, error, 'Error al crear variable');
    }
});

/**
 * PUT /api/v1/telemetry/variables/:id
 * 
 * Actualiza una variable existente. Requiere rol system-admin.
 * 
 * El campo `code` es inmutable — no se puede editar una vez creado.
 * Todos los demás campos son opcionales (patch parcial).
 */
router.put('/:id', authenticate, requireRole(['system-admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return res.status(400).json({
                ok: false,
                error: { code: 'VALIDATION_ERROR', message: 'El ID debe ser un número entero' }
            });
        }

        const variable = await updateVariable(id, req.body, getAuditContext(req));

        return res.json({ ok: true, data: variable });

    } catch (error) {
        return handleError(res, error, 'Error al actualizar variable');
    }
});

/**
 * DELETE /api/v1/telemetry/variables/:id
 * 
 * Soft-delete: setea is_active = false. Requiere rol system-admin.
 * 
 * Para reactivar una variable usar PUT /:id con { isActive: true }.
 */
router.delete('/:id', authenticate, requireRole(['system-admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return res.status(400).json({
                ok: false,
                error: { code: 'VALIDATION_ERROR', message: 'El ID debe ser un número entero' }
            });
        }

        await deleteVariable(id, getAuditContext(req));

        return res.json({
            ok: true,
            data: { deleted: true, id }
        });

    } catch (error) {
        return handleError(res, error, 'Error al eliminar variable');
    }
});

export { router as variablesRouter };
export default router;
