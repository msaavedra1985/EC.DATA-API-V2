// vitest.config.js
// Configuración de Vitest para testing del EC.DATA API

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Entorno de testing
        globals: true,
        environment: 'node',
        
        // Timeouts
        testTimeout: 30000, // 30 segundos para tests que tocan DB
        hookTimeout: 30000,
        
        // Coverage (opcional - activar con --coverage)
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                '**/*.test.js',
                '**/*.spec.js',
                'src/db/utils/',
                'src/config/'
            ]
        },
        
        // Incluir archivos de test
        include: [
            'src/**/*.test.js',
            'tests/**/*.test.js'
        ],
        
        // Paralelización
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: false // Permitir tests en paralelo
            }
        },
        
        // Setup files (se ejecutan antes de cada suite de tests)
        setupFiles: ['./tests/setup.js'],
        
        // Reportero
        reporter: 'verbose'
    }
});
