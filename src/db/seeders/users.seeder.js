// Seeder de usuarios de prueba
import User from '../../modules/auth/models/User.js';
import Role from '../../modules/auth/models/Role.js';
import Organization from '../../modules/organizations/models/Organization.js';
import UserOrganization from '../../modules/auth/models/UserOrganization.js';
import bcrypt from 'bcrypt';
import { generateUuidV7, generatePublicCode, generateHumanId } from '../../utils/identifiers.js';
import { dbLogger } from '../../utils/logger.js';

/**
 * Seeder de usuarios de prueba
 * Crea un usuario para cada rol del sistema RBAC
 */
export const seedUsers = async () => {
    try {
        dbLogger.info('👤 Iniciando seeder de usuarios...');

        const demoUserExists = await User.findOne({ where: { email: 'orgadmin@acme.com' } });

        if (demoUserExists) {
            const existingCount = await User.count();
            dbLogger.info(`ℹ️  Usuarios demo ya existen (${existingCount} total). Saltando seeder.`);
            return {
                usersCreated: 0,
                membershipsCreated: 0,
                usersSkipped: existingCount
            };
        }

        const roles = await Role.findAll({
            where: { isActive: true },
            attributes: ['id', 'name']
        });

        const roleMap = {};
        roles.forEach(role => {
            roleMap[role.name] = role.id;
        });

        dbLogger.info('✅ Roles cargados:', Object.keys(roleMap));

        const organizations = await Organization.findAll({
            where: {
                slug: ['ec-data', 'acme-corp', 'techsolutions-ar', 'global-enterprises']
            },
            attributes: ['id', 'slug']
        });

        const orgMap = {};
        organizations.forEach(org => {
            orgMap[org.slug] = org.id;
        });

        dbLogger.info('✅ Organizaciones cargadas:', Object.keys(orgMap));

        const passwordHash = await bcrypt.hash('TestPassword123!', 10);

        const usersData = [
            {
                email: 'admin@ecdata.com',
                username: 'sysadmin',
                firstName: 'System',
                lastName: 'Administrator',
                roleName: 'system-admin',
                orgSlug: 'ec-data',
                roleInOrg: 'admin'
            },
            {
                email: 'orgadmin@acme.com',
                username: 'orgadmin',
                firstName: 'John',
                lastName: 'Smith',
                roleName: 'org-admin',
                orgSlug: 'acme-corp',
                roleInOrg: 'admin'
            },
            {
                email: 'manager@techsolutions.com.ar',
                username: 'manager',
                firstName: 'María',
                lastName: 'García',
                roleName: 'org-manager',
                orgSlug: 'techsolutions-ar',
                roleInOrg: 'admin'
            },
            {
                email: 'user@global.es',
                username: 'carlos.rodriguez',
                firstName: 'Carlos',
                lastName: 'Rodríguez',
                roleName: 'user',
                orgSlug: 'global-enterprises',
                roleInOrg: 'member'
            },
            {
                email: 'viewer@acme.com',
                username: 'viewer',
                firstName: 'Jane',
                lastName: 'Doe',
                roleName: 'viewer',
                orgSlug: 'acme-corp',
                roleInOrg: 'viewer'
            },
            {
                email: 'guest@demo.com',
                username: 'guest',
                firstName: 'Guest',
                lastName: 'User',
                roleName: 'guest',
                orgSlug: null,
                roleInOrg: null
            },
            {
                email: 'demo@ecdata.com',
                username: 'demo',
                firstName: 'Demo',
                lastName: 'Account',
                roleName: 'demo',
                orgSlug: 'ec-data',
                roleInOrg: 'viewer'
            }
        ];

        const users = [];
        const memberships = [];

        for (const userData of usersData) {
            const roleId = roleMap[userData.roleName];

            if (!roleId) {
                dbLogger.warn(`⚠️  Rol no encontrado: ${userData.roleName}, saltando usuario ${userData.email}`);
                continue;
            }

            const id = generateUuidV7();
            const humanId = await generateHumanId(User, null, null);
            const publicCode = generatePublicCode('USR');

            const [user, created] = await User.findOrCreate({
                where: { email: userData.email },
                defaults: {
                    id,
                    humanId,
                    publicCode,
                    username: userData.username,
                    passwordHash,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    roleId,
                    organizationId: userData.orgSlug ? (orgMap[userData.orgSlug] ?? null) : null,
                    phone: null,
                    language: 'es',
                    timezone: 'America/Santiago',
                    avatarUrl: null,
                    isActive: true,
                    emailVerifiedAt: new Date()
                }
            });

            if (created) {
                users.push(user);
                dbLogger.info(`✅ Usuario creado: ${user.email} (${user.publicCode}) - Rol global: ${userData.roleName}`);
            } else {
                dbLogger.info(`⏭️  Usuario ya existe: ${user.email}, saltando`);
            }

            if (userData.orgSlug && userData.roleInOrg) {
                const organizationId = orgMap[userData.orgSlug];

                if (organizationId) {
                    const [membership, memberCreated] = await UserOrganization.findOrCreate({
                        where: { userId: user.id, organizationId },
                        defaults: {
                            id: generateUuidV7(),
                            isPrimary: true,
                            roleInOrg: userData.roleInOrg,
                            joinedAt: new Date()
                        }
                    });

                    if (memberCreated) {
                        memberships.push(membership);
                        dbLogger.info(`   ↳ Membresía creada: ${userData.orgSlug} (${userData.roleInOrg})`);
                    } else {
                        dbLogger.info(`   ↳ Membresía ya existe: ${userData.orgSlug}, saltando`);
                    }
                } else {
                    dbLogger.warn(`⚠️  Organización no encontrada: ${userData.orgSlug}`);
                }
            }
        }

        dbLogger.info(`✅ ${users.length} usuarios creados exitosamente`);
        dbLogger.info(`✅ ${memberships.length} membresías de organización creadas`);
        dbLogger.info('🔑 Password para todos: TestPassword123!');

        return {
            usersCreated: users.length,
            membershipsCreated: memberships.length,
            usersSkipped: 0
        };
    } catch (error) {
        dbLogger.error(error, '❌ Error en seeder de usuarios');
        throw error;
    }
};

export default seedUsers;
