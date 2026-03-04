/**
 * Rutas de Device Metadata
 * Catálogos para formularios de dispositivos
 */

import { Router } from 'express';
import * as controller from './controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

// ============================================
// GET ALL METADATA (para formularios)
// ============================================

/**
 * @route GET /devices/metadata
 * @desc Obtiene todo el metadata de dispositivos para formularios
 * @access Autenticado
 */
router.get('/metadata', authenticate, controller.getAllMetadata);

/**
 * @route POST /devices/metadata/invalidate-cache
 * @desc Invalida el caché de metadata
 * @access Admin
 */
router.post('/metadata/invalidate-cache', authenticate, requireRole(['system-admin']), controller.invalidateCache);

// ============================================
// DEVICE TYPES CRUD
// ============================================

router.get('/types', authenticate, controller.listDeviceTypes);
router.get('/types/:id', authenticate, controller.getDeviceType);
router.post('/types', authenticate, requireRole(['system-admin']), controller.createDeviceType);
router.put('/types/:id', authenticate, requireRole(['system-admin']), controller.updateDeviceType);
router.delete('/types/:id', authenticate, requireRole(['system-admin']), controller.deleteDeviceType);

// ============================================
// DEVICE BRANDS CRUD
// ============================================

router.get('/brands', authenticate, controller.listDeviceBrands);
router.get('/brands/:id', authenticate, controller.getDeviceBrand);
router.post('/brands', authenticate, requireRole(['system-admin']), controller.createDeviceBrand);
router.put('/brands/:id', authenticate, requireRole(['system-admin']), controller.updateDeviceBrand);
router.delete('/brands/:id', authenticate, requireRole(['system-admin']), controller.deleteDeviceBrand);

// ============================================
// DEVICE MODELS CRUD
// ============================================

router.get('/models', authenticate, controller.listDeviceModels);
router.get('/models/:id', authenticate, controller.getDeviceModel);
router.post('/models', authenticate, requireRole(['system-admin']), controller.createDeviceModel);
router.put('/models/:id', authenticate, requireRole(['system-admin']), controller.updateDeviceModel);
router.delete('/models/:id', authenticate, requireRole(['system-admin']), controller.deleteDeviceModel);

// ============================================
// DEVICE SERVERS CRUD
// ============================================

router.get('/servers', authenticate, controller.listDeviceServers);
router.get('/servers/:id', authenticate, controller.getDeviceServer);
router.post('/servers', authenticate, requireRole(['system-admin']), controller.createDeviceServer);
router.put('/servers/:id', authenticate, requireRole(['system-admin']), controller.updateDeviceServer);
router.delete('/servers/:id', authenticate, requireRole(['system-admin']), controller.deleteDeviceServer);

// ============================================
// DEVICE NETWORKS CRUD
// ============================================

router.get('/networks', authenticate, controller.listDeviceNetworks);
router.get('/networks/:id', authenticate, controller.getDeviceNetwork);
router.post('/networks', authenticate, requireRole(['system-admin']), controller.createDeviceNetwork);
router.put('/networks/:id', authenticate, requireRole(['system-admin']), controller.updateDeviceNetwork);
router.delete('/networks/:id', authenticate, requireRole(['system-admin']), controller.deleteDeviceNetwork);

// ============================================
// DEVICE LICENSES CRUD
// ============================================

router.get('/licenses', authenticate, controller.listDeviceLicenses);
router.get('/licenses/:id', authenticate, controller.getDeviceLicense);
router.post('/licenses', authenticate, requireRole(['system-admin']), controller.createDeviceLicense);
router.put('/licenses/:id', authenticate, requireRole(['system-admin']), controller.updateDeviceLicense);
router.delete('/licenses/:id', authenticate, requireRole(['system-admin']), controller.deleteDeviceLicense);

// ============================================
// DEVICE VALIDITY PERIODS CRUD
// ============================================

router.get('/validity-periods', authenticate, controller.listDeviceValidityPeriods);
router.get('/validity-periods/:id', authenticate, controller.getDeviceValidityPeriod);
router.post('/validity-periods', authenticate, requireRole(['system-admin']), controller.createDeviceValidityPeriod);
router.put('/validity-periods/:id', authenticate, requireRole(['system-admin']), controller.updateDeviceValidityPeriod);
router.delete('/validity-periods/:id', authenticate, requireRole(['system-admin']), controller.deleteDeviceValidityPeriod);

export default router;
