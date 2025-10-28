// tests/helpers/testServer.js
// Helper para crear instancia de servidor para tests

import createApp from '../../src/app.js';

/**
 * Obtiene instancia de la aplicación Express para tests
 * Reutiliza la misma instancia para evitar overhead
 */
let appInstance = null;

export const getTestApp = () => {
    if (!appInstance) {
        appInstance = createApp();
    }
    return appInstance;
};

/**
 * Helper para crear headers de autenticación
 * @param {string} token - Access token o refresh token
 * @returns {Object} Headers con Authorization
 */
export const authHeaders = (token) => ({
    Authorization: `Bearer ${token}`
});

/**
 * Helper para crear headers de idioma
 * @param {string} lang - Código de idioma ('es' o 'en')
 * @returns {Object} Headers con Accept-Language
 */
export const langHeaders = (lang = 'es') => ({
    'Accept-Language': lang
});

export default { getTestApp, authHeaders, langHeaders };
