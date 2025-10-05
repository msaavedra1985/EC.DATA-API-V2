// Configuración de Sequelize con PostgreSQL
import { Sequelize } from 'sequelize';
import { config } from '../../config/env.js';
import { dbLogger } from '../../utils/logger.js';

/**
 * Configuración global de Sequelize
 * - underscored: snake_case en nombres de columnas
 * - freezeTableName: no pluralizar nombres de tabla
 * - paranoid: soft deletes habilitado
 * - timestamps personalizados: created_at, updated_at, deleted_at
 */
const sequelizeConfig = {
    dialect: 'postgres',
    logging: config.env === 'development' ? (msg) => dbLogger.debug(msg) : false,
    
    // Pool de conexiones para producción
    pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
    },

    // Configuración global de modelos
    define: {
        // Nombres de columnas snake_case y nombres de tabla sin pluralizar
        underscored: true,
        freezeTableName: true,

        // Timestamps y soft deletes listos
        timestamps: true,
        paranoid: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    },
};

/**
 * Instancia de Sequelize
 * Usa DATABASE_URL si está disponible, sino construye desde env vars individuales
 */
const sequelize = config.database.url
    ? new Sequelize(config.database.url, sequelizeConfig)
    : new Sequelize(
        config.database.name,
        config.database.user,
        config.database.password,
        {
            ...sequelizeConfig,
            host: config.database.host,
            port: config.database.port,
        }
    );

/**
 * Inicializa la conexión a la base de datos
 * @returns {Promise<void>}
 */
export const initializeDatabase = async () => {
    try {
        await sequelize.authenticate();
        dbLogger.info('✅ PostgreSQL connected successfully');

        // En desarrollo, sincronizar esquema (en producción usar migraciones Umzug)
        if (config.env === 'development') {
            await sequelize.sync({ alter: false }); // alter: false para mantener datos
            dbLogger.info('✅ Database schema synchronized');
        }
    } catch (error) {
        dbLogger.error(error, '❌ Unable to connect to database');
        throw error;
    }
};

/**
 * Cierra la conexión a la base de datos (graceful shutdown)
 * @returns {Promise<void>}
 */
export const closeDatabase = async () => {
    try {
        await sequelize.close();
        dbLogger.info('✅ Database connection closed');
    } catch (error) {
        dbLogger.error(error, '❌ Error closing database');
    }
};

export default sequelize;
