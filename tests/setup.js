// tests/setup.js
// Setup global para Vitest - se ejecuta antes de cualquier test

import { beforeAll, afterAll } from 'vitest';
import sequelize from '../src/db/sql/sequelize.js';
import redisClient from '../src/db/redis/client.js';
import '../src/db/models.js'; // Cargar todos los modelos

/**
 * Setup global de base de datos
 * Se ejecuta una vez antes de todos los tests
 */
beforeAll(async () => {
    try {
        // Autenticar con PostgreSQL
        await sequelize.authenticate();
        
        // Conectar con Redis (si está disponible)
        if (redisClient) {
            await redisClient.ping();
        }
        
        console.log('✅ Test environment: DB connections established');
    } catch (error) {
        console.error('❌ Test environment setup failed:', error);
        throw error;
    }
});

/**
 * Cleanup global
 * Se ejecuta una vez después de todos los tests
 */
afterAll(async () => {
    try {
        // Cerrar conexiones
        await sequelize.close();
        if (redisClient) {
            await redisClient.quit();
        }
        
        console.log('✅ Test environment: DB connections closed');
    } catch (error) {
        console.error('❌ Test environment cleanup failed:', error);
    }
});
