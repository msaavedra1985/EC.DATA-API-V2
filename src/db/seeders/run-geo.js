import sequelize from '../sql/sequelize.js';
import '../models.js';
import { seedGeoData } from './geo-data.seeder.js';
import { dbLogger } from '../../utils/logger.js';

const runGeoSeeder = async () => {
    try {
        dbLogger.info('🌍 Ejecutando seeder geográfico...');
        await sequelize.authenticate();
        dbLogger.info('✅ Conectado a PostgreSQL');

        const result = await seedGeoData();

        dbLogger.info('🎉 Seeder geográfico completado');
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        dbLogger.error(error, '❌ Error en seeder geográfico');
        process.exit(1);
    }
};

runGeoSeeder();
