// utils/winston/SqlTransport.js
// Winston Transport personalizado para escribir error logs a PostgreSQL

import Transport from 'winston-transport';
import ErrorLog from '../../modules/error-logs/models/ErrorLog.js';
import { v7 as uuidv7 } from 'uuid';
import logger from '../logger.js'; // Pino logger para fallback

/**
 * Transport personalizado de Winston para error logging a PostgreSQL
 * 
 * Este transport escribe los errores directamente a la tabla error_logs
 * usando Sequelize. Si la escritura a BD falla, loguea en Pino como fallback.
 * 
 * @extends Transport
 */
class SqlTransport extends Transport {
    /**
     * @param {object} opts - Opciones del transport
     * @param {string} opts.level - Nivel mínimo de logging (default: 'error')
     */
    constructor(opts = {}) {
        super(opts);
        
        // Nivel mínimo de logging para este transport
        this.level = opts.level || 'error';
        
        // Logger de Pino para fallback
        this.pinoLogger = logger.child({ module: 'winston-sql-transport' });
    }

    /**
     * Método principal de logging - llamado automáticamente por Winston
     * 
     * @param {object} info - Información del log de Winston
     * @param {Function} callback - Callback para indicar que el logging terminó
     */
    async log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        try {
            // Extraer datos del log de Winston
            const {
                level,
                message,
                timestamp,
                source = 'backend',
                error_code,
                error_message,
                stack_trace,
                endpoint,
                method,
                status_code,
                user_id,
                organization_id,
                session_id,
                ip_address,
                user_agent,
                request_id,
                correlation_id,
                context = {},
                metadata = {},
                ...rest
            } = info;

            // Validar campos requeridos
            if (!error_code || !error_message) {
                this.pinoLogger.warn({
                    logInfo: info
                }, 'Winston log missing required fields (error_code or error_message), skipping SQL insert');
                callback();
                return;
            }

            // Mapear niveles de Winston a niveles de error_logs
            const errorLevel = this.mapWinstonLevelToErrorLevel(level);

            // Crear el error log en la base de datos
            await ErrorLog.create({
                source,
                level: errorLevel,
                error_code,
                error_message: error_message || message,
                stack_trace,
                endpoint,
                method,
                status_code,
                user_id,
                organization_id,
                session_id,
                ip_address,
                user_agent,
                request_id: request_id || uuidv7(),
                correlation_id,
                context: {
                    ...context,
                    ...rest // Incluir cualquier campo extra en context
                },
                metadata
            });

            callback();
        } catch (error) {
            // Si falla la escritura a BD, loguear en Pino como fallback
            this.pinoLogger.error({
                err: error,
                originalLog: info
            }, 'Failed to write error log to SQL database');
            
            callback();
        }
    }

    /**
     * Mapear niveles de Winston a niveles de error_logs
     * 
     * @param {string} winstonLevel - Nivel de Winston (error, warn, info, etc)
     * @returns {string} Nivel de error_logs (error, warning, critical)
     */
    mapWinstonLevelToErrorLevel(winstonLevel) {
        const mapping = {
            'error': 'error',
            'warn': 'warning',
            'warning': 'warning',
            'critical': 'critical',
            'crit': 'critical',
            'info': 'warning',
            'debug': 'warning'
        };

        return mapping[winstonLevel] || 'error';
    }
}

export default SqlTransport;
