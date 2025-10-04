// Configuración de ESLint v9+ para proyecto ESM con reglas estrictas
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';

export default [
    js.configs.recommended,
    {
        files: ['src/**/*.js', 'tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
            },
        },
        plugins: {
            import: importPlugin,
        },
        rules: {
            // Indentación de 4 espacios
            indent: ['error', 4],

            // Enforce single quotes
            quotes: ['error', 'single', { avoidEscape: true }],

            // Semicolons required
            semi: ['error', 'always'],

            // No unused vars
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

            // Import rules
            'import/no-cycle': 'error',
            'import/no-unresolved': 'off', // Off porque ESM con .js extensions
            'import/extensions': ['error', 'always', { ignorePackages: true }],

            // Arrow functions
            'prefer-arrow-callback': 'error',
            'arrow-body-style': ['error', 'as-needed'],

            // General best practices
            'no-console': 'off',
            'no-var': 'error',
            'prefer-const': 'error',
            'object-shorthand': 'error',
        },
    },
];
