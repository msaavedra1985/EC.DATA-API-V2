// Middleware de transformación bidireccional de case
// Request: camelCase → snake_case (para que DTOs/Sequelize reciban snake_case)
// Response: snake_case → camelCase (para que el frontend reciba camelCase)

import { toCamelCase, toSnakeCase } from '../utils/caseTransform.js';

/**
 * Middleware que transforma las keys del request body y query de camelCase a snake_case
 * Se monta DESPUÉS de express.json() y ANTES de las rutas
 * No transforma req.params (son path segments, no keys de objeto)
 */
export const requestCaseTransform = (req, res, next) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        req.body = toSnakeCase(req.body);
    }

    if (req.query && typeof req.query === 'object' && Object.keys(req.query).length > 0) {
        req.query = toSnakeCase(req.query);
    }

    next();
};

/**
 * Middleware que intercepta res.json() para transformar las keys de snake_case a camelCase
 * Se monta ANTES de las rutas
 * Transforma recursivamente todo el contenido del JSON de respuesta
 */
export const responseCaseTransform = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
        if (body && typeof body === 'object') {
            return originalJson(toCamelCase(body));
        }
        return originalJson(body);
    };

    next();
};
