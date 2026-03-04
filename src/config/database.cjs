// Configuración de Sequelize CLI para migraciones
// Este archivo es para Sequelize CLI (usa CommonJS)
// El archivo env.js es para la aplicación (usa ESM)

require('dotenv').config();

const useSSL = process.env.DATABASE_SSL !== 'false' && process.env.NODE_ENV === 'production';

const dialectOptions = useSSL ? {
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
} : {};

module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions,
    logging: false
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  }
};
