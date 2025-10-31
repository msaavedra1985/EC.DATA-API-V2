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

        // Verificar si ya existen usuarios
        const existingCount = await User.count();
        
        if (existingCount > 0) {
            dbLogger.info(`ℹ️  Ya existen ${existingCount} usuarios. Saltando seeder.`);
            return {
                usersCreated: 0,
                usersSkipped: existingCount
            };
        }

        // Obtener roles del sistema
        const roles = await Role.findAll({
            where: { is_active: true },
            attributes: ['id', 'name']
        });

        const roleMap = {};
        roles.forEach(role => {
            roleMap[role.name] = role.id;
        });

        dbLogger.info('✅ Roles cargados:', Object.keys(roleMap));

        // Obtener organizaciones específicas por slug
        const organizations = await Organization.findAll({
            where: {
                slug: ['ec-data', 'acme-corp', 'techsolutions-ar', 'global-enterprises']
            },
            attributes: ['id', 'slug']
        });

        // Mapear organizaciones
        const orgMap = {};
        organizations.forEach(org => {
            orgMap[org.slug] = org.id;
        });

        dbLogger.info('✅ Organizaciones cargadas:', Object.keys(orgMap));

        // Password hasheado (todos usan: TestPassword123!)
        const passwordHash = await bcrypt.hash('TestPassword123!', 10);

        // Datos de usuarios de prueba (uno por cada rol)
        // role_in_org: 'admin' | 'member' | 'viewer'
        const usersData = [
            {
                email: 'admin@ecdata.com',
                first_name: 'System',
                last_name: 'Administrator',
                role_name: 'system-admin',
                org_slug: 'ec-data',
                role_in_org: 'admin' // Admin de EC.DATA
            },
            {
                email: 'orgadmin@acme.com',
                first_name: 'John',
                last_name: 'Smith',
                role_name: 'org-admin',
                org_slug: 'acme-corp',
                role_in_org: 'admin'
            },
            {
                email: 'manager@techsolutions.com.ar',
                first_name: 'María',
                last_name: 'García',
                role_name: 'org-manager',
                org_slug: 'techsolutions-ar',
                role_in_org: 'admin'
            },
            {
                email: 'user@global.es',
                first_name: 'Carlos',
                last_name: 'Rodríguez',
                role_name: 'user',
                org_slug: 'global-enterprises',
                role_in_org: 'member'
            },
            {
                email: 'viewer@acme.com',
                first_name: 'Jane',
                last_name: 'Doe',
                role_name: 'viewer',
                org_slug: 'acme-corp',
                role_in_org: 'viewer'
            },
            {
                email: 'guest@demo.com',
                first_name: 'Guest',
                last_name: 'User',
                role_name: 'guest',
                org_slug: null,
                role_in_org: null
            },
            {
                email: 'demo@ecdata.com',
                first_name: 'Demo',
                last_name: 'Account',
                role_name: 'demo',
                org_slug: 'ec-data',
                role_in_org: 'viewer'
            }
        ];

        // Crear usuarios con triple identificador
        const users = [];
        const memberships = [];
        
        for (const userData of usersData) {
            const id = generateUuidV7();
            // generateHumanId para usuarios (sin scope, es global)
            const humanId = await generateHumanId(User, null, null);
            // publicCode se genera a partir del UUID, no del humanId
            const publicCode = generatePublicCode('USR', id);
            
            const roleId = roleMap[userData.role_name];

            if (!roleId) {
                dbLogger.warn(`⚠️  Rol no encontrado: ${userData.role_name}, saltando usuario ${userData.email}`);
                continue;
            }

            // Crear usuario sin organization_id (usamos UserOrganization)
            const user = await User.create({
                id,
                human_id: humanId,
                public_code: publicCode,
                email: userData.email,
                password_hash: passwordHash,
                first_name: userData.first_name,
                last_name: userData.last_name,
                role_id: roleId,
                phone: null,
                language: 'es',
                timezone: 'America/Santiago',
                avatar_url: null,
                is_active: true,
                email_verified_at: new Date() // Pre-verificado para testing
            });
            
            users.push(user);
            dbLogger.info(`✅ Usuario creado: ${user.email} (${user.public_code}) - Rol global: ${userData.role_name}`);

            // Crear relación UserOrganization si tiene organización
            if (userData.org_slug && userData.role_in_org) {
                const organizationId = orgMap[userData.org_slug];
                
                if (organizationId) {
                    const membership = await UserOrganization.create({
                        id: generateUuidV7(),
                        user_id: user.id,
                        organization_id: organizationId,
                        role_in_org: userData.role_in_org,
                        joined_at: new Date()
                    });
                    
                    memberships.push(membership);
                    dbLogger.info(`   ↳ Membresía creada: ${userData.org_slug} (${userData.role_in_org})`);
                } else {
                    dbLogger.warn(`⚠️  Organización no encontrada: ${userData.org_slug}`);
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
