// db/cassandra/client.js
// Cliente de Cassandra para mediciones de canales (sensores, caudalímetros, etc.)
// Conexión singleton con autenticación PlainText

import cassandra from 'cassandra-driver';
import { dbLogger } from '../../utils/logger.js';

// Parsear host y puerto desde CASSANDRA_HOST (formato: host:port o solo host)
const parseHost = (hostString) => {
    if (!hostString) return { host: null, port: 9042 };
    
    const parts = hostString.split(':');
    return {
        host: parts[0],
        port: parts[1] ? parseInt(parts[1], 10) : 9042
    };
};

const { host: cassandraHost, port: cassandraPort } = parseHost(process.env.CASSANDRA_HOST);

// Configuración de Cassandra desde secrets
const cassandraConfig = {
    contactPoints: cassandraHost ? [cassandraHost] : [],
    localDataCenter: process.env.CASSANDRA_DATACENTER || 'datacenter1',
    keyspace: process.env.CASSANDRA_KEYSPACE || null,
    authProvider: new cassandra.auth.PlainTextAuthProvider(
        process.env.CASSANDRA_USER || '',
        process.env.CASSANDRA_PASS || ''
    ),
    protocolOptions: {
        port: cassandraPort
    },
    // Timeouts y reintentos
    socketOptions: {
        connectTimeout: 10000,
        readTimeout: 30000
    },
    // Política de reconexión exponencial
    policies: {
        reconnection: new cassandra.policies.reconnection.ExponentialReconnectionPolicy(1000, 10 * 60 * 1000)
    }
};

// Cliente de Cassandra (singleton)
let cassandraClient = null;
let isConnected = false;

/**
 * Verifica si las credenciales de Cassandra están configuradas
 * @returns {boolean} - true si las credenciales están presentes
 */
const hasCredentials = () => {
    return !!(cassandraHost && process.env.CASSANDRA_USER && process.env.CASSANDRA_PASS);
};

/**
 * Inicializa la conexión a Cassandra
 * Solo se ejecuta si las credenciales están configuradas
 * @returns {Promise<boolean>} - true si conecta exitosamente
 */
const initCassandra = async () => {
    // Verificar credenciales antes de intentar conectar
    if (!hasCredentials()) {
        dbLogger.info('⏸️  Cassandra: Esperando credenciales (CASSANDRA_HOST, CASSANDRA_USER, CASSANDRA_PASS)');
        return false;
    }

    // Si ya está conectado, retornar true
    if (isConnected && cassandraClient) {
        return true;
    }

    try {
        dbLogger.info({
            host: cassandraHost,
            port: cassandraPort,
            datacenter: cassandraConfig.localDataCenter,
            keyspace: cassandraConfig.keyspace || '(not set)'
        }, '🔌 Conectando a Cassandra...');

        cassandraClient = new cassandra.Client(cassandraConfig);
        await cassandraClient.connect();
        
        isConnected = true;
        dbLogger.info('✅ Cassandra conectado exitosamente');
        
        return true;
    } catch (error) {
        dbLogger.error({ err: error }, '❌ Error conectando a Cassandra');
        cassandraClient = null;
        isConnected = false;
        return false;
    }
};

/**
 * Obtiene el cliente de Cassandra activo
 * @returns {cassandra.Client|null} - Cliente o null si no está conectado
 */
const getCassandraClient = () => {
    if (!cassandraClient || !isConnected) {
        dbLogger.warn('Cassandra client no inicializado');
        return null;
    }
    return cassandraClient;
};

/**
 * Ejecuta una query en Cassandra con parámetros
 * Wrapper para simplificar el uso
 * @param {string} query - Query CQL
 * @param {Array} params - Parámetros para la query
 * @param {Object} options - Opciones adicionales (prepare, fetchSize, etc.)
 * @returns {Promise<cassandra.types.ResultSet>} - Resultado de la query
 */
const execute = async (query, params = [], options = { prepare: true }) => {
    const client = getCassandraClient();
    if (!client) {
        throw new Error('Cassandra no está conectado');
    }
    
    return client.execute(query, params, options);
};

/**
 * Lista los keyspaces disponibles en el cluster
 * Útil para explorar la estructura de la base de datos
 * @returns {Promise<Array<string>>} - Lista de nombres de keyspaces
 */
const listKeyspaces = async () => {
    const client = getCassandraClient();
    if (!client) {
        throw new Error('Cassandra no está conectado');
    }
    
    const result = await client.execute('SELECT keyspace_name FROM system_schema.keyspaces');
    return result.rows.map(row => row.keyspace_name);
};

/**
 * Lista las tablas de un keyspace específico
 * @param {string} keyspace - Nombre del keyspace
 * @returns {Promise<Array<Object>>} - Lista de tablas con sus nombres
 */
const listTables = async (keyspace) => {
    const client = getCassandraClient();
    if (!client) {
        throw new Error('Cassandra no está conectado');
    }
    
    const query = 'SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?';
    const result = await client.execute(query, [keyspace], { prepare: true });
    return result.rows.map(row => row.table_name);
};

/**
 * Describe la estructura de una tabla (columnas y tipos)
 * @param {string} keyspace - Nombre del keyspace
 * @param {string} table - Nombre de la tabla
 * @returns {Promise<Array<Object>>} - Columnas con nombre, tipo y clustering order
 */
const describeTable = async (keyspace, table) => {
    const client = getCassandraClient();
    if (!client) {
        throw new Error('Cassandra no está conectado');
    }
    
    const query = `
        SELECT column_name, type, kind, clustering_order, position
        FROM system_schema.columns 
        WHERE keyspace_name = ? AND table_name = ?
    `;
    const result = await client.execute(query, [keyspace, table], { prepare: true });
    return result.rows.map(row => ({
        name: row.column_name,
        type: row.type,
        kind: row.kind,
        clusteringOrder: row.clustering_order,
        position: row.position
    }));
};

/**
 * Health check de Cassandra
 * @returns {Promise<Object>} - Estado de la conexión
 */
const healthCheck = async () => {
    if (!hasCredentials()) {
        return { 
            status: 'not_configured', 
            message: 'Credenciales no configuradas'
        };
    }
    
    if (!isConnected || !cassandraClient) {
        return { 
            status: 'disconnected', 
            message: 'No conectado'
        };
    }
    
    try {
        // Query simple para verificar conexión
        await cassandraClient.execute('SELECT now() FROM system.local');
        return { 
            status: 'healthy', 
            host: cassandraHost,
            port: cassandraPort
        };
    } catch (error) {
        return { 
            status: 'unhealthy', 
            error: error.message 
        };
    }
};

/**
 * Cierra la conexión a Cassandra
 * Usado en graceful shutdown
 */
const closeCassandra = async () => {
    if (cassandraClient) {
        try {
            await cassandraClient.shutdown();
            isConnected = false;
            cassandraClient = null;
            dbLogger.info('🔌 Cassandra desconectado');
        } catch (error) {
            dbLogger.error({ err: error }, 'Error cerrando conexión Cassandra');
        }
    }
};

export { 
    initCassandra, 
    getCassandraClient, 
    closeCassandra,
    execute,
    listKeyspaces,
    listTables,
    describeTable,
    healthCheck,
    hasCredentials
};
