// middleware/i18n.js
// Middleware de internacionalización para manejo de múltiples idiomas

import i18n from 'i18n';
import path from 'path';
import { fileURLToPath } from 'url';
import logger, { createModuleLogger } from '../utils/logger.js';
import { config } from '../config/env.js';

// Logger específico para i18n
const i18nLogger = createModuleLogger('i18n');

// Obtener el directorio actual para resolver rutas (necesario con ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuración inicial de i18n
 * Define idiomas soportados, directorio de traducciones, etc.
 */
i18n.configure({
    // Idiomas soportados por la API
    locales: ['es', 'en'],
    
    // Idioma por defecto (español según requerimientos)
    defaultLocale: 'es',
    
    // Directorio donde están los archivos de traducción
    directory: path.join(__dirname, '..', 'locales'),
    
    // Actualizar archivos de traducción automáticamente en desarrollo
    updateFiles: config.env === 'development',
    
    // Sincronizar archivos de traducción entre idiomas (en desarrollo)
    syncFiles: config.env === 'development',
    
    // Formato de indentación para los archivos JSON
    indent: '    ',
    
    // Extensión de los archivos de traducción
    extension: '.json',
    
    // Prefijo para las cookies (no usado pero requerido)
    cookie: 'lang',
    
    // No usar query parameter por defecto
    queryParameter: 'lang',
    
    // Registrar el helper i18n en los objetos request
    register: global,
    
    // Preservar la clave si no se encuentra traducción
    missingKeyFn: (locale, key) => {
        if (config.env === 'development') {
            i18nLogger.warn({ locale, key }, `Missing translation key`);
        }
        return key;
    },
    
    // Log de las traducciones (solo en desarrollo)
    logDebugFn: (msg) => {
        if (config.env === 'development') {
            i18nLogger.debug(msg);
        }
    },
    
    // Log de advertencias
    logWarnFn: (msg) => {
        i18nLogger.warn(msg);
    },
    
    // Log de errores
    logErrorFn: (msg) => {
        i18nLogger.error(msg);
    }
});

/**
 * Detecta el idioma preferido del usuario desde múltiples fuentes
 * Orden de prioridad:
 * 1. Query parameter (?lang=en)
 * 2. Header personalizado (X-Language)
 * 3. Header Accept-Language
 * 4. Idioma por defecto (español)
 * 
 * @param {Request} req - Request de Express
 * @returns {string} - Código de idioma (es, en)
 */
const detectLanguage = (req) => {
    // 1. Verificar query parameter
    if (req.query && req.query.lang) {
        const queryLang = req.query.lang.toLowerCase();
        if (i18n.getLocales().includes(queryLang)) {
            i18nLogger.debug({ 
                source: 'query', 
                language: queryLang,
                requestId: req.id 
            }, 'Language detected from query parameter');
            return queryLang;
        }
    }
    
    // 2. Verificar header personalizado X-Language
    if (req.headers['x-language']) {
        const headerLang = req.headers['x-language'].toLowerCase();
        if (i18n.getLocales().includes(headerLang)) {
            i18nLogger.debug({ 
                source: 'x-language-header', 
                language: headerLang,
                requestId: req.id 
            }, 'Language detected from X-Language header');
            return headerLang;
        }
    }
    
    // 3. Verificar Accept-Language header
    if (req.headers['accept-language']) {
        // Parsear Accept-Language header (ejemplo: "en-US,en;q=0.9,es;q=0.8")
        const acceptLanguages = req.headers['accept-language']
            .split(',')
            .map(lang => {
                const parts = lang.trim().split(';');
                const code = parts[0].split('-')[0].toLowerCase(); // Tomar solo el código principal (en de en-US)
                const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
                return { code, quality };
            })
            .sort((a, b) => b.quality - a.quality); // Ordenar por calidad (preferencia)
        
        // Buscar el primer idioma soportado
        for (const lang of acceptLanguages) {
            if (i18n.getLocales().includes(lang.code)) {
                i18nLogger.debug({ 
                    source: 'accept-language-header', 
                    language: lang.code,
                    quality: lang.quality,
                    requestId: req.id 
                }, 'Language detected from Accept-Language header');
                return lang.code;
            }
        }
    }
    
    // 4. Usar idioma por defecto
    const defaultLang = i18n.getLocale();
    i18nLogger.debug({ 
        source: 'default', 
        language: defaultLang,
        requestId: req.id 
    }, 'Using default language');
    return defaultLang;
};

/**
 * Middleware de i18n para Express
 * Configura el idioma para cada request basado en las preferencias del usuario
 * 
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express  
 * @param {Function} next - Siguiente middleware
 */
export const i18nMiddleware = (req, res, next) => {
    try {
        // Detectar el idioma preferido
        const locale = detectLanguage(req);
        
        // Establecer el idioma para este request
        req.locale = locale;
        i18n.setLocale(req, locale);
        
        // Agregar helper de traducción al request
        req.__ = i18n.__;
        req.__n = i18n.__n;
        
        // Agregar helper de traducción al response (para usar en response.js)
        res.locals.__ = i18n.__;
        res.locals.__n = i18n.__n;
        res.locals.locale = locale;
        
        // Agregar header indicando el idioma usado
        res.setHeader('Content-Language', locale);
        
        // Log del idioma seleccionado (solo en desarrollo)
        if (config.env === 'development') {
            i18nLogger.debug({
                requestId: req.id,
                locale,
                path: req.path,
                method: req.method
            }, `Request language set to ${locale}`);
        }
        
        next();
    } catch (error) {
        i18nLogger.error({ error: error.message }, 'Error in i18n middleware');
        // En caso de error, continuar con el idioma por defecto
        req.locale = 'es';
        next();
    }
};

/**
 * Helper para obtener una traducción con parámetros
 * @param {string} key - Clave de traducción
 * @param {Object} params - Parámetros para interpolación
 * @param {string} locale - Idioma específico (opcional)
 * @returns {string} - Texto traducido
 */
export const translate = (key, params = {}, locale = null) => {
    if (locale) {
        const previousLocale = i18n.getLocale();
        i18n.setLocale(locale);
        const translation = i18n.__(key, params);
        i18n.setLocale(previousLocale);
        return translation;
    }
    return i18n.__(key, params);
};

/**
 * Helper para obtener traducciones plurales
 * @param {string} singular - Clave singular
 * @param {string} plural - Clave plural
 * @param {number} count - Cantidad
 * @param {string} locale - Idioma específico (opcional)
 * @returns {string} - Texto traducido
 */
export const translatePlural = (singular, plural, count, locale = null) => {
    if (locale) {
        const previousLocale = i18n.getLocale();
        i18n.setLocale(locale);
        const translation = i18n.__n(singular, plural, count);
        i18n.setLocale(previousLocale);
        return translation;
    }
    return i18n.__n(singular, plural, count);
};

/**
 * Obtener todos los idiomas soportados
 * @returns {Array} - Lista de códigos de idioma
 */
export const getSupportedLocales = () => {
    return i18n.getLocales();
};

/**
 * Verificar si un idioma está soportado
 * @param {string} locale - Código de idioma
 * @returns {boolean} - true si está soportado
 */
export const isLocaleSupported = (locale) => {
    return i18n.getLocales().includes(locale);
};

export default i18nMiddleware;