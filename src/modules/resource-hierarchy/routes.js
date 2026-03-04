// modules/resource-hierarchy/routes.js
// Rutas REST para el módulo de Resource Hierarchy (Jerarquía de Recursos)

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import * as hierarchyServices from './services.js';
import {
    createNodeSchema,
    getNodeSchema,
    updateNodeSchema,
    deleteNodeSchema,
    moveNodeSchema,
    listNodesSchema,
    getChildrenSchema,
    getDescendantsSchema,
    getAncestorsSchema,
    getTreeSchema,
    getRootsSchema,
    grantAccessSchema,
    revokeAccessSchema,
    checkAccessSchema,
    batchGetNodesSchema,
    batchCreateNodesSchema,
    getFilteredTreeSchema,
    checkCategoryDescendantsSchema
} from './dtos/index.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const hierarchyLogger = logger.child({ component: 'resource-hierarchy-routes' });

// ============ ENDPOINTS DE NODOS ============

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes:
 *   post:
 *     summary: Crear un nuevo nodo en la jerarquía
 *     description: Crea un nodo (carpeta, site o channel) en la jerarquía de recursos de una organización. Los nodos permiten organizar recursos en estructura de árbol con profundidad ilimitada.
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - node_type
 *               - name
 *             properties:
 *               organization_id:
 *                 type: string
 *                 description: Public code de la organización (opcional, usa la org activa del usuario si no se especifica)
 *                 example: "ORG-abc123xyz-1"
 *               parent_id:
 *                 type: string
 *                 nullable: true
 *                 description: Public code del nodo padre (null para nodo raíz)
 *                 example: "RES-def456ghi-2"
 *               node_type:
 *                 type: string
 *                 enum: [folder, site, channel]
 *                 description: Tipo de nodo
 *                 example: "folder"
 *               name:
 *                 type: string
 *                 description: Nombre del nodo
 *                 example: "Sensores de Temperatura"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: Descripción del nodo
 *                 example: "Carpeta para agrupar sensores de temperatura"
 *               reference_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: UUID del recurso referenciado (site o channel existente)
 *               icon:
 *                 type: string
 *                 description: Nombre del ícono (ej. folder, building, activity)
 *                 example: "folder"
 *               display_order:
 *                 type: integer
 *                 description: Orden de visualización
 *                 default: 0
 *               metadata:
 *                 type: object
 *                 description: Metadatos adicionales en formato JSON
 *     responses:
 *       201:
 *         description: Nodo creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ResourceNode'
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Organización o nodo padre no encontrado
 */
