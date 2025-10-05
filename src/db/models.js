/**
 * Registro de todos los modelos de Sequelize
 * Importar en orden de dependencias para que sync() funcione correctamente
 */

// Modelos sin dependencias primero
import Country from '../modules/countries/models/Country.js';
import CountryTranslation from '../modules/countries/models/CountryTranslation.js';

// Modelos con dependencia a Countries
import Organization from '../modules/organizations/models/Organization.js';

// Modelos con dependencia a Organizations
import User from '../modules/auth/models/User.js';

// Modelos con dependencia a Users
import RefreshToken from '../modules/auth/models/RefreshToken.js';

/**
 * Array de modelos en orden de dependencia
 * Sequelize.sync() los cre en este orden
 */
export const models = [
    Country,
    CountryTranslation,
    Organization,
    User,
    RefreshToken
];

export default {
    Country,
    CountryTranslation,
    Organization,
    User,
    RefreshToken
};
