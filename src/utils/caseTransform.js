// Utilidades de transformación de case para keys de objetos
// DB/interno = snake_case, API responses/requests = camelCase

/**
 * Convierte una key de snake_case a camelCase
 * Ej: "public_code" → "publicCode", "is_home" → "isHome"
 * @param {string} str - Key en snake_case
 * @returns {string} - Key en camelCase
 */
export const snakeToCamel = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
};

/**
 * Convierte una key de camelCase a snake_case
 * Ej: "publicCode" → "public_code", "isHome" → "is_home"
 * @param {string} str - Key en camelCase
 * @returns {string} - Key en snake_case
 */
export const camelToSnake = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
};

/**
 * Transforma recursivamente las keys de un objeto usando la función transformadora
 * Maneja: objetos anidados, arrays, arrays de objetos, null, undefined, Date, primitivos
 * @param {*} obj - Valor a transformar
 * @param {Function} transformer - Función que transforma una key (snakeToCamel o camelToSnake)
 * @returns {*} - Valor con keys transformadas
 */
export const transformKeys = (obj, transformer) => {
    if (obj === null || obj === undefined) return obj;

    if (obj instanceof Date) return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => transformKeys(item, transformer));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const newKey = transformer(key);
            result[newKey] = transformKeys(value, transformer);
        }
        return result;
    }

    return obj;
};

/**
 * Convierte todas las keys de un objeto de snake_case a camelCase (recursivo)
 * @param {*} obj - Objeto con keys en snake_case
 * @returns {*} - Objeto con keys en camelCase
 */
export const toCamelCase = (obj) => transformKeys(obj, snakeToCamel);

/**
 * Convierte todas las keys de un objeto de camelCase a snake_case (recursivo)
 * @param {*} obj - Objeto con keys en camelCase
 * @returns {*} - Objeto con keys en snake_case
 */
export const toSnakeCase = (obj) => transformKeys(obj, camelToSnake);
