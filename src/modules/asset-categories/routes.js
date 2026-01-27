// modules/asset-categories/routes.js
// Rutas REST para el módulo de AssetCategory (Tags jerárquicos)

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { enforceActiveOrganization } from '../../middleware/enforceActiveOrganization.js';
import * as categoryServices from './services.js';
import {
  createOrganizationCategorySchema,
  createUserCategorySchema,
  updateCategorySchema,
  getCategoryByIdSchema,
  getCategoryTreeSchema,
  getCategoriesSchema,
  deleteCategorySchema
} from './dtos/index.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const categoryLogger = logger.child({ component: 'asset-categories' });

/**
 * @swagger
 * /api/v1/asset-categories:
 *   get:
 *     summary: Obtener todas las categorías visibles
 *     description: Retorna categorías de la organización y personales del usuario.
 *     tags: [AssetCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [organization, user, all]
 *           default: all
 *         description: Filtrar por alcance (organization, user, o all)
 *       - in: query
 *         name: parent_id
 *         schema:
 *           type: integer
 *         description: Filtrar por ID del padre (para obtener hijos directos)
 *       - in: query
 *         name: roots_only
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Obtener solo categorías raíz (sin padre)
 *     responses:
 *       200:
 *         description: Lista de categorías
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssetCategory'
 */
