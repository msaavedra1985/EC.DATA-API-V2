/**
 * Rutas de Variables de Telemetría
 * 
 * CRUD completo para gestión de variables con filtros,
 * paginación y traducciones multi-idioma.
 */
import { Router } from 'express';
import {
    listVariables,
    getVariable,
    createVariable,
    updateVariable,
    deleteVariable
} from '../services/variablesService.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Variable:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único de la variable
 *         measurement_type_id:
 *           type: integer
 *           description: ID del tipo de medición
 *         column_name:
 *           type: string
 *           description: Nombre de columna en Cassandra
 *         unit:
 *           type: string
 *           description: Unidad de medida
 *         chart_type:
 *           type: string
 *           enum: [column, spline, line, area, bar, pie, scatter, gauge, none]
 *         axis_name:
 *           type: string
 *         axis_id:
 *           type: string
 *         axis_min:
 *           type: number
 *         axis_function:
 *           type: string
 *         aggregation_type:
 *           type: string
 *           enum: [sum, avg, min, max, count, last, first, none]
 *         display_order:
 *           type: integer
 *         show_in_billing:
 *           type: boolean
 *         show_in_analysis:
 *           type: boolean
 *         is_realtime:
 *           type: boolean
 *         is_default:
 *           type: boolean
 *         is_active:
 *           type: boolean
 *         name:
 *           type: string
 *           description: Nombre traducido
 *         description:
 *           type: string
 *           description: Descripción traducida
 *         measurement_type_name:
 *           type: string
 *           description: Nombre del tipo de medición
 *         translations:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     VariableInput:
 *       type: object
 *       required:
 *         - measurementTypeId
 *         - columnName
 *         - translations
 *       properties:
 *         measurementTypeId:
 *           type: integer
 *           description: ID del tipo de medición
 *         columnName:
 *           type: string
 *           maxLength: 50
 *           description: Nombre de columna en Cassandra
 *         unit:
 *           type: string
 *           maxLength: 20
 *         chartType:
 *           type: string
 *           enum: [column, spline, line, area, bar, pie, scatter, gauge, none]
 *           default: spline
 *         axisName:
 *           type: string
 *           maxLength: 50
 *         axisId:
 *           type: string
 *           maxLength: 30
 *         axisMin:
 *           type: number
 *         axisFunction:
 *           type: string
 *           maxLength: 20
 *         aggregationType:
 *           type: string
 *           enum: [sum, avg, min, max, count, last, first, none]
 *           default: none
 *         displayOrder:
 *           type: integer
 *         showInBilling:
 *           type: boolean
 *           default: false
 *         showInAnalysis:
 *           type: boolean
 *           default: true
 *         isRealtime:
 *           type: boolean
 *           default: false
 *         isDefault:
 *           type: boolean
 *           default: false
 *         isActive:
 *           type: boolean
 *           default: true
 *         translations:
 *           type: object
 *           description: Traducciones por idioma (es requerido)
 *           additionalProperties:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 255
 *           example:
 *             es:
 *               name: Energía Activa
 *               description: Energía activa consumida en kWh
 *             en:
 *               name: Active Energy
 *               description: Active energy consumed in kWh
 */

/**
 * @swagger
 * /api/v1/telemetry/variables:
 *   get:
 *     summary: Lista variables con filtros y paginación
 *     description: |
 *       Obtiene la lista de variables de telemetría con soporte para:
 *       - Búsqueda por texto (nombre, descripción, column_name)
 *       - Filtros por tipo de medición, realtime, default, etc.
 *       - Paginación offset-based
 *       - Ordenamiento configurable
 *       
 *       Las traducciones se devuelven según el parámetro `lang`.
 *     tags:
 *       - Telemetry Variables
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: es
 *         description: Código de idioma para traducciones
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Búsqueda por nombre, descripción o column_name
 *       - in: query
 *         name: measurementTypeId
 *         schema:
 *           type: integer
 *         description: Filtrar por tipo de medición
 *       - in: query
 *         name: isRealtime
 *         schema:
 *           type: boolean
 *         description: Filtrar variables con soporte realtime
 *       - in: query
 *         name: isDefault
 *         schema:
 *           type: boolean
 *         description: Filtrar variables por defecto
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filtrar por estado activo
 *       - in: query
 *         name: showInBilling
 *         schema:
 *           type: boolean
 *         description: Filtrar por visibilidad en facturación
 *       - in: query
 *         name: showInAnalysis
 *         schema:
 *           type: boolean
 *         description: Filtrar por visibilidad en análisis
 *       - in: query
 *         name: chartType
 *         schema:
 *           type: string
 *           enum: [column, spline, line, area, bar, pie, scatter, gauge, none]
 *         description: Filtrar por tipo de gráfico
 *       - in: query
 *         name: aggregationType
 *         schema:
 *           type: string
 *           enum: [sum, avg, min, max, count, last, first, none]
 *         description: Filtrar por tipo de agregación
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Límite de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Desplazamiento para paginación
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, display_order, column_name, name, measurement_type_id, created_at, updated_at]
 *           default: display_order
 *         description: Campo de ordenamiento
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Dirección de ordenamiento
 *     responses:
 *       200:
 *         description: Lista de variables
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Variable'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       400:
 *         description: Parámetros de filtrado inválidos
 */
