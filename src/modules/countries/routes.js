import express from 'express';
import * as countryServices from './services.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const countriesLogger = logger.child({ component: 'countries' });


// 📄 Swagger: src/docs/swagger/countries.yaml -> GET /
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
