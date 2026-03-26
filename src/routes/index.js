// Centralizador de rutas de todos los módulos
import express from 'express';
import healthRouter from '../modules/health/index.js';
import authRouter from '../modules/auth/index.js';
import seedRouter from '../modules/seed/index.js';
import organizationsRouter from '../modules/organizations/index.js';
import usersRouter from '../modules/users/index.js';
import rolesRouter from '../modules/roles/index.js';
import errorLogsRouter from '../modules/error-logs/index.js';
import countriesRouter from '../modules/countries/index.js';
import locationsRouter from '../modules/locations/index.js';
import sitesRouter from '../modules/sites/index.js';
import devicesRouter from '../modules/devices/index.js';
import channelsRouter from '../modules/channels/index.js';
import filesRouter from '../modules/files/index.js';
import telemetryRouter from '../modules/telemetry/index.js';
import resourceHierarchyRouter from '../modules/resource-hierarchy/index.js';
import assetCategoriesRouter from '../modules/asset-categories/index.js';
import { dashboardRouter, groupRouter } from '../modules/dashboards/index.js';
import { realtimeRouter } from '../modules/realtime/index.js';
import schedulesRouter from '../modules/schedules/index.js';

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

// Users (Fase 2)
router.use('/users', usersRouter);

// Roles (público - datos de referencia para formularios)
router.use('/roles', rolesRouter);

// Countries (público - datos de referencia)
router.use('/countries', countriesRouter);

// Locations (público - estados y ciudades)
router.use('/locations', locationsRouter);

// Error Logs (público - sin autenticación requerida)
router.use('/error-logs', errorLogsRouter);

// Sites (locaciones físicas de organizaciones)
router.use('/sites', sitesRouter);

// Devices (dispositivos IoT/Edge)
router.use('/devices', devicesRouter);

// Channels (canales de comunicación de dispositivos)
router.use('/channels', channelsRouter);

// Files (gestión centralizada de archivos - Azure Blob Storage)
router.use('/files', filesRouter);

// Telemetry (datos de mediciones IoT desde Cassandra)
router.use('/telemetry', telemetryRouter);

// Resource Hierarchy (jerarquía de recursos organizacionales)
router.use('/resource-hierarchy', resourceHierarchyRouter);

// Asset Categories (tags jerárquicos para clasificar canales)
router.use('/asset-categories', assetCategoriesRouter);

// Dashboards (dashboards multi-página con widgets y analytics)
router.use('/dashboards', dashboardRouter);

// Dashboard Groups (agrupaciones/playlists de dashboards)
router.use('/dashboard-groups', groupRouter);

// Realtime (WebSocket token + status)
router.use('/realtime', realtimeRouter);

// Schedules (Motor de Horarios para facturación y analítica)
router.use('/schedules', schedulesRouter);

// Seeding (Testing/Development)
router.use('/seed', seedRouter);

// Tenants (Fase 3+)
// router.use('/tenants', tenantsRouter);

// Bills (Fase 3+)
// router.use('/bills', billsRouter);

export default router;
