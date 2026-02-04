/**
 * Controller de Device Metadata
 * Maneja endpoints de catálogos de dispositivos
 */

import * as services from './services.js';
import logger from '../../utils/logger.js';

/**
 * GET /devices/metadata
 * Obtiene todo el metadata de dispositivos para formularios
 */
export const getAllMetadata = async (req, res) => {
    try {
        const lang = req.query.lang || req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'es';
        
        const metadata = await services.getAllMetadata(lang);

        return res.json({
            success: true,
            data: metadata
        });
    } catch (error) {
        logger.error('Error obteniendo device metadata', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

/**
 * POST /devices/metadata/invalidate-cache
 * Invalida el caché de metadata (solo admin)
 */
export const invalidateCache = async (req, res) => {
    try {
        const { lang } = req.body;
        
        await services.invalidateCache(lang || null);

        return res.json({
            success: true,
            message: 'Caché invalidado correctamente'
        });
    } catch (error) {
        logger.error('Error invalidando cache de device metadata', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};
