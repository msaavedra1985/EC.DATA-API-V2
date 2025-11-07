/**
 * Script para ejecutar seeders de la base de datos
 * Orden de ejecución respetando dependencias:
 * 1. Roles (independiente)
 * 2. Countries (independiente)
 * 3. Organizations (depende de Countries)
 * 4. Users (depende de Roles y Organizations)
 * 5. Sites (depende de Organizations y Countries)
 */
import sequelize from '../sql/sequelize.js';
import '../models.js'; // Importar modelos
import { seedRoles } from './roles.seeder.js';
import { seedCountries } from './countries.seeder.js';
import { seedOrganizations } from './organizations.seeder.js';
import { seedUsers } from './users.seeder.js';
import { seedSites } from './sites.seeder.js';
import { dbLogger } from '../../utils/logger.js';

const runSeeders = async () => {
    try {
        dbLogger.info('🌱 Iniciando seeders...');

        // Conectar a la base de datos
        await sequelize.authenticate();
        dbLogger.info('✅ Conectado a PostgreSQL');

        // 1. Ejecutar seeder de roles (primero, ya que users depende de roles)
        dbLogger.info('👥 Ejecutando seeder de roles...');
        const rolesResult = await seedRoles();
        dbLogger.info(`✅ ${rolesResult.rolesCreated} roles creados`);

        // 2. Ejecutar seeder de countries (organizaciones dependen de países)
        dbLogger.info('📍 Ejecutando seeder de countries...');
        const countriesResult = await seedCountries();
        dbLogger.info(`✅ ${countriesResult.countriesCreated} países creados`);
        dbLogger.info(`✅ ${countriesResult.translationsCreated} traducciones creadas`);

        // 3. Ejecutar seeder de organizaciones (depende de countries)
        dbLogger.info('🏢 Ejecutando seeder de organizaciones...');
        const orgsResult = await seedOrganizations();
        dbLogger.info(`✅ ${orgsResult.organizationsCreated} organizaciones creadas`);

        // 4. Ejecutar seeder de usuarios (depende de roles y organizations)
        dbLogger.info('👤 Ejecutando seeder de usuarios...');
        const usersResult = await seedUsers();
        dbLogger.info(`✅ ${usersResult.usersCreated} usuarios creados`);
        dbLogger.info(`✅ ${usersResult.membershipsCreated} membresías creadas`);

        // 5. Ejecutar seeder de sitios (depende de organizations y countries)
        dbLogger.info('📍 Ejecutando seeder de sitios...');
        const sitesResult = await seedSites();
        dbLogger.info(`✅ ${sitesResult.sitesCreated} sitios creados`);

        dbLogger.info('🎉 Seeders completados exitosamente');
        dbLogger.info('');
        dbLogger.info('📊 Resumen:');
        dbLogger.info(`   - Roles: ${rolesResult.rolesCreated} creados`);
        dbLogger.info(`   - Países: ${countriesResult.countriesCreated} creados`);
        dbLogger.info(`   - Organizaciones: ${orgsResult.organizationsCreated} creadas`);
        dbLogger.info(`   - Usuarios: ${usersResult.usersCreated} creados`);
        dbLogger.info(`   - Membresías: ${usersResult.membershipsCreated} creadas`);
        dbLogger.info(`   - Sitios: ${sitesResult.sitesCreated} creados`);
        dbLogger.info('');
        dbLogger.info('🔑 Credenciales de prueba:');
        dbLogger.info('   Password universal: TestPassword123!');
        dbLogger.info('   Usuarios disponibles:');
        dbLogger.info('     - admin@ecdata.com (system-admin)');
        dbLogger.info('     - orgadmin@acme.com (org-admin)');
        dbLogger.info('     - manager@techsolutions.com.ar (org-manager)');
        dbLogger.info('     - user@global.es (user)');
        dbLogger.info('     - viewer@acme.com (viewer)');
        dbLogger.info('     - guest@demo.com (guest)');
        dbLogger.info('     - demo@ecdata.com (demo)');
        
        // Cerrar conexión
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        dbLogger.error(error, '❌ Error ejecutando seeders');
        process.exit(1);
    }
};

runSeeders();
