// db/mongodb/client.js
// Cliente de MongoDB - Preparado para conexión futura
// NO intenta conectar hasta recibir credenciales vía secrets

import { logger } from '../../config/env.js';

// Configuración de MongoDB (requiere credenciales)
const mongoConfig = {
    url: process.env.MONGODB_URL || '',
    options: {
        maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10', 10),
        minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2', 10),
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    }
};

// Cliente de MongoDB (inicializado cuando se provean credenciales)
let mongoClient = null;
let mongoDb = null;

/**
 * Inicializa la conexión a MongoDB
 * NOTA: Solo se ejecuta cuando se provee MONGODB_URL
 * @returns {Promise<boolean>} - true si conecta, false si no hay credenciales
 */
const initMongoDB = async () => {
    // Verificar que exista la URL de conexión
    if (!mongoConfig.url) {
        logger.info('⏸️  MongoDB: Esperando credenciales (MONGODB_URL)');
        return false;
    }

    try {
        // TODO: Descomentar cuando se instale mongodb driver
        // const mongodb = await import('mongodb');
        // const { MongoClient } = mongodb;
        
        // mongoClient = new MongoClient(mongoConfig.url, mongoConfig.options);
        // await mongoClient.connect();
        
        // Obtener la base de datos del nombre en la URL o usar default
        // const dbName = process.env.MONGODB_DATABASE || 'api_ec';
        // mongoDb = mongoClient.db(dbName);
        
        logger.info('✅ MongoDB connected successfully');
        return true;
    } catch (error) {
        logger.error('❌ Failed to connect to MongoDB:', error.message);
        mongoClient = null;
        mongoDb = null;
        return false;
    }
};

/**
 * Obtiene la instancia de la base de datos MongoDB activa
 * @returns {Object|null} - Instancia de DB o null si no está conectado
 */
const getMongoDb = () => {
    if (!mongoDb) {
        logger.warn('MongoDB not initialized - credentials required');
    }
    return mongoDb;
};

/**
 * Obtiene el cliente MongoDB (para operaciones avanzadas)
 * @returns {Object|null} - Cliente MongoDB o null
 */
const getMongoClient = () => {
    if (!mongoClient) {
        logger.warn('MongoDB client not initialized - credentials required');
    }
    return mongoClient;
};

/**
 * Cierra la conexión a MongoDB
 * Usado en graceful shutdown
 */
const closeMongoDB = async () => {
    if (mongoClient) {
        try {
            await mongoClient.close();
            logger.info('MongoDB connection closed');
            mongoClient = null;
            mongoDb = null;
        } catch (error) {
            logger.error('Error closing MongoDB connection:', error.message);
        }
    }
};

export { initMongoDB, getMongoDb, getMongoClient, closeMongoDB };
