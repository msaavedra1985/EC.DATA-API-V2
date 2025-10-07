// Seeder de usuarios de prueba
import User from '../../modules/auth/models/User.js';
import Role from '../../modules/auth/models/Role.js';
import Organization from '../../modules/organizations/models/Organization.js';
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

        // Obtener organizaciones para asignar a usuarios
        const organizations = await Organization.findAll({
            attributes: ['id', 'slug'],
            limit: 3
        });

        // Mapear organizaciones
        const orgMap = {};
        organizations.forEach(org => {
            orgMap[org.slug] = org.id;
        });

        dbLogger.info('✅ Organizaciones cargadas:', Object.keys(orgMap));

        // Password hasheado (todos usan: TestPassword123!)
        const passwordHash = await bcrypt.hash('TestPassword123!', 10);

        // Scope para human_id de usuarios
        const scope = 'USR';

        // Datos de usuarios de prueba (uno por cada rol)
        const usersData = [
            {
                email: 'admin@ecdata.com',
                first_name: 'System',
                last_name: 'Administrator',
                role_name: 'system-admin',
                organization_id: null, // System admin no pertenece a una org
            },
            {
                email: 'orgadmin@acme.com',
                first_name: 'John',
                last_name: 'Smith',
                role_name: 'org-admin',
                org_slug: 'acme-corp'
            },
            {
                email: 'manager@techsolutions.com.ar',
                first_name: 'María',
                last_name: 'García',
                role_name: 'org-manager',
                org_slug: 'techsolutions-ar'
            },
            {
                email: 'user@global.es',
                first_name: 'Carlos',
                last_name: 'Rodríguez',
                role_name: 'user',
                org_slug: 'global-enterprises'
            },
            {
                email: 'viewer@acme.com',
                first_name: 'Jane',
                last_name: 'Doe',
                role_name: 'viewer',
                org_slug: 'acme-corp'
            },
            {
                email: 'guest@demo.com',
                first_name: 'Guest',
                last_name: 'User',
                role_name: 'guest',
                org_slug: null // Guest puede no tener org
            },
            {
                email: 'demo@ecdata.com',
                first_name: 'Demo',
                last_name: 'Account',
                role_name: 'demo',
                org_slug: null // Demo no pertenece a org específica
            }
        ];

        // Crear usuarios con triple identificador
        const users = [];
        for (const userData of usersData) {
            const id = generateUuidV7();
            const humanId = await generateHumanId(scope);
            const publicCode = generatePublicCode(scope, humanId);
            
            const roleId = roleMap[userData.role_name];
            const organizationId = userData.org_slug ? orgMap[userData.org_slug] : null;

            if (!roleId) {
                dbLogger.warn(`⚠️  Rol no encontrado: ${userData.role_name}, saltando usuario ${userData.email}`);
                continue;
            }

            const user = await User.create({
                id,
                human_id: humanId,
                public_code: publicCode,
                email: userData.email,
                password_hash: passwordHash,
                first_name: userData.first_name,
                last_name: userData.last_name,
                role_id: roleId,
                organization_id: organizationId,
                is_active: true,
                email_verified_at: new Date() // Pre-verificado para testing
            });
            
            users.push(user);
            dbLogger.info(`✅ Usuario creado: ${user.email} (${user.public_code}) - Rol: ${userData.role_name}`);
        }

        dbLogger.info(`✅ ${users.length} usuarios creados exitosamente`);
        dbLogger.info('🔑 Password para todos: TestPassword123!');
        
        return {
            usersCreated: users.length,
            usersSkipped: 0
        };
    } catch (error) {
        dbLogger.error(error, '❌ Error en seeder de usuarios');
        throw error;
    }
};

export default seedUsers;
