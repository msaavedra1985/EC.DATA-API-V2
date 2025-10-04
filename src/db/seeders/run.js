/**
 * Script para ejecutar seeders de la base de datos
 */
import sequelize from '../sql/sequelize.js';
import '../models.js'; // Importar modelos
import { seedCountries } from './countries.seeder.js';

const runSeeders = async () => {
    try {
        console.log('🌱 Iniciando seeders...\n');

        // Conectar a la base de datos
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL\n');

        // Ejecutar seeder de countries
        console.log('📍 Ejecutando seeder de countries...');
        const result = await seedCountries();
        console.log(`✅ ${result.countriesCreated} países creados`);
        console.log(`✅ ${result.translationsCreated} traducciones creadas\n`);

        console.log('🎉 Seeders completados exitosamente');
        
        // Cerrar conexión
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando seeders:', error);
        process.exit(1);
    }
};

runSeeders();
