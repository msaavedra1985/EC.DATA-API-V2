// Servicios de seeding para popular la base de datos con datos de prueba
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import Country from '../countries/models/Country.js';
import CountryTranslation from '../countries/models/CountryTranslation.js';
import Organization from '../organizations/models/Organization.js';
import User from '../auth/models/User.js';
import Role from '../auth/models/Role.js';
import UserOrganization from '../auth/models/UserOrganization.js';
import { countries, countryTranslations, roles, organizations, users } from './seed-data.js';
import { generateUuidV7, generateHumanId, generatePublicCode } from '../../utils/identifiers.js';

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
 * Inserta roles en la base de datos (idempotente - verifica por name)
 * @returns {Promise<Object>} Roles insertados y existentes
 */
const seedRoles = async () => {
    let inserted = 0;
    let existing = 0;
    
    for (const roleData of roles) {
        const [role, created] = await Role.findOrCreate({
            where: { name: roleData.name },
            defaults: roleData,
        });
        
        if (created) {
            inserted++;
        } else {
            existing++;
        }
    }
    
    return { inserted, existing, total: roles.length };
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
 * Inserta organizaciones con jerarquía (idempotente - verifica por slug)
 * Procesa en 2 pasadas: primero raíz, luego hijas con parent_id
 * @returns {Promise<Object>} Organizaciones insertadas y existentes
 */
const seedOrganizations = async () => {
    let inserted = 0;
    let existing = 0;
    
    // Obtener todos los países para mapear country_id
    const allCountries = await Country.findAll({ order: [['id', 'ASC']] });
    
    // Mapa para rastrear organizaciones creadas
    const createdOrgs = {};
    
    // PASADA 1: Crear organizaciones sin parent (raíz) o que ya existen
    for (const orgData of organizations) {
        const country = allCountries[orgData.country_id - 1];
        if (!country) continue;
        
        const existingOrg = await Organization.findOne({ where: { slug: orgData.slug } });
        
        if (existingOrg) {
            existing++;
            createdOrgs[orgData.slug] = existingOrg.id;
            continue;
        }
        
        // Solo crear si no tiene parent_slug (es raíz)
        if (!orgData.parent_slug) {
            const id = generateUuidV7();
            const humanId = await generateHumanId(Organization, null, null);
            const publicCode = generatePublicCode('ORG', id);
            
            const newOrg = await Organization.create({
                id,
                human_id: humanId,
                public_code: publicCode,
                slug: orgData.slug,
                name: orgData.name,
                country_id: country.id,
                tax_id: orgData.tax_id,
                email: orgData.email,
                phone: orgData.phone,
                address: orgData.address,
                description: orgData.description,
                logo_url: orgData.logo_url,
                config: orgData.config,
                parent_id: null,
            });
            
            createdOrgs[orgData.slug] = newOrg.id;
            inserted++;
        }
    }
    
    // PASADA 2: Crear organizaciones hijas con parent_id
    for (const orgData of organizations) {
        if (!orgData.parent_slug) continue; // Ya procesada en pasada 1
        
        const country = allCountries[orgData.country_id - 1];
        if (!country) continue;
        
        // Verificar si ya existe
        if (createdOrgs[orgData.slug]) continue;
        
        const parentId = createdOrgs[orgData.parent_slug];
        if (!parentId) {
            console.warn(`Parent org "${orgData.parent_slug}" not found for "${orgData.slug}"`);
            continue;
        }
        
        const id = generateUuidV7();
        const humanId = await generateHumanId(Organization, null, null);
        const publicCode = generatePublicCode('ORG', id);
        
        const newOrg = await Organization.create({
            id,
            human_id: humanId,
            public_code: publicCode,
            slug: orgData.slug,
            name: orgData.name,
            country_id: country.id,
            tax_id: orgData.tax_id,
            email: orgData.email,
            phone: orgData.phone,
            address: orgData.address,
            description: orgData.description,
            logo_url: orgData.logo_url,
            config: orgData.config,
            parent_id: parentId,
        });
        
        createdOrgs[orgData.slug] = newOrg.id;
        inserted++;
    }
    
    return { inserted, existing, total: organizations.length };
};

/**
 * Inserta usuarios de prueba con relaciones many-to-many (idempotente - verifica por email)
 * Password: "Test123!" (hasheado con bcrypt)
 * - system-admin: pertenecen a EC.DATA
 * - otros roles: pertenecen a su org asignada (is_primary=true)
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
    
    // Obtener EC.DATA para system-admins
    const ecDataId = orgMap['ec-data'];
    
    for (const userData of users) {
        // Verificar que el rol exista
        const roleId = roleMap[userData.role_name];
        if (!roleId) {
            continue; // Saltar si el rol no existe
        }
        
        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ where: { email: userData.email } });
        
        if (existingUser) {
            existing++;
            continue;
        }
        
        // Determinar organización primaria:
        // - system-admin: EC.DATA
        // - otros: su org_slug asignada
        let primaryOrgId;
        if (userData.role_name === 'system-admin') {
            primaryOrgId = ecDataId;
        } else {
            primaryOrgId = userData.org_slug ? orgMap[userData.org_slug] : ecDataId;
        }
        
        if (!primaryOrgId) {
            console.warn(`No primary org found for user ${userData.email}`);
            continue;
        }
        
        // Generar campos obligatorios para nuevo usuario
        const id = generateUuidV7();
        const humanId = await generateHumanId(User, 'organization_id', primaryOrgId);
        const publicCode = generatePublicCode('EC', id);
        
        // Crear usuario (sin organization_id directo)
        const newUser = await User.create({
            id,
            human_id: humanId,
            public_code: publicCode,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            password_hash: passwordHash,
            role_id: roleId,
            organization_id: primaryOrgId, // Mantener por ahora para human_id scoping
            is_active: true,
        });
        
        // Crear relación en user_organizations (many-to-many)
        await UserOrganization.create({
            id: generateUuidV7(),
            user_id: newUser.id,
            organization_id: primaryOrgId,
            is_primary: true, // Esta es su organización primaria
            joined_at: new Date(),
        });
        
        inserted++;
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
    
    // Verificar y crear roles si no existen (prerequisito fundamental)
    const rolesCount = await Role.count();
    if (rolesCount === 0) {
        // Crear roles automáticamente si la tabla está vacía
        summary.roles = await seedRoles();
    } else {
        // Roles ya existen
        summary.roles = { inserted: 0, existing: rolesCount, total: rolesCount };
    }
    
    // Ejecutar seeding en orden correcto (respetando foreign keys)
    summary.countries = await seedCountries();
    summary.translations = await seedCountryTranslations();
    summary.organizations = await seedOrganizations();
    summary.users = await seedUsers();
    
    // Calcular totales
    summary.totals = {
        roles: summary.roles.inserted + summary.roles.existing,
        countries: summary.countries.inserted + summary.countries.existing,
        translations: summary.translations.inserted + summary.translations.existing,
        organizations: summary.organizations.inserted + summary.organizations.existing,
        users: summary.users.inserted + summary.users.existing,
    };
    
    return summary;
};
