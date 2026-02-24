import express from 'express';
import * as locationServices from './services.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const locationsLogger = logger.child({ component: 'locations' });

/**
 * @swagger
 * /api/v1/locations:
 *   get:
 *     summary: Información del módulo de ubicaciones
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: Mensaje informativo
 */
router.get('/', (req, res) => {
    res.status(200).json({
        ok: true,
        message: 'Módulo de ubicaciones - Use /countries/:countryCode/states o /states/:stateCode/cities'
    });
});

/**
 * @swagger
 * /api/v1/locations/countries/{countryCode}/states:
 *   get:
 *     summary: Listar estados/provincias de un país
 *     description: Obtiene lista de estados activos de un país con nombres traducidos.
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: countryCode
 *         required: true
 *         description: Código ISO alpha-2 del país (ej: MX, AR, US)
 *         schema:
 *           type: string
 *           example: "MX"
 *       - in: query
 *         name: lang
 *         description: Código de idioma para traducciones (es, en)
 *         schema:
 *           type: string
 *           enum: [es, en]
 *           example: "es"
 *     responses:
 *       200:
 *         description: Lista de estados obtenida exitosamente
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
 *                       code:
 *                         type: string
 *                         example: "MX-AGU"
 *                       stateCode:
 *                         type: string
 *                         example: "AGU"
 *                       countryCode:
 *                         type: string
 *                         example: "MX"
 *                       name:
 *                         type: string
 *                         example: "Aguascalientes"
 *                       type:
 *                         type: string
 *                         example: "state"
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *                 lang:
 *                   type: string
 *                   example: "es"
 *       400:
 *         description: Código de país inválido
 *       500:
 *         description: Error interno del servidor
 */
router.get('/countries/:countryCode/states', async (req, res) => {
    try {
        const { countryCode } = req.params;

        if (!countryCode || countryCode.length !== 2) {
            return res.status(400).json({
                ok: false,
                error: 'Código de país inválido. Debe ser un código ISO alpha-2 de 2 caracteres.'
            });
        }

        const lang = req.query.lang || req.language || 'es';
        const validLangs = ['es', 'en'];
        const selectedLang = validLangs.includes(lang) ? lang : 'es';

        locationsLogger.debug('Fetching states', { countryCode, lang: selectedLang });

        const states = await locationServices.getStatesWithCache(countryCode.toUpperCase(), selectedLang);

        res.status(200).json({
            ok: true,
            data: states,
            lang: selectedLang
        });
    } catch (error) {
        locationsLogger.error('Error fetching states', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            ok: false,
            error: req.__?.('errors.INTERNAL_ERROR') || 'Error interno del servidor'
        });
    }
});

/**
 * @swagger
 * /api/v1/locations/states/{stateCode}/cities:
 *   get:
 *     summary: Listar ciudades de un estado
 *     description: Obtiene lista de ciudades de un estado desde archivos JSON locales.
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: stateCode
 *         required: true
 *         description: Código completo del estado (ej: MX-AGU, AR-B)
 *         schema:
 *           type: string
 *           example: "MX-AGU"
 *       - in: query
 *         name: lang
 *         description: Código de idioma para traducciones (es, en)
 *         schema:
 *           type: string
 *           enum: [es, en]
 *           example: "es"
 *     responses:
 *       200:
 *         description: Lista de ciudades obtenida exitosamente
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
 *                       name:
 *                         type: string
 *                         example: "Aguascalientes"
 *                       stateCode:
 *                         type: string
 *                         example: "MX-AGU"
 *                       latitude:
 *                         type: string
 *                       longitude:
 *                         type: string
 *                       population:
 *                         type: integer
 *                       timezone:
 *                         type: string
 *                 lang:
 *                   type: string
 *                   example: "es"
 *       400:
 *         description: Código de estado inválido
 *       500:
 *         description: Error interno del servidor
 */
router.get('/states/:stateCode/cities', async (req, res) => {
    try {
        const { stateCode } = req.params;

        if (!stateCode || !stateCode.includes('-')) {
            return res.status(400).json({
                ok: false,
                error: 'Código de estado inválido. Formato esperado: CC-STATE (ej: MX-AGU, AR-B)'
            });
        }

        const lang = req.query.lang || req.language || 'es';
        const validLangs = ['es', 'en'];
        const selectedLang = validLangs.includes(lang) ? lang : 'es';

        locationsLogger.debug('Fetching cities', { stateCode, lang: selectedLang });

        const cities = await locationServices.getCitiesByState(stateCode.toUpperCase(), selectedLang);

        res.status(200).json({
            ok: true,
            data: cities,
            lang: selectedLang
        });
    } catch (error) {
        locationsLogger.error('Error fetching cities', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            ok: false,
            error: req.__?.('errors.INTERNAL_ERROR') || 'Error interno del servidor'
        });
    }
});

export default router;
