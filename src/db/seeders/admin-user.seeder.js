import User from '../../modules/auth/models/User.js';
import Role from '../../modules/auth/models/Role.js';
import bcrypt from 'bcrypt';
import { generatePublicCode, generateHumanId, generateUuidV7 } from '../../utils/identifiers.js';
import { dbLogger } from '../../utils/logger.js';

/**
 * Seeder del usuario administrador del sistema
 * Crea el usuario admin@ecdata.com con rol system-admin
 * Idempotente: si el usuario ya existe, no hace nada
 */
export const seedAdminUser = async () => {
    try {
        dbLogger.info('👤 Iniciando seeder de usuario admin...');

        const adminRole = await Role.findOne({ where: { name: 'system-admin' } });
        if (!adminRole) {
            throw new Error('Rol system-admin no encontrado. Ejecutar seedRoles primero.');
        }

        const email = 'admin@ecdata.com';
        const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
        const passwordHash = await bcrypt.hash(password, 10);

        const humanId = await generateHumanId(User, null, null);
        const publicCode = generatePublicCode('USR');

        const [user, created] = await User.findOrCreate({
            where: { email },
            defaults: {
                id: generateUuidV7(),
                publicCode,
                humanId,
                firstName: 'System',
                lastName: 'Administrator',
                username: 'sysadmin',
                email,
                passwordHash,
                roleId: adminRole.id,
                isActive: true
            }
        });

        if (created) {
            dbLogger.info({ email: user.email }, '✅ Usuario admin creado');
        } else {
            dbLogger.info({ email: user.email }, '⏭️  Usuario admin ya existe, saltando');
        }

        return { created, email: user.email };
    } catch (error) {
        dbLogger.error(error, '❌ Error en admin-user seeder');
        throw error;
    }
};