router.get(
  '/',
  authenticate,
  enforceActiveOrganization,
  validate(getCategoriesSchema),
  async (req, res) => {
    try {
      const { scope, parent_id, roots_only } = req.query;
      const context = req.sessionContext;

      let categories;

      if (scope === 'organization') {
        categories = await categoryServices.getOrganizationCategories(
          context.organization_id,
          { parentId: roots_only ? null : parent_id }
        );
      } else if (scope === 'user') {
        categories = await categoryServices.getUserCategories(
          context.user_id,
          { parentId: roots_only ? null : parent_id }
        );
      } else {
        categories = await categoryServices.getAllVisibleCategories(
          context.organization_id,
          context.user_id
        );
      }

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      categoryLogger.error({ error: error.message }, 'Error al obtener categorías');
      res.status(500).json({
        success: false,
        error: 'Error al obtener categorías'
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/asset-categories/organization:
 *   post:
 *     summary: Crear categoría de organización
 *     description: Crea una nueva categoría compartida para toda la organización.
 *     tags: [AssetCategories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Aire Acondicionado"
 *               color:
 *                 type: string
 *                 pattern: "^#[0-9A-Fa-f]{6}$"
 *                 example: "#3B82F6"
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *                 description: ID de la categoría padre (null para raíz)
 *     responses:
 *       201:
 *         description: Categoría creada exitosamente
 */
router.post(
  '/organization',
  authenticate,
  enforceActiveOrganization,
  requireRole(['system-admin', 'org-admin']),
  validate(createOrganizationCategorySchema),
  async (req, res) => {
    try {
      const context = req.sessionContext;
      const category = await categoryServices.createOrganizationCategory(req.body, context);

      categoryLogger.info(
        { categoryId: category.id, orgId: context.organization_id },
        'Categoría de organización creada'
      );

      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      categoryLogger.error({ error: error.message }, 'Error al crear categoría de organización');
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/asset-categories/user:
 *   post:
 *     summary: Crear categoría personal
 *     description: Crea una nueva categoría personal para el usuario actual.
 *     tags: [AssetCategories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Mis Favoritos"
 *               color:
 *                 type: string
 *                 pattern: "^#[0-9A-Fa-f]{6}$"
 *                 example: "#10B981"
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Categoría personal creada exitosamente
 */
router.post(
  '/user',
  authenticate,
  enforceActiveOrganization,
  validate(createUserCategorySchema),
  async (req, res) => {
    try {
      const context = req.sessionContext;
      const category = await categoryServices.createUserCategory(req.body, context);

      categoryLogger.info(
        { categoryId: category.id, userId: context.user_id },
        'Categoría personal creada'
      );

      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      categoryLogger.error({ error: error.message }, 'Error al crear categoría personal');
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/asset-categories/{id}:
 *   get:
 *     summary: Obtener categoría por ID
 *     description: Retorna una categoría específica si el usuario tiene acceso.
 *     tags: [AssetCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría
 *     responses:
 *       200:
 *         description: Categoría encontrada
 *       404:
 *         description: Categoría no encontrada o sin acceso
 */
router.get(
  '/:id',
  authenticate,
  enforceActiveOrganization,
  validate(getCategoryByIdSchema),
  async (req, res) => {
    try {
      const context = req.sessionContext;
      const category = await categoryServices.getCategoryById(req.params.id, context);

      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Categoría no encontrada'
        });
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      categoryLogger.error({ error: error.message }, 'Error al obtener categoría');
      res.status(500).json({
        success: false,
        error: 'Error al obtener categoría'
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/asset-categories/{id}/tree:
 *   get:
 *     summary: Obtener árbol jerárquico de una categoría
 *     description: Retorna ancestros, categoría actual, descendientes y breadcrumb.
 *     tags: [AssetCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Árbol de la categoría
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ancestors:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssetCategory'
 *                 current:
 *                   $ref: '#/components/schemas/AssetCategory'
 *                 descendants:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssetCategory'
 *                 breadcrumb:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 */
router.get(
  '/:id/tree',
  authenticate,
  enforceActiveOrganization,
  validate(getCategoryTreeSchema),
  async (req, res) => {
    try {
      const context = req.sessionContext;
      const tree = await categoryServices.getCategoryTree(req.params.id, context);

      if (!tree) {
        return res.status(404).json({
          success: false,
          error: 'Categoría no encontrada'
        });
      }

      res.json({
        success: true,
        data: tree
      });
    } catch (error) {
      categoryLogger.error({ error: error.message }, 'Error al obtener árbol de categoría');
      res.status(500).json({
        success: false,
        error: 'Error al obtener árbol de categoría'
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/asset-categories/{id}:
 *   put:
 *     summary: Actualizar categoría
 *     description: Actualiza nombre, color o padre de una categoría.
 *     tags: [AssetCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               color:
 *                 type: string
 *                 pattern: "^#[0-9A-Fa-f]{6}$"
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Categoría actualizada
 *       404:
 *         description: Categoría no encontrada
 */
router.put(
  '/:id',
  authenticate,
  enforceActiveOrganization,
  validate(updateCategorySchema),
  async (req, res) => {
    try {
      const context = req.sessionContext;
      const category = await categoryServices.updateCategory(req.params.id, req.body, context);

      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Categoría no encontrada o sin permisos'
        });
      }

      categoryLogger.info({ categoryId: req.params.id }, 'Categoría actualizada');

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      categoryLogger.error({ error: error.message }, 'Error al actualizar categoría');
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/asset-categories/{id}:
 *   delete:
 *     summary: Desactivar categoría (soft delete)
 *     description: Desactiva la categoría y todos sus descendientes.
 *     tags: [AssetCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Categoría desactivada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 deactivated:
 *                   type: integer
 *                   description: Número de categorías desactivadas (incluye descendientes)
 */
router.delete(
  '/:id',
  authenticate,
  enforceActiveOrganization,
  validate(deleteCategorySchema),
  async (req, res) => {
    try {
      const context = req.sessionContext;
      const result = await categoryServices.deactivateCategory(req.params.id, context);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: 'Categoría no encontrada o sin permisos'
        });
      }

      categoryLogger.info(
        { categoryId: req.params.id, deactivated: result.deactivated },
        'Categoría desactivada'
      );

      res.json({
        success: true,
        message: 'Categoría desactivada exitosamente',
        deactivated: result.deactivated
      });
    } catch (error) {
      categoryLogger.error({ error: error.message }, 'Error al desactivar categoría');
      res.status(500).json({
        success: false,
        error: 'Error al desactivar categoría'
      });
    }
  }
);

/**
 * @swagger
 * components:
 *   schemas:
 *     AssetCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID de la categoría
 *         name:
 *           type: string
 *           description: Nombre de la categoría
 *         color:
 *           type: string
 *           description: Color hexadecimal para UI
 *         level:
 *           type: integer
 *           description: Nivel de profundidad (1=raíz)
 *         path:
 *           type: string
 *           description: Ruta materializada (ej /1/5/12/)
 *         parent_id:
 *           type: integer
 *           nullable: true
 *           description: ID del padre (null si es raíz)
 *         scope:
 *           type: string
 *           enum: [organization, user]
 *           description: Alcance de la categoría
 *         is_active:
 *           type: boolean
 *         parent:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             color:
 *               type: string
 *             level:
 *               type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

export default router;
