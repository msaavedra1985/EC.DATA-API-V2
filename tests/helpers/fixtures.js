// tests/helpers/fixtures.js
// Datos de prueba para tests

import sequelize from '../../src/db/sql/sequelize.js';
import bcrypt from 'bcrypt';
import { v7 as uuidv7 } from 'uuid';

const { User, Role, Organization, UserOrganization, Country } = sequelize.models;

/**
 * Datos de fixtures para testing
 */
export const fixtureData = {
    roles: {
        systemAdmin: {
            name: 'system-admin',
            description: 'System Administrator',
            hierarchy_level: 1000
        },
        orgAdmin: {
            name: 'org-admin',
            description: 'Organization Administrator',
            hierarchy_level: 900
        },
        user: {
            name: 'user',
            description: 'Regular User',
            hierarchy_level: 100
        }
    },
    
    users: {
        admin: {
            email: 'admin@test.com',
            password: 'AdminPass123!',
            first_name: 'Admin',
            last_name: 'Test',
            language: 'es',
            timezone: 'America/Argentina/Buenos_Aires'
        },
        user1: {
            email: 'user1@test.com',
            password: 'UserPass123!',
            first_name: 'User',
            last_name: 'One',
            language: 'es',
            timezone: 'America/Argentina/Buenos_Aires'
        },
        user2: {
            email: 'user2@test.com',
            password: 'UserPass123!',
            first_name: 'User',
            last_name: 'Two',
            language: 'en',
            timezone: 'America/New_York'
        }
    },
    
    organizations: {
        ecdata: {
            name: 'EC.DATA',
            slug: 'ec-data',
            description: 'Root organization'
        },
        testOrg1: {
            name: 'Test Org 1',
            slug: 'test-org-1',
            description: 'Test organization 1'
        },
        testOrg2: {
            name: 'Test Org 2',
            slug: 'test-org-2',
            description: 'Test organization 2'
        }
    }
};

/**
 * Crea roles en la base de datos si no existen
 * @returns {Promise<Object>} Roles creados
 */
export const createRoles = async () => {
    const roles = {};
    
    for (const [key, roleData] of Object.entries(fixtureData.roles)) {
        const [role] = await Role.findOrCreate({
            where: { name: roleData.name },
            defaults: roleData
        });
        roles[key] = role;
    }
    
    return roles;
};

/**
 * Crea usuarios de prueba
 * @param {Object} roles - Roles creados previamente
 * @returns {Promise<Object>} Usuarios creados
 */
export const createUsers = async (roles) => {
    const users = {};
    
    for (const [key, userData] of Object.entries(fixtureData.users)) {
        // Hash password
        const passwordHash = await bcrypt.hash(userData.password, 10);
        
        // Determinar rol
        let roleId = roles.user.id;
        if (key === 'admin') {
            roleId = roles.systemAdmin.id;
        }
        
        // Crear usuario
        const user = await User.create({
            id: uuidv7(),
            email: userData.email,
            password_hash: passwordHash,
            first_name: userData.first_name,
            last_name: userData.last_name,
            language: userData.language,
            timezone: userData.timezone,
            role_id: roleId,
            is_active: true
        });
        
        users[key] = user;
    }
    
    return users;
};

/**
 * Crea organizaciones de prueba
 * @returns {Promise<Object>} Organizaciones creadas
 */
export const createOrganizations = async () => {
    const orgs = {};
    
    // Buscar país Argentina
    const argentina = await Country.findOne({ where: { iso2: 'AR' } });
    
    for (const [key, orgData] of Object.entries(fixtureData.organizations)) {
        const org = await Organization.create({
            id: uuidv7(),
            name: orgData.name,
            slug: orgData.slug,
            description: orgData.description,
            country_id: argentina?.id || null,
            parent_id: null // Sin jerarquía para tests simples
        });
        
        orgs[key] = org;
    }
    
    return orgs;
};

/**
 * Asigna usuarios a organizaciones
 * @param {Object} users - Usuarios creados
 * @param {Object} organizations - Organizaciones creadas
 */
export const assignUsersToOrganizations = async (users, organizations) => {
    // Admin a EC.DATA
    await UserOrganization.create({
        user_id: users.admin.id,
        organization_id: organizations.ecdata.id,
        is_primary: true
    });
    
    // User1 a testOrg1
    await UserOrganization.create({
        user_id: users.user1.id,
        organization_id: organizations.testOrg1.id,
        is_primary: true
    });
    
    // User2 a testOrg2
    await UserOrganization.create({
        user_id: users.user2.id,
        organization_id: organizations.testOrg2.id,
        is_primary: true
    });
};

/**
 * Setup completo de fixtures para tests
 * @returns {Promise<Object>} Todos los fixtures creados
 */
export const setupFixtures = async () => {
    const roles = await createRoles();
    const users = await createUsers(roles);
    const organizations = await createOrganizations();
    await assignUsersToOrganizations(users, organizations);
    
    return { roles, users, organizations };
};

export default { fixtureData, createRoles, createUsers, createOrganizations, assignUsersToOrganizations, setupFixtures };
