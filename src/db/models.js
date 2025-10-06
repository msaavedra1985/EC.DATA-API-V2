/**
 * Registro de todos los modelos de Sequelize
 * Importar en orden de dependencias para que sync() funcione correctamente
 */

// Modelos sin dependencias primero
import Country from '../modules/countries/models/Country.js';
import CountryTranslation from '../modules/countries/models/CountryTranslation.js';
import Role from '../modules/auth/models/Role.js';

// Modelos con dependencia a Countries
import Organization from '../modules/organizations/models/Organization.js';

// Modelos con dependencia a Organizations y Roles
import User from '../modules/auth/models/User.js';

// Modelos con dependencia a Users
import RefreshToken from '../modules/auth/models/RefreshToken.js';

/**
 * Array de modelos en orden de dependencia
 * Sequelize.sync() los crea en este orden
 */
export const models = [
    Country,
    CountryTranslation,
    Role,
    Organization,
    User,
    RefreshToken
];

export default {
    Country,
    CountryTranslation,
    Role,
    Organization,
    User,
    RefreshToken
};
