// utils/logger.js
// Logger centralizado con Pino para logging estructurado JSON

import pino from 'pino';
import { config } from '../config/env.js';

/**
 * Configuración base del logger Pino
 * - En desarrollo: pretty printing con colores y formato legible
 * - En producción: JSON estructurado para procesamiento automático
 */
const pinoConfig = {
    // Nivel de log según el entorno
    level: config.env === 'development' ? 'debug' : 'info',
    
    // Información base del logger
    base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'localhost',
        env: config.env,
        service: 'ecdata-api'
    },

    // Formato de timestamp
    timestamp: pino.stdTimeFunctions.isoTime,

    // Serializers personalizados para objetos comunes
    serializers: {
        // Serializar requests de Express
        req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            path: req.path,
            query: req.query,
            headers: {
                'user-agent': req.headers['user-agent'],
                'accept-language': req.headers['accept-language'],
                'x-forwarded-for': req.headers['x-forwarded-for'],
                host: req.headers.host
            },
            remoteAddress: req.ip || req.connection?.remoteAddress,
            user: req.user ? { id: req.user.id, email: req.user.email } : undefined
        }),

        // Serializar responses de Express
        res: (res) => ({
            statusCode: res.statusCode,
            headers: res.getHeaders ? res.getHeaders() : {}
        }),

        // Serializar errores con stack trace completo
        err: pino.stdSerializers.err
    },

    // Configuración de formato para mensajes
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
        
        // Agregar contexto adicional en desarrollo
        log: (object) => {
            if (config.env === 'development' && object.context) {
                return {
                    ...object,
                    context: object.context
                };
            }
            return object;
        }
    }
};

/**
 * Configuración de transporte (pretty printing) para desarrollo
 */
const transport = config.env === 'development'
    ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '{levelLabel} - {msg}'
        }
    }
    : undefined;

/**
 * Crear instancia del logger
 */
const logger = transport
    ? pino(pinoConfig, pino.transport(transport))
    : pino(pinoConfig);

/**
 * Child loggers para módulos específicos
 * Permite agregar contexto adicional por módulo
 */
export const createModuleLogger = (moduleName) => {
    return logger.child({ module: moduleName });
};

/**
 * Logger para requests HTTP
 * Usado por pino-http middleware
 */
export const httpLogger = logger.child({ component: 'http' });

/**
 * Logger para base de datos
 */
export const dbLogger = logger.child({ component: 'database' });

/**
 * Logger para servicios de autenticación
 */
export const authLogger = logger.child({ component: 'auth' });

/**
 * Logger para tareas programadas
 */
export const schedulerLogger = logger.child({ component: 'scheduler' });

/**
 * Función helper para log con contexto adicional
 * @param {string} message - Mensaje a loggear
 * @param {Object} context - Contexto adicional
 * @param {string} level - Nivel del log (debug, info, warn, error)
 */
export const logWithContext = (message, context = {}, level = 'info') => {
    logger[level]({ context }, message);
};

/**
 * Función para medir tiempo de ejecución
 * @param {string} operation - Nombre de la operación
 * @returns {Function} - Función para finalizar la medición
 */
export const startTimer = (operation) => {
    const startTime = Date.now();
    return (success = true, metadata = {}) => {
        const duration = Date.now() - startTime;
        const level = success ? 'info' : 'warn';
        logger[level]({
            operation,
            duration,
            success,
            ...metadata
        }, `${operation} completed in ${duration}ms`);
    };
};

/**
 * Logger principal para uso general
 */
export default logger;