router.get('/', async (req, res) => {
    try {
        const result = await listVariables(req.query);

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
        console.error('Variables list error:', error);

        if (error.code === 'VALIDATION_ERROR') {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message,
                    details: error.details
                }
            });
        }

        return res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error al listar variables',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});

/**
 * @swagger
 * /api/v1/telemetry/variables/{id}:
 *   get:
 *     summary: Obtiene una variable por ID
 *     description: Retorna la variable con todas sus traducciones disponibles
 *     tags:
 *       - Telemetry Variables
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la variable
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: es
 *         description: Idioma principal para los campos name y description
 *     responses:
 *       200:
 *         description: Variable encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Variable'
 *       404:
 *         description: Variable no encontrada
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { lang = 'es' } = req.query;

        const variable = await getVariable(parseInt(id, 10), lang);

        return res.json({
            ok: true,
            data: variable
        });

    } catch (error) {
        console.error('Variable get error:', error);

        if (error.code === 'NOT_FOUND') {
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
                message: 'Error al obtener variable',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});

/**
 * @swagger
 * /api/v1/telemetry/variables:
 *   post:
 *     summary: Crea una nueva variable
 *     description: |
 *       Crea una nueva variable de telemetría con traducciones.
 *       Se requiere al menos la traducción en español (es).
 *     tags:
 *       - Telemetry Variables
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VariableInput'
 *           example:
 *             measurementTypeId: 1
 *             columnName: "e"
 *             unit: "kWh"
 *             chartType: "column"
 *             aggregationType: "sum"
 *             isRealtime: true
 *             isDefault: true
 *             displayOrder: 1
 *             translations:
 *               es:
 *                 name: "Energía Activa"
 *                 description: "Energía activa consumida"
 *               en:
 *                 name: "Active Energy"
 *                 description: "Active energy consumed"
 *     responses:
 *       201:
 *         description: Variable creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Variable'
 *       400:
 *         description: Datos inválidos o duplicado
 *       409:
 *         description: Ya existe una variable con el mismo column_name
 */
router.post('/', async (req, res) => {
    try {
        // Extraer contexto de auditoría del request
        const context = {
            userId: req.user?.id || req.user?.uuid,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent']
        };

        const variable = await createVariable(req.body, context);

        return res.status(201).json({
            ok: true,
            data: variable
        });

    } catch (error) {
        console.error('Variable create error:', error);

        if (error.code === 'VALIDATION_ERROR') {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message,
                    details: error.details
                }
            });
        }

        if (error.code === 'DUPLICATE_ERROR') {
            return res.status(409).json({
                ok: false,
                error: {
                    code: 'DUPLICATE_ERROR',
                    message: error.message
                }
            });
        }

        return res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error al crear variable',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});

/**
 * @swagger
 * /api/v1/telemetry/variables/{id}:
 *   put:
 *     summary: Actualiza una variable existente
 *     description: |
 *       Actualiza los campos de una variable y/o sus traducciones.
 *       Solo se actualizan los campos enviados en el body.
 *     tags:
 *       - Telemetry Variables
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la variable
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VariableInput'
 *           example:
 *             unit: "MWh"
 *             isRealtime: false
 *             translations:
 *               es:
 *                 name: "Energía Activa Total"
 *     responses:
 *       200:
 *         description: Variable actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Variable'
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Variable no encontrada
 *       409:
 *         description: Conflicto por duplicado de column_name
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Extraer contexto de auditoría del request
        const context = {
            userId: req.user?.id || req.user?.uuid,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent']
        };

        const variable = await updateVariable(parseInt(id, 10), req.body, context);

        return res.json({
            ok: true,
            data: variable
        });

    } catch (error) {
        console.error('Variable update error:', error);

        if (error.code === 'VALIDATION_ERROR') {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message,
                    details: error.details
                }
            });
        }

        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({
                ok: false,
                error: {
                    code: 'NOT_FOUND',
                    message: error.message
                }
            });
        }

        if (error.code === 'DUPLICATE_ERROR') {
            return res.status(409).json({
                ok: false,
                error: {
                    code: 'DUPLICATE_ERROR',
                    message: error.message
                }
            });
        }

        return res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error al actualizar variable',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});

/**
 * @swagger
 * /api/v1/telemetry/variables/{id}:
 *   delete:
 *     summary: Elimina una variable (soft delete)
 *     description: |
 *       Marca la variable como inactiva (is_active = false).
 *       La variable no se elimina físicamente de la base de datos.
 *     tags:
 *       - Telemetry Variables
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la variable
 *     responses:
 *       200:
 *         description: Variable eliminada
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
 *                     deleted:
 *                       type: boolean
 *                     id:
 *                       type: integer
 *       404:
 *         description: Variable no encontrada
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Extraer contexto de auditoría del request
        const context = {
            userId: req.user?.id || req.user?.uuid,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent']
        };

        await deleteVariable(parseInt(id, 10), context);

        return res.json({
            ok: true,
            data: {
                deleted: true,
                id: parseInt(id, 10)
            }
        });

    } catch (error) {
        console.error('Variable delete error:', error);

        if (error.code === 'NOT_FOUND') {
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
                message: 'Error al eliminar variable',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});

export { router as variablesRouter };
export default router;
