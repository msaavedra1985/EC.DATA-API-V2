/**
 * Rutas de Device Metadata
 * Catálogos para formularios de dispositivos
 */

import { Router } from 'express';
import * as controller from './controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

/**
 * @route GET /devices/metadata
 * @desc Obtiene todo el metadata de dispositivos para formularios
 * @access Autenticado
 * @query {string} lang - Código de idioma (es, en). Default: es o Accept-Language header
 * @returns {Object} - Catálogos: device_types, brands, models, servers, networks, licenses, validity_periods
 */
router.get('/metadata', authenticate, controller.getAllMetadata);

/**
 * @route POST /devices/metadata/invalidate-cache
 * @desc Invalida el caché de metadata
 * @access Admin
 * @body {string} [lang] - Idioma específico a invalidar, o null para todos
 */
router.post('/metadata/invalidate-cache', authenticate, controller.invalidateCache);

export default router;
