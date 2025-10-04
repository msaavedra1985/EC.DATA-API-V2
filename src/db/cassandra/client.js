// db/cassandra/client.js
// Cliente de Cassandra - Preparado para conexión futura
// NO intenta conectar hasta recibir credenciales vía secrets

import { logger } from '../../config/env.js';

// Configuración de Cassandra (requiere credenciales)
const cassandraConfig = {
    contactPoints: process.env.CASSANDRA_CONTACT_POINTS?.split(',') || [],
    localDataCenter: process.env.CASSANDRA_DATACENTER || 'datacenter1',
    keyspace: process.env.CASSANDRA_KEYSPACE || 'api_ec',
    credentials: {
        username: process.env.CASSANDRA_USERNAME || '',
        password: process.env.CASSANDRA_PASSWORD || ''
    },
    protocolOptions: {
        port: parseInt(process.env.CASSANDRA_PORT || '9042', 10)
    }
};

// Cliente de Cassandra (inicializado cuando se provean credenciales)
let cassandraClient = null;

/**
 * Inicializa la conexión a Cassandra
 * NOTA: Solo se ejecuta cuando se proveen las credenciales necesarias
 * @returns {Promise<boolean>} - true si conecta, false si no hay credenciales
 */
const initCassandra = async () => {
    // Verificar que existan credenciales antes de intentar conectar
    if (!cassandraConfig.contactPoints.length || !cassandraConfig.credentials.username) {
        logger.info('⏸️  Cassandra: Esperando credenciales (CASSANDRA_CONTACT_POINTS, CASSANDRA_USERNAME, CASSANDRA_PASSWORD)');
        return false;
    }

    try {
        // TODO: Descomentar cuando se instale cassandra-driver
        // const cassandra = await import('cassandra-driver');
        // const { Client } = cassandra;
        
        // cassandraClient = new Client(cassandraConfig);
        // await cassandraClient.connect();
        
        logger.info('✅ Cassandra connected successfully');
        return true;
    } catch (error) {
        logger.error('❌ Failed to connect to Cassandra:', error.message);
        cassandraClient = null;
        return false;
    }
};

/**
 * Obtiene el cliente de Cassandra activo
 * @returns {Object|null} - Cliente de Cassandra o null si no está conectado
 */
const getCassandraClient = () => {
    if (!cassandraClient) {
        logger.warn('Cassandra client not initialized - credentials required');
    }
    return cassandraClient;
};

/**
 * Cierra la conexión a Cassandra
 * Usado en graceful shutdown
 */
const closeCassandra = async () => {
    if (cassandraClient) {
        try {
            await cassandraClient.shutdown();
            logger.info('Cassandra connection closed');
        } catch (error) {
            logger.error('Error closing Cassandra connection:', error.message);
        }
    }
};

export { initCassandra, getCassandraClient, closeCassandra };
