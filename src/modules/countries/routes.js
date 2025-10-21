import express from 'express';
import * as countryServices from './services.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const countriesLogger = logger.child({ component: 'countries' });

/**
 * @swagger
 * /api/v1/countries:
 *   get:
 *     summary: Listar países activos con traducciones
 *     description: Obtiene lista de países activos con nombres traducidos. Respeta el idioma del usuario y permite override con query param lang.
 *     tags: [Countries]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Código de idioma para traducciones (es, en). Si no se proporciona, usa el idioma del request (req.language)
 *         schema:
 *           type: string
 *           enum: [es, en]
 *           example: "es"
 *     responses:
 *       200:
 *         description: Lista de países obtenida exitosamente
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 276
 *                       iso_alpha2:
 *                         type: string
 *                         example: "AR"
 *                       iso_alpha3:
 *                         type: string
 *                         example: "ARG"
 *                       phone_code:
 *                         type: string
 *                         example: "+54"
 *                       name:
 *                         type: string
 *                         example: "Argentina"
 *                 lang:
 *                   type: string
 *                   example: "es"
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res) => {
    try {
        // Determinar idioma: query param > req.language (del middleware i18n) > default 'es'
        const lang = req.query.lang || req.language || 'es';
        
        // Validar idioma (solo es, en soportados por ahora)
        const validLangs = ['es', 'en'];
        const selectedLang = validLangs.includes(lang) ? lang : 'es';
        
        countriesLogger.debug('Fetching countries', { lang: selectedLang });
        
        // Obtener países con caché
        const countries = await countryServices.getCountriesWithCache(selectedLang);
        
        res.status(200).json({
            ok: true,
            data: countries,
            lang: selectedLang
        });
    } catch (error) {
        countriesLogger.error('Error fetching countries', { 
            error: error.message,
            stack: error.stack 
        });
        
        res.status(500).json({
            ok: false,
            error: req.__('errors.INTERNAL_ERROR') || 'Error interno del servidor'
        });
    }
});

export default router;
