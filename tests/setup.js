// tests/setup.js
// Setup global para Vitest - se ejecuta antes de cualquier test

import { beforeAll, afterAll } from 'vitest';
import sequelize from '../src/db/sql/sequelize.js';
import redis from '../src/db/redis.js';
import '../src/db/models.js'; // Cargar todos los modelos

/**
 * Setup global de base de datos
 * Se ejecuta una vez antes de todos los tests
 */
beforeAll(async () => {
    try {
        // Autenticar con PostgreSQL
        await sequelize.authenticate();
        
        // Conectar con Redis
        await redis.ping();
        
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
        await redis.quit();
        
        console.log('✅ Test environment: DB connections closed');
    } catch (error) {
        console.error('❌ Test environment cleanup failed:', error);
    }
});