router.post('/nodes',
    authenticate,
    requireRole(['system-admin', 'org-admin', 'org-manager']),
    enforceActiveOrganization,
    validate(createNodeSchema),
    async (req, res, next) => {
        try {
            const nodeData = {
                ...req.body,
                organizationId: req.body.organizationId || req.organizationContext.id
            };
            
            const node = await hierarchyServices.createNode(
                nodeData,
                req.user.userId,
                req.ip,
                req.headers['user-agent']
            );
            
            hierarchyLogger.info({ nodeId: node.id, userId: req.user.userId }, 'Node created via API');
            
            res.status(201).json({
                ok: true,
                data: node
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes:
 *   get:
 *     summary: Listar nodos de una organización
 *     description: Obtiene lista paginada de nodos con filtros opcionales por tipo, padre, búsqueda y estado.
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Public code de la organización (opcional, usa la org activa del usuario si no se especifica)
 *       - in: query
 *         name: parent_id
 *         schema:
 *           type: string
 *         description: Filtrar por nodo padre (usar 'root' para nodos raíz)
 *       - in: query
 *         name: node_type
 *         schema:
 *           type: string
 *           enum: [folder, site, channel]
 *         description: Filtrar por tipo de nodo
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o descripción
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 500
 *         description: Límite de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset para paginación
 *     responses:
 *       200:
 *         description: Lista de nodos
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
 *                     $ref: '#/components/schemas/ResourceNode'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 */
router.get('/nodes',
    authenticate,
    enforceActiveOrganization,
    validate(listNodesSchema),
    async (req, res, next) => {
        try {
            // Usa la organización del contexto establecido por el middleware
            // Si showAll=true (God View), no filtra por organización
            const result = await hierarchyServices.listNodes(
                req.organizationContext.id,
                {
                    limit: req.query.limit,
                    offset: req.query.offset,
                    nodeType: req.query.nodeType,
                    parentId: req.query.parentId,
                    search: req.query.search,
                    isActive: req.query.isActive,
                    includeCounts: req.query.includeCounts,
                    showAll: req.organizationContext.showAll || false
                }
            );
            
            res.json({
                ok: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes/{id}:
 *   get:
 *     summary: Obtener un nodo por ID
 *     description: Obtiene los detalles de un nodo específico.
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del nodo
 *     responses:
 *       200:
 *         description: Nodo encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ResourceNode'
 *       404:
 *         description: Nodo no encontrado
 */
router.get('/nodes/:id',
    authenticate,
    validate(getNodeSchema),
    async (req, res, next) => {
        try {
            const node = await hierarchyServices.getNodeByPublicCode(req.params.id);
            
            res.json({
                ok: true,
                data: node
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes/batch:
 *   post:
 *     summary: Obtener múltiples nodos por IDs
 *     description: |
 *       Obtiene los detalles de múltiples nodos en una sola llamada. 
 *       Útil para cargar breadcrumbs o selecciones múltiples.
 *       
 *       **Nota de seguridad:** Solo retorna nodos que pertenezcan a la organización activa del usuario.
 *       Nodos de otras organizaciones son filtrados automáticamente.
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array de public codes de nodos (máximo 100)
 *                 example: ["RES-abc123-1", "RES-def456-2"]
 *               include_counts:
 *                 type: boolean
 *                 default: true
 *                 description: Incluir conteo de hijos
 *     responses:
 *       200:
 *         description: Lista de nodos encontrados (filtrados por organización activa)
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
 *                     $ref: '#/components/schemas/ResourceNode'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     requested:
 *                       type: integer
 *                       description: Cantidad de IDs solicitados
 *                     found:
 *                       type: integer
 *                       description: Cantidad de nodos encontrados (puede ser menor si hay nodos de otras orgs)
 */
router.post('/nodes/batch',
    authenticate,
    enforceActiveOrganization,
    validate(batchGetNodesSchema),
    async (req, res, next) => {
        try {
            // Usa la organización del contexto establecido por el middleware
            // Si showAll=true (God View), no filtra por organización
            const nodes = await hierarchyServices.batchGetNodes(
                req.body.ids,
                { 
                    includeCounts: req.body.includeCounts,
                    organizationId: req.organizationContext.id,
                    showAll: req.organizationContext.showAll || false
                }
            );
            
            res.json({
                ok: true,
                data: nodes,
                meta: {
                    requested: req.body.ids.length,
                    found: nodes.length
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes/batch-create:
 *   post:
 *     summary: Crear múltiples nodos en lote (soporta éxito parcial)
 *     description: |
 *       Crea múltiples nodos bajo el mismo padre y organización.
 *       
 *       **Comportamiento de éxito parcial:**
 *       - Si algunos nodos fallan (ej: duplicados), los demás se insertan correctamente
 *       - Solo falla completamente (409) si TODOS los nodos fallan
 *       - Retorna arrays separados de `inserted` y `failed` para que el frontend pueda mostrar qué funcionó y qué no
 *       
 *       **Códigos de fallo por nodo:**
 *       - `DUPLICATE_IN_BATCH`: El mismo reference_id aparece más de una vez en el batch
 *       - `ALREADY_IN_HIERARCHY`: El recurso (site/channel) ya existe en la jerarquía
 *       - `INVALID_NODE_TYPE`: Tipo de nodo no permitido para este padre
 *       
 *       **Límites:**
 *       - Máximo 50 nodos por request
 *       
 *       **Audit:** Se registra un audit log solo por cada nodo insertado exitosamente.
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nodes
 *             properties:
 *               parent_id:
 *                 type: string
 *                 nullable: true
 *                 description: Public code del nodo padre (null para nodos raíz)
 *                 example: "RES-abc123xyz-1"
 *               nodes:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 50
 *                 description: Array de nodos a crear
 *                 items:
 *                   type: object
 *                   required:
 *                     - node_type
 *                     - name
 *                   properties:
 *                     node_type:
 *                       type: string
 *                       enum: [folder, site, channel]
 *                       description: Tipo de nodo
 *                     name:
 *                       type: string
 *                       description: Nombre del nodo (1-255 caracteres)
 *                       example: "Sensor de Temperatura"
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       description: Descripción del nodo
 *                     reference_id:
 *                       type: string
 *                       nullable: true
 *                       description: Public code del recurso referenciado (ej CHN-xxx, SIT-xxx)
 *                       example: "CHN-5LYJX-4"
 *                     icon:
 *                       type: string
 *                       nullable: true
 *                       description: Nombre del ícono
 *                     color:
 *                       type: string
 *                       nullable: true
 *                       pattern: "^#[0-9A-Fa-f]{6}$"
 *                       description: Color en formato hexadecimal (#RRGGBB)
 *                       example: "#3B82F6"
 *                     display_order:
 *                       type: integer
 *                       description: Orden de visualización (auto-asignado si no se especifica)
 *                     metadata:
 *                       type: object
 *                       description: Metadatos adicionales
 *     responses:
 *       201:
 *         description: Todos los nodos creados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchCreateNodesResponse'
 *       200:
 *         description: Éxito parcial - algunos nodos insertados, otros fallaron
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchCreateNodesResponse'
 *       400:
 *         description: Error de validación del request
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Nodo padre no encontrado
 *       409:
 *         description: Todos los nodos fallaron (ninguno insertado)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "ALL_NODES_FAILED"
 *                     message:
 *                       type: string
 *                       example: "Todos los nodos fallaron al insertarse"
 *                 data:
 *                   $ref: '#/components/schemas/BatchCreateNodesResult'
 */
router.post('/nodes/batch-create',
    authenticate,
    requireRole(['system-admin', 'org-admin', 'org-manager']),
    enforceActiveOrganization,
    validate(batchCreateNodesSchema),
    async (req, res, next) => {
        try {
            // Extraer datos de auditoría
            const userId = req.user.userId;
            const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
            const userAgent = req.get('User-Agent') || 'unknown';
            
            // Llamar al servicio de creación batch
            const result = await hierarchyServices.batchCreateNodes(
                req.body,
                req.organizationContext.id,
                userId,
                ipAddress,
                userAgent
            );
            
            hierarchyLogger.info({ 
                inserted: result.meta.inserted,
                failed: result.meta.failed,
                parentId: req.body.parentId,
                userId 
            }, 'Batch create nodes completed via API');
            
            // 201 si todo se insertó, 200 si hubo éxito parcial
            const statusCode = result.meta.failed === 0 ? 201 : 200;
            
            res.status(statusCode).json({
                ok: true,
                data: result
            });
        } catch (error) {
            // Manejar error ALL_NODES_FAILED con data adjunta
            if (error.code === 'ALL_NODES_FAILED' && error.data) {
                return res.status(error.status || 409).json({
                    ok: false,
                    error: {
                        code: error.code,
                        message: error.message
                    },
                    data: error.data
                });
            }
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes/{id}:
 *   put:
 *     summary: Actualizar un nodo
 *     description: Actualiza los campos editables de un nodo (nombre, descripción, ícono, orden, metadatos).
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del nodo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *               display_order:
 *                 type: integer
 *               metadata:
 *                 type: object
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Nodo actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ResourceNode'
 *       404:
 *         description: Nodo no encontrado
 */
router.put('/nodes/:id',
    authenticate,
    requireRole(['system-admin', 'org-admin', 'org-manager']),
    validate(updateNodeSchema),
    async (req, res, next) => {
        try {
            const node = await hierarchyServices.updateNode(
                req.params.id,
                req.body,
                req.user.userId,
                req.ip,
                req.headers['user-agent']
            );
            
            hierarchyLogger.info({ nodeId: req.params.id, userId: req.user.userId }, 'Node updated via API');
            
            res.json({
                ok: true,
                data: node
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes/{id}:
 *   delete:
 *     summary: Eliminar un nodo
 *     description: |
 *       Elimina un nodo (soft delete). Si el nodo tiene hijos y no se envía cascade=true,
 *       retorna error 409 con la lista de nodos que serían afectados para que el usuario confirme.
 *       
 *       **Flujo recomendado:**
 *       1. Intentar DELETE sin cascade
 *       2. Si responde 409 (HAS_CHILDREN), mostrar al usuario los nodos afectados
 *       3. Si el usuario confirma, reintentar con cascade=true
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del nodo
 *       - in: query
 *         name: cascade
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Si true, elimina el nodo y todos sus descendientes. Si false y tiene hijos, retorna error 409.
 *     responses:
 *       200:
 *         description: Nodo(s) eliminado(s) exitosamente
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
 *                     deleted_count:
 *                       type: integer
 *                       description: Cantidad de nodos eliminados
 *                       example: 5
 *                     deleted_nodes:
 *                       type: array
 *                       description: Lista de nodos eliminados con su info básica
 *                       items:
 *                         type: object
 *                         properties:
 *                           public_code:
 *                             type: string
 *                             example: "RES-abc123-1"
 *                           name:
 *                             type: string
 *                             example: "Sensor de Temperatura"
 *                           node_type:
 *                             type: string
 *                             enum: [folder, site, channel]
 *                     cascade:
 *                       type: boolean
 *                       description: Si se usó eliminación en cascada
 *       404:
 *         description: Nodo no encontrado
 *       409:
 *         description: El nodo tiene hijos y no se confirmó cascade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "HAS_CHILDREN"
 *                     message:
 *                       type: string
 *                       example: "El nodo tiene hijos. Debe confirmar la eliminación en cascada."
 *                 data:
 *                   type: object
 *                   properties:
 *                     affected_nodes:
 *                       type: array
 *                       description: Lista de nodos hijos que serían eliminados
 *                       items:
 *                         type: object
 *                         properties:
 *                           public_code:
 *                             type: string
 *                           name:
 *                             type: string
 *                           node_type:
 *                             type: string
 *                     total_affected:
 *                       type: integer
 *                       description: Total de nodos que serían eliminados (incluyendo el nodo padre)
 */
router.delete('/nodes/:id',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    validate(deleteNodeSchema),
    async (req, res, next) => {
        try {
            // Convertir string 'true'/'false' a boolean
            const cascade = req.query.cascade === 'true' || req.query.cascade === true;
            
            const result = await hierarchyServices.deleteNode(
                req.params.id,
                cascade,
                req.user.userId,
                req.ip,
                req.headers['user-agent']
            );
            
            hierarchyLogger.info({ nodeId: req.params.id, userId: req.user.userId, ...result }, 'Node deleted via API');
            
            res.json({
                ok: true,
                data: result
            });
        } catch (error) {
            // Manejar error HAS_CHILDREN con respuesta especial
            if (error.code === 'HAS_CHILDREN') {
                return res.status(409).json({
                    ok: false,
                    error: {
                        code: error.code,
                        message: error.message
                    },
                    data: error.data
                });
            }
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes/{id}/move:
 *   patch:
 *     summary: Mover un nodo a un nuevo padre y/o cambiar su orden
 *     description: |
 *       Mueve un nodo y todos sus descendientes a una nueva ubicación en la jerarquía.
 *       Opcionalmente permite cambiar el orden de visualización (display_order) en la misma operación.
 *       
 *       **Caso de uso:** Cuando el usuario arrastra un nodo a otro padre, naturalmente quiere 
 *       especificar en qué posición dentro de los hermanos quedará. Este endpoint permite 
 *       hacer ambas cosas en un solo paso.
 *       
 *       **Validaciones:**
 *       - El nodo y nuevo padre deben existir
 *       - Deben pertenecer a la misma organización
 *       - No se puede mover un nodo a uno de sus descendientes (prevención de ciclos)
 *       - No se puede mover un nodo a sí mismo
 *       - El usuario debe tener permisos 'edit' tanto en origen como en destino (excepto admins)
 *       - Solo folders pueden moverse a la raíz (new_parent_id: null)
 *       - Channels no pueden tener hijos; sites solo aceptan channels
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del nodo a mover
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - new_parent_id
 *             properties:
 *               new_parent_id:
 *                 type: string
 *                 nullable: true
 *                 description: Public code del nuevo padre (null para mover a raíz, solo permitido para folders)
 *               display_order:
 *                 type: integer
 *                 minimum: 0
 *                 description: Nuevo orden de visualización entre hermanos (opcional)
 *                 example: 2
 *     responses:
 *       200:
 *         description: Nodo movido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ResourceNode'
 *       400:
 *         description: Movimiento inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       enum: [CYCLE_DETECTED, SELF_REFERENCE, CROSS_ORG_MOVE_NOT_ALLOWED, INVALID_MOVE_TO_ROOT, INVALID_PARENT_TYPE]
 *                     message:
 *                       type: string
 *       403:
 *         description: Permisos insuficientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       enum: [INSUFFICIENT_SOURCE_PERMISSIONS, INSUFFICIENT_DESTINATION_PERMISSIONS]
 *                     message:
 *                       type: string
 *       404:
 *         description: Nodo no encontrado
 */
router.patch('/nodes/:id/move',
    authenticate,
    requireRole(['system-admin', 'org-admin', 'org-manager']),
    validate(moveNodeSchema),
    async (req, res, next) => {
        try {
            // Los system-admin y org-admin saltan la verificación de permisos por nodo
            const isAdmin = ['system-admin', 'org-admin'].includes(req.user.role);
            
            const node = await hierarchyServices.moveNode(
                req.params.id,
                req.body.newParentId,
                req.user.userId,
                req.ip,
                req.headers['user-agent'],
                isAdmin,
                req.body.displayOrder
            );
            
            hierarchyLogger.info({ 
                nodeId: req.params.id, 
                newParent: req.body.newParentId, 
                displayOrder: req.body.displayOrder,
                userId: req.user.userId 
            }, 'Node moved via API');
            
            res.json({
                ok: true,
                data: node
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes/{id}/children:
 *   get:
 *     summary: Obtener hijos directos de un nodo
 *     description: Obtiene los nodos hijos inmediatos de un nodo específico.
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del nodo padre (usar 'root' para nodos raíz)
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code de la organización (requerido si id es 'root')
 *       - in: query
 *         name: node_type
 *         schema:
 *           type: string
 *           enum: [folder, site, channel]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Lista de nodos hijos
 */
router.get('/nodes/:id/children',
    authenticate,
    enforceActiveOrganization,
    validate(getChildrenSchema),
    async (req, res, next) => {
        try {
            // Usa la organización del contexto establecido por el middleware
            // Si showAll=true (God View), no filtra por organización
            const result = await hierarchyServices.getNodeChildren(
                req.params.id,
                req.organizationContext.id,
                {
                    limit: req.query.limit,
                    offset: req.query.offset,
                    nodeType: req.query.nodeType,
                    includeCounts: req.query.includeCounts,
                    showAll: req.organizationContext.showAll || false
                }
            );
            
            res.json({
                ok: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes/{id}/descendants:
 *   get:
 *     summary: Obtener todos los descendientes de un nodo
 *     description: Obtiene todos los nodos descendientes de un nodo usando ltree para consultas eficientes.
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del nodo ancestro
 *       - in: query
 *         name: node_type
 *         schema:
 *           type: string
 *           enum: [folder, site, channel]
 *       - in: query
 *         name: max_depth
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Profundidad máxima relativa
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 500
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Lista de nodos descendientes
 */
router.get('/nodes/:id/descendants',
    authenticate,
    validate(getDescendantsSchema),
    async (req, res, next) => {
        try {
            const result = await hierarchyServices.getNodeDescendants(
                req.params.id,
                {
                    limit: req.query.limit,
                    offset: req.query.offset,
                    nodeType: req.query.nodeType,
                    maxDepth: req.query.maxDepth
                }
            );
            
            res.json({
                ok: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes/{id}/ancestors:
 *   get:
 *     summary: Obtener ancestros de un nodo
 *     description: Obtiene la cadena de ancestros desde la raíz hasta el padre directo (breadcrumb).
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del nodo
 *     responses:
 *       200:
 *         description: Lista de ancestros ordenada desde raíz
 */
router.get('/nodes/:id/ancestors',
    authenticate,
    validate(getAncestorsSchema),
    async (req, res, next) => {
        try {
            const ancestors = await hierarchyServices.getNodeAncestors(req.params.id);
            
            res.json({
                ok: true,
                data: ancestors
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/tree:
 *   get:
 *     summary: Obtener árbol completo de una organización
 *     description: Obtiene la estructura de árbol completa o desde un nodo raíz específico.
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Public code de la organización (opcional, usa la org activa del usuario si no se especifica)
 *       - in: query
 *         name: root_id
 *         schema:
 *           type: string
 *         description: Public code del nodo raíz para subárbol
 *       - in: query
 *         name: max_depth
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Profundidad máxima del árbol
 *     responses:
 *       200:
 *         description: Árbol estructurado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ResourceNodeWithChildren'
 */
router.get('/tree',
    authenticate,
    enforceActiveOrganization,
    validate(getTreeSchema),
    async (req, res, next) => {
        try {
            // Usa la organización del contexto establecido por el middleware
            // Si showAll=true (God View), no filtra por organización
            const tree = await hierarchyServices.getTree(
                req.organizationContext.id,
                {
                    rootId: req.query.rootId,
                    maxDepth: req.query.maxDepth,
                    includeCounts: req.query.includeCounts,
                    showAll: req.organizationContext.showAll || false
                }
            );
            
            res.json({
                ok: true,
                data: tree
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/tree/filter:
 *   get:
 *     summary: Obtener árbol filtrado por categoría de asset
 *     description: |
 *       Retorna solo las ramas del árbol que contienen nodos con el tag/categoría especificado.
 *       Los nodos padres (carpetas, sites) se incluyen para mantener la estructura del árbol,
 *       pero solo aquellos que tienen descendientes con el tag.
 *       
 *       Cada nodo incluye `matches_filter: true` si coincide directamente con el filtro.
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *         description: Public code de la organización (opcional, usa la org activa)
 *       - in: query
 *         name: category_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría de asset a filtrar
 *       - in: query
 *         name: include_subcategories
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Si incluir subcategorías del tag en el filtro
 *     responses:
 *       200:
 *         description: Árbol filtrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ResourceNodeWithChildren'
 */
router.get('/tree/filter',
    authenticate,
    enforceActiveOrganization,
    validate(getFilteredTreeSchema),
    async (req, res, next) => {
        try {
            const tree = await hierarchyServices.getFilteredTree(
                req.organizationContext.id,
                req.query.categoryId,
                {
                    includeSubcategories: req.query.includeSubcategories
                }
            );
            
            res.json({
                ok: true,
                data: tree
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes/{id}/has-category-descendants:
 *   get:
 *     summary: Verificar si un nodo tiene descendientes con cierta categoría
 *     description: |
 *       Útil para lazy loading en frontend. Permite saber si al expandir un nodo
 *       habrá resultados con el filtro aplicado, sin cargar todos los descendientes.
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del nodo a verificar
 *       - in: query
 *         name: category_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría de asset
 *       - in: query
 *         name: include_subcategories
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Si incluir subcategorías del tag
 *     responses:
 *       200:
 *         description: Resultado de la verificación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 has_descendants:
 *                   type: boolean
 */
router.get('/nodes/:id/has-category-descendants',
    authenticate,
    validate(checkCategoryDescendantsSchema),
    async (req, res, next) => {
        try {
            const hasDescendants = await hierarchyServices.hasDescendantsWithCategory(
                req.params.id,
                req.query.categoryId,
                req.query.includeSubcategories
            );
            
            res.json({
                ok: true,
                hasDescendants: hasDescendants
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/roots:
 *   get:
 *     summary: Obtener nodos raíz de una organización
 *     description: Obtiene los nodos de nivel superior (sin padre) de una organización.
 *     tags: [Resource Hierarchy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Public code de la organización (opcional, usa la org activa del usuario si no se especifica)
 *       - in: query
 *         name: node_type
 *         schema:
 *           type: string
 *           enum: [folder, site, channel]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Lista de nodos raíz
 */
router.get('/roots',
    authenticate,
    enforceActiveOrganization,
    validate(getRootsSchema),
    async (req, res, next) => {
        try {
            // Usa la organización del contexto establecido por el middleware
            // Si showAll=true (God View), no filtra por organización
            const result = await hierarchyServices.getNodeChildren(
                'root',
                req.organizationContext.id,
                {
                    limit: req.query.limit,
                    offset: req.query.offset,
                    nodeType: req.query.nodeType,
                    includeCounts: req.query.includeCounts,
                    showAll: req.organizationContext.showAll || false
                }
            );
            
            res.json({
                ok: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============ ENDPOINTS DE ACCESO ============

/**
 * @swagger
 * /api/v1/resource-hierarchy/access:
 *   post:
 *     summary: Otorgar acceso a un usuario sobre un nodo
 *     description: Otorga permisos de acceso (view, edit, admin) a un usuario sobre un nodo y opcionalmente sus descendientes.
 *     tags: [Resource Hierarchy Access]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - node_id
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID del usuario
 *               node_id:
 *                 type: string
 *                 description: Public code del nodo
 *               access_type:
 *                 type: string
 *                 enum: [view, edit, admin]
 *                 default: view
 *               include_descendants:
 *                 type: boolean
 *                 default: true
 *                 description: Si el acceso aplica también a descendientes
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Fecha de expiración del acceso
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Acceso otorgado
 *       404:
 *         description: Nodo no encontrado
 */
router.post('/access',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    validate(grantAccessSchema),
    async (req, res, next) => {
        try {
            const access = await hierarchyServices.grantNodeAccess(
                req.body,
                req.user.userId,
                req.ip,
                req.headers['user-agent']
            );
            
            hierarchyLogger.info({ userId: req.body.userId, nodeId: req.body.nodeId, grantedBy: req.user.userId }, 'Access granted via API');
            
            res.json({
                ok: true,
                data: access
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/access:
 *   delete:
 *     summary: Revocar acceso de un usuario sobre un nodo
 *     description: Revoca los permisos de acceso de un usuario sobre un nodo específico.
 *     tags: [Resource Hierarchy Access]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - node_id
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               node_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Acceso revocado
 */
router.delete('/access',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    validate(revokeAccessSchema),
    async (req, res, next) => {
        try {
            const revoked = await hierarchyServices.revokeNodeAccess(
                req.body.userId,
                req.body.nodeId,
                req.user.userId,
                req.ip,
                req.headers['user-agent']
            );
            
            if (revoked) {
                hierarchyLogger.info({ userId: req.body.userId, nodeId: req.body.nodeId, revokedBy: req.user.userId }, 'Access revoked via API');
            }
            
            res.json({
                ok: true,
                data: { revoked }
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/access/check:
 *   get:
 *     summary: Verificar acceso de un usuario a un nodo
 *     description: Verifica si un usuario tiene el nivel de acceso requerido sobre un nodo, considerando herencia de permisos.
 *     tags: [Resource Hierarchy Access]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: node_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: access_type
 *         schema:
 *           type: string
 *           enum: [view, edit, admin]
 *           default: view
 *     responses:
 *       200:
 *         description: Resultado de verificación
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
 *                     has_access:
 *                       type: boolean
 */
router.get('/access/check',
    authenticate,
    validate(checkAccessSchema),
    async (req, res, next) => {
        try {
            const hasAccess = await hierarchyServices.checkNodeAccess(
                req.query.userId,
                req.query.nodeId,
                req.query.accessType || 'view'
            );
            
            res.json({
                ok: true,
                data: { hasAccess: hasAccess }
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * components:
 *   schemas:
 *     ResourceNode:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Public code del nodo
 *           example: "RES-abc123xyz-1"
 *         name:
 *           type: string
 *           example: "Sensores de Temperatura"
 *         description:
 *           type: string
 *           nullable: true
 *         node_type:
 *           type: string
 *           enum: [folder, site, channel]
 *         icon:
 *           type: string
 *         display_order:
 *           type: integer
 *         depth:
 *           type: integer
 *           description: Profundidad en el árbol (0 = raíz)
 *         parent_id:
 *           type: string
 *           nullable: true
 *         has_children:
 *           type: boolean
 *         metadata:
 *           type: object
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     ResourceNodeWithChildren:
 *       allOf:
 *         - $ref: '#/components/schemas/ResourceNode'
 *         - type: object
 *           properties:
 *             children:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ResourceNodeWithChildren'
 *     BatchCreateNodeInserted:
 *       type: object
 *       description: Nodo insertado exitosamente
 *       properties:
 *         public_code:
 *           type: string
 *           description: Código público del nodo creado
 *           example: "RES-abc123xyz-1"
 *         reference_id:
 *           type: string
 *           nullable: true
 *           description: Public code del recurso referenciado
 *           example: "CHN-5LYJX-4"
 *         node_type:
 *           type: string
 *           enum: [folder, site, channel]
 *         name:
 *           type: string
 *           example: "Medidor Principal"
 *     BatchCreateNodeFailed:
 *       type: object
 *       description: Nodo que falló al insertarse
 *       properties:
 *         reference_id:
 *           type: string
 *           nullable: true
 *           description: Public code del recurso que se intentó insertar
 *           example: "CHN-ABCDE-1"
 *         name:
 *           type: string
 *           description: Nombre del nodo que se intentó crear
 *           example: "Sensor de Humedad"
 *         reason_code:
 *           type: string
 *           description: Código del error
 *           enum: [DUPLICATE_IN_BATCH, ALREADY_IN_HIERARCHY, INVALID_NODE_TYPE, UNKNOWN_ERROR]
 *           example: "ALREADY_IN_HIERARCHY"
 *         message:
 *           type: string
 *           description: Mensaje descriptivo del error
 *           example: "Este recurso ya existe en la jerarquía"
 *     BatchCreateNodesResult:
 *       type: object
 *       description: Resultado del batch create
 *       properties:
 *         inserted:
 *           type: array
 *           description: Nodos insertados exitosamente
 *           items:
 *             $ref: '#/components/schemas/BatchCreateNodeInserted'
 *         failed:
 *           type: array
 *           description: Nodos que fallaron
 *           items:
 *             $ref: '#/components/schemas/BatchCreateNodeFailed'
 *         meta:
 *           type: object
 *           properties:
 *             requested:
 *               type: integer
 *               description: Total de nodos solicitados
 *               example: 5
 *             inserted:
 *               type: integer
 *               description: Nodos insertados exitosamente
 *               example: 3
 *             failed:
 *               type: integer
 *               description: Nodos que fallaron
 *               example: 2
 *     BatchCreateNodesResponse:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/BatchCreateNodesResult'
 */

export default router;
