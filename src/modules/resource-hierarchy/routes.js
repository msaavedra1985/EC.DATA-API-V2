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
    batchGetNodesSchema
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
            // Usa organization_id del body (para system-admin) o del middleware (org activa)
            const nodeData = {
                ...req.body,
                organization_id: req.body.organization_id || req.query.organization_id
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
            // El middleware ya setea req.query.organization_id con la org activa
            const result = await hierarchyServices.listNodes(
                req.query.organization_id,
                {
                    limit: req.query.limit,
                    offset: req.query.offset,
                    nodeType: req.query.node_type,
                    parentId: req.query.parent_id,
                    search: req.query.search,
                    isActive: req.query.is_active,
                    includeCounts: req.query.include_counts
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
            // El middleware ya setea req.body.organization_id con la org activa
            const nodes = await hierarchyServices.batchGetNodes(
                req.body.ids,
                { 
                    includeCounts: req.body.include_counts,
                    organizationId: req.body.organization_id
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
 *     description: Elimina un nodo (soft delete). Por defecto elimina también todos los descendientes.
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
 *           default: true
 *         description: Si eliminar también los descendientes
 *     responses:
 *       200:
 *         description: Nodo eliminado
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
 *                     cascade:
 *                       type: boolean
 *       404:
 *         description: Nodo no encontrado
 */
router.delete('/nodes/:id',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    validate(deleteNodeSchema),
    async (req, res, next) => {
        try {
            const result = await hierarchyServices.deleteNode(
                req.params.id,
                req.query.cascade,
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
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/resource-hierarchy/nodes/{id}/move:
 *   patch:
 *     summary: Mover un nodo a un nuevo padre
 *     description: Mueve un nodo y todos sus descendientes a una nueva ubicación en la jerarquía.
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
 *                 description: Public code del nuevo padre (null para mover a raíz)
 *     responses:
 *       200:
 *         description: Nodo movido exitosamente
 *       400:
 *         description: Movimiento inválido (ej. mover a descendiente)
 *       404:
 *         description: Nodo no encontrado
 */
router.patch('/nodes/:id/move',
    authenticate,
    requireRole(['system-admin', 'org-admin', 'org-manager']),
    validate(moveNodeSchema),
    async (req, res, next) => {
        try {
            const node = await hierarchyServices.moveNode(
                req.params.id,
                req.body.new_parent_id,
                req.user.userId,
                req.ip,
                req.headers['user-agent']
            );
            
            hierarchyLogger.info({ nodeId: req.params.id, newParent: req.body.new_parent_id, userId: req.user.userId }, 'Node moved via API');
            
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
    validate(getChildrenSchema),
    async (req, res, next) => {
        try {
            const result = await hierarchyServices.getNodeChildren(
                req.params.id,
                req.query.organization_id,
                {
                    limit: req.query.limit,
                    offset: req.query.offset,
                    nodeType: req.query.node_type,
                    includeCounts: req.query.include_counts
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
                    nodeType: req.query.node_type,
                    maxDepth: req.query.max_depth
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
            // El middleware ya setea req.query.organization_id con la org activa
            const tree = await hierarchyServices.getTree(
                req.query.organization_id,
                {
                    rootId: req.query.root_id,
                    maxDepth: req.query.max_depth,
                    includeCounts: req.query.include_counts
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
            // El middleware ya setea req.query.organization_id con la org activa
            const result = await hierarchyServices.getNodeChildren(
                'root',
                req.query.organization_id,
                {
                    limit: req.query.limit,
                    offset: req.query.offset,
                    nodeType: req.query.node_type,
                    includeCounts: req.query.include_counts
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
            
            hierarchyLogger.info({ userId: req.body.user_id, nodeId: req.body.node_id, grantedBy: req.user.userId }, 'Access granted via API');
            
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
                req.body.user_id,
                req.body.node_id,
                req.user.userId,
                req.ip,
                req.headers['user-agent']
            );
            
            if (revoked) {
                hierarchyLogger.info({ userId: req.body.user_id, nodeId: req.body.node_id, revokedBy: req.user.userId }, 'Access revoked via API');
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
                req.query.user_id,
                req.query.node_id,
                req.query.access_type || 'view'
            );
            
            res.json({
                ok: true,
                data: { has_access: hasAccess }
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
 */

export default router;
