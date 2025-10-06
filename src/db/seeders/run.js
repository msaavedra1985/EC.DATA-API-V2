/**
 * Script para ejecutar seeders de la base de datos
 */
import sequelize from '../sql/sequelize.js';
import '../models.js'; // Importar modelos
import { seedCountries } from './countries.seeder.js';
import { seedRoles } from './roles.seeder.js';
import { dbLogger } from '../../utils/logger.js';

const runSeeders = async () => {
    try {
        dbLogger.info('🌱 Iniciando seeders...');

        // Conectar a la base de datos
        await sequelize.authenticate();
        dbLogger.info('✅ Conectado a PostgreSQL');

        // Ejecutar seeder de roles (primero, ya que users depende de roles)
        dbLogger.info('👥 Ejecutando seeder de roles...');
        const rolesResult = await seedRoles();
        dbLogger.info(`✅ ${rolesResult.rolesCreated} roles creados`);

        // Ejecutar seeder de countries
        dbLogger.info('📍 Ejecutando seeder de countries...');
        const countriesResult = await seedCountries();
        dbLogger.info(`✅ ${countriesResult.countriesCreated} países creados`);
        dbLogger.info(`✅ ${countriesResult.translationsCreated} traducciones creadas`);

        dbLogger.info('🎉 Seeders completados exitosamente');
        
        // Cerrar conexión
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        dbLogger.error(error, '❌ Error ejecutando seeders');
        process.exit(1);
    }
};

runSeeders();
