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


router.get(
  '/',
  authenticate,
  enforceActiveOrganization,
  validate(getCategoriesSchema),
  async (req, res) => {
    try {
      const { scope, parentId, rootsOnly } = req.query;
      const context = req.sessionContext;

      let categories;

      if (scope === 'organization') {
        categories = await categoryServices.getOrganizationCategories(
          context.organizationId,
          { parentId: rootsOnly ? null : parentId }
        );
      } else if (scope === 'user') {
        categories = await categoryServices.getUserCategories(
          context.userId,
          { parentId: rootsOnly ? null : parentId }
        );
      } else {
        categories = await categoryServices.getAllVisibleCategories(
          context.organizationId,
          context.userId
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
        { categoryId: category.id, orgId: context.organizationId },
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
        { categoryId: category.id, userId: context.userId },
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


export default router;
