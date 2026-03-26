import express from 'express';
import * as locationServices from './services.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const locationsLogger = logger.child({ component: 'locations' });


// 📄 Swagger: src/docs/swagger/locations.yaml -> GET /
router.get('/', (req, res) => {
    res.status(200).json({
        ok: true,
        message: 'Módulo de ubicaciones - Use /countries/:countryCode/states o /states/:stateCode/cities'
    });
});


// 📄 Swagger: src/docs/swagger/locations.yaml -> GET /countries/:countryCode/states
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


// 📄 Swagger: src/docs/swagger/locations.yaml -> GET /states/:stateCode/cities
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
