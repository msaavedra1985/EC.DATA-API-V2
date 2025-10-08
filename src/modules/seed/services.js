// Servicios de seeding para popular la base de datos con datos de prueba
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import Country from '../countries/models/Country.js';
import CountryTranslation from '../countries/models/CountryTranslation.js';
import Organization from '../organizations/models/Organization.js';
import User from '../auth/models/User.js';
import Role from '../auth/models/Role.js';
import { countries, countryTranslations, organizations, users } from './seed-data.js';

/**
 * Limpia todos los datos de prueba de la base de datos
 * CUIDADO: Esto elimina datos de forma permanente
 * @returns {Promise<Object>} Resumen de registros eliminados
 */
export const cleanTestData = async () => {
    // Eliminar en orden correcto para respetar foreign keys
    const deletedUsers = await User.destroy({ where: {}, force: true });
    const deletedOrganizations = await Organization.destroy({ where: {}, force: true });
    const deletedTranslations = await CountryTranslation.destroy({ where: {}, force: true });
    const deletedCountries = await Country.destroy({ where: {}, force: true });
    
    return {
        users: deletedUsers,
        organizations: deletedOrganizations,
        translations: deletedTranslations,
        countries: deletedCountries,
    };
};

/**
 * Inserta países en la base de datos (idempotente - verifica por iso_alpha2)
 * @returns {Promise<Object>} Países insertados y existentes
 */
const seedCountries = async () => {
    let inserted = 0;
    let existing = 0;
    
    for (const countryData of countries) {
        const [country, created] = await Country.findOrCreate({
            where: { iso_alpha2: countryData.iso_alpha2 },
            defaults: countryData,
        });
        
        if (created) {
            inserted++;
        } else {
            existing++;
        }
    }
    
    return { inserted, existing, total: countries.length };
};

/**
 * Inserta traducciones de países (idempotente - verifica por country_id + lang)
 * @returns {Promise<Object>} Traducciones insertadas y existentes
 */
const seedCountryTranslations = async () => {
    let inserted = 0;
    let existing = 0;
    
    // Obtener todos los países para mapear country_id (del array) a id (de BD)
    const allCountries = await Country.findAll({ order: [['id', 'ASC']] });
    
    for (const translation of countryTranslations) {
        // Mapear country_id del array (1-based) a country real de BD
        const country = allCountries[translation.country_id - 1];
        
        if (!country) {
            continue; // Saltar si el país no existe
        }
        
        const [trans, created] = await CountryTranslation.findOrCreate({
            where: {
                country_id: country.id,
                lang: translation.lang,
            },
            defaults: {
                country_id: country.id,
                lang: translation.lang,
                name: translation.name,
                official_name: translation.official_name,
            },
        });
        
        if (created) {
            inserted++;
        } else {
            existing++;
        }
    }
    
    return { inserted, existing, total: countryTranslations.length };
};

/**
 * Inserta organizaciones (idempotente - verifica por slug)
 * @returns {Promise<Object>} Organizaciones insertadas y existentes
 */
const seedOrganizations = async () => {
    let inserted = 0;
    let existing = 0;
    
    // Obtener todos los países para mapear country_id
    const allCountries = await Country.findAll({ order: [['id', 'ASC']] });
    
    for (const orgData of organizations) {
        // Mapear country_id del array (1-based) a country real de BD
        const country = allCountries[orgData.country_id - 1];
        
        if (!country) {
            continue; // Saltar si el país no existe
        }
        
        const [org, created] = await Organization.findOrCreate({
            where: { slug: orgData.slug },
            defaults: {
                ...orgData,
                country_id: country.id, // Usar el ID real de la BD
            },
        });
        
        if (created) {
            inserted++;
        } else {
            existing++;
        }
    }
    
    return { inserted, existing, total: organizations.length };
};

/**
 * Inserta usuarios de prueba (idempotente - verifica por email)
 * Password: "Test123!" (hasheado con bcrypt)
 * @returns {Promise<Object>} Usuarios insertados y existentes
 */
const seedUsers = async () => {
    let inserted = 0;
    let existing = 0;
    
    // Password de prueba para todos los usuarios
    const testPassword = 'Test123!';
    const passwordHash = await bcrypt.hash(testPassword, 10);
    
    // Obtener todos los roles para mapeo
    const allRoles = await Role.findAll();
    const roleMap = {};
    allRoles.forEach(role => {
        roleMap[role.name] = role.id;
    });
    
    // Obtener todas las organizaciones para mapeo
    const allOrganizations = await Organization.findAll();
    const orgMap = {};
    allOrganizations.forEach(org => {
        orgMap[org.slug] = org.id;
    });
    
    for (const userData of users) {
        // Verificar que el rol exista
        const roleId = roleMap[userData.role_name];
        if (!roleId) {
            continue; // Saltar si el rol no existe
        }
        
        // Obtener organization_id (puede ser null)
        const organizationId = userData.org_slug ? orgMap[userData.org_slug] : null;
        
        const [user, created] = await User.findOrCreate({
            where: { email: userData.email },
            defaults: {
                email: userData.email,
                first_name: userData.first_name,
                last_name: userData.last_name,
                password_hash: passwordHash,
                role_id: roleId,
                organization_id: organizationId,
                is_active: true,
            },
        });
        
        if (created) {
            inserted++;
        } else {
            existing++;
        }
    }
    
    return { inserted, existing, total: users.length };
};

/**
 * Ejecuta el seeding completo de datos de prueba
 * @param {boolean} fresh - Si es true, limpia datos antes de insertar
 * @returns {Promise<Object>} Resumen completo del seeding
 */
export const seedTestData = async (fresh = false) => {
    const summary = {};
    
    // Si fresh=true, limpiar datos primero
    if (fresh) {
        summary.cleaned = await cleanTestData();
    }
    
    // Verificar que existan roles (prerequisito)
    const rolesCount = await Role.count();
    if (rolesCount === 0) {
        throw new Error('Roles table is empty. Please run role seeders first.');
    }
    summary.roles = rolesCount;
    
    // Ejecutar seeding en orden correcto (respetando foreign keys)
    summary.countries = await seedCountries();
    summary.translations = await seedCountryTranslations();
    summary.organizations = await seedOrganizations();
    summary.users = await seedUsers();
    
    // Calcular totales
    summary.totals = {
        countries: summary.countries.inserted + summary.countries.existing,
        translations: summary.translations.inserted + summary.translations.existing,
        organizations: summary.organizations.inserted + summary.organizations.existing,
        users: summary.users.inserted + summary.users.existing,
    };
    
    return summary;
};
