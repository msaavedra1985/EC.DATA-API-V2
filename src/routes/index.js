// Centralizador de rutas de todos los módulos
import express from 'express';
import healthRouter from '../modules/health/index.js';

const router = express.Router();

/**
 * Rutas principales de la API v1
 * Cada módulo expone su router desde su index.js
 */

// Health check
router.use('/health', healthRouter);

// Auth (Fase 2)
// router.use('/auth', authRouter);

// Tenants (Fase 3+)
// router.use('/tenants', tenantsRouter);

// Sites (Fase 3+)
// router.use('/sites', sitesRouter);

// Bills (Fase 3+)
// router.use('/bills', billsRouter);

export default router;
