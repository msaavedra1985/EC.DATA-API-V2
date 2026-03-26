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

/**
 * Resuelve el organizationId para operaciones de escritura en el módulo resource-hierarchy.
 *
 * Lógica:
 * - Si el usuario tiene org en contexto (enforced o impersonando, canAccessAll=false):
 *   se usa req.organizationContext.id y se ignora cualquier organizationId del body.
 * - Si es system-admin en modo global (canAccessAll=true y sin org en contexto):
 *   se lee organizationId del body; si no lo provee, se lanza un error descriptivo.
 *
 * @param {Object} req - Express request
 * @returns {string} UUID de la organización a usar
 * @throws {Error} Si es system-admin global y no provee organizationId en el body
 */
const resolveRequestOrganizationId = (req) => {
    const ctx = req.organizationContext;

    if (!ctx.canAccessAll) {
        if (ctx.id) {
            return ctx.id;
        }
        const bodyOrgId = req.body.organizationId;
        if (!bodyOrgId) {
            const error = new Error(
                'Debes proporcionar organizationId en el body de la petición para crear nodos en modo multi-organización'
            );
            error.status = 400;
            error.code = 'ORGANIZATION_ID_REQUIRED_FOR_SCOPED_ADMIN';
            throw error;
        }
        return bodyOrgId;
    }

    const bodyOrgId = req.body.organizationId;
    if (!bodyOrgId) {
        const error = new Error(
            'Como system-admin en modo global debes proporcionar organizationId en el body de la petición'
        );
        error.status = 400;
        error.code = 'ORGANIZATION_ID_REQUIRED_FOR_GLOBAL_ADMIN';
        throw error;
    }

    return bodyOrgId;
};

// ============ ENDPOINTS DE NODOS ============


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> POST /nodes
router.post('/nodes',
    authenticate,
    requireRole(['system-admin', 'org-admin', 'org-manager']),
    enforceActiveOrganization,
    validate(createNodeSchema),
    async (req, res, next) => {
        try {
            const organizationId = resolveRequestOrganizationId(req);
            
            const nodeData = {
                ...req.body,
                organizationId
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> GET /nodes
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> GET /nodes/:id
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> POST /nodes/batch
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> POST /nodes/batch-create
router.post('/nodes/batch-create',
    authenticate,
    requireRole(['system-admin', 'org-admin', 'org-manager']),
    enforceActiveOrganization,
    validate(batchCreateNodesSchema),
    async (req, res, next) => {
        try {
            const organizationId = resolveRequestOrganizationId(req);
            
            // Extraer datos de auditoría
            const userId = req.user.userId;
            const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
            const userAgent = req.get('User-Agent') || 'unknown';
            
            // Llamar al servicio de creación batch
            const result = await hierarchyServices.batchCreateNodes(
                req.body,
                organizationId,
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> PUT /nodes/:id
router.put('/nodes/:id',
    authenticate,
    requireRole(['system-admin', 'org-admin', 'org-manager']),
    enforceActiveOrganization,
    validate(updateNodeSchema),
    async (req, res, next) => {
        try {
            const node = await hierarchyServices.updateNode(
                req.params.id,
                req.body,
                req.user.userId,
                req.ip,
                req.headers['user-agent'],
                req.organizationContext
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> DELETE /nodes/:id
router.delete('/nodes/:id',
    authenticate,
    requireRole(['system-admin', 'org-admin']),
    enforceActiveOrganization,
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
                req.headers['user-agent'],
                req.organizationContext
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> PATCH /nodes/:id/move
router.patch('/nodes/:id/move',
    authenticate,
    requireRole(['system-admin', 'org-admin', 'org-manager']),
    enforceActiveOrganization,
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
                req.body.displayOrder,
                req.organizationContext
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> GET /nodes/:id/children
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> GET /nodes/:id/descendants
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> GET /nodes/:id/ancestors
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> GET /tree
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> GET /tree/filter
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> GET /nodes/:id/has-category-descendants
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> GET /roots
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> POST /access
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> DELETE /access
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


// 📄 Swagger: src/docs/swagger/resource-hierarchy.yaml -> GET /access/check
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


export default router;
