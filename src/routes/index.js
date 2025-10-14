// Centralizador de rutas de todos los módulos
import express from 'express';
import healthRouter from '../modules/health/index.js';
import authRouter from '../modules/auth/index.js';
import seedRouter from '../modules/seed/index.js';
import organizationsRouter from '../modules/organizations/index.js';
import errorLogsRouter from '../modules/error-logs/index.js';

const router = express.Router();

/**
 * Rutas principales de la API v1
 * Cada módulo expone su router desde su index.js
 */

// Health check
router.use('/health', healthRouter);

// Auth (Fase 2)
router.use('/auth', authRouter);

// Organizations (Fase 2)
router.use('/organizations', organizationsRouter);

// Error Logs (público - sin autenticación requerida)
router.use('/error-logs', errorLogsRouter);

// Seeding (Testing/Development)
router.use('/seed', seedRouter);

// Tenants (Fase 3+)
// router.use('/tenants', tenantsRouter);

// Sites (Fase 3+)
// router.use('/sites', sitesRouter);

// Bills (Fase 3+)
// router.use('/bills', billsRouter);

export default router;
