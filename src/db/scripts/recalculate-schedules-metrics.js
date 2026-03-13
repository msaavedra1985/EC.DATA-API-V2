// Script de migración de datos: Recalcular métricas de schedules existentes
// Uso: node src/db/scripts/recalculate-schedules-metrics.js

import sequelize from '../sql/sequelize.js';
import Schedule from '../../modules/schedules/models/Schedule.js';
import Validity from '../../modules/schedules/models/Validity.js';
import TimeProfile from '../../modules/schedules/models/TimeProfile.js';
import TimeRange from '../../modules/schedules/models/TimeRange.js';
import { recalculateScheduleMetrics, recalculateValidityMetrics } from '../../modules/schedules/helpers/metrics.js';
import logger from '../../utils/logger.js';

const migrationLogger = logger.child({ component: 'schedules-metrics-migration' });

async function recalculateAllSchedulesMetrics() {
    try {
        migrationLogger.info('Iniciando recálculo de métricas de schedules...');

        // Obtener todos los schedules
        const schedules = await Schedule.findAll({
            attributes: ['id', 'publicCode'],
            include: [{
                model: Validity,
                as: 'validities',
                attributes: ['id']
            }]
        });

        migrationLogger.info(`Encontrados ${schedules.length} schedules para procesar`);

        let processedSchedules = 0;
        let processedValidities = 0;
        let errors = 0;

        for (const schedule of schedules) {
            try {
                // Recalcular validitiesCount del schedule
                await recalculateScheduleMetrics(schedule.id);
                processedSchedules++;

                // Recalcular métricas de cada validity
                for (const validity of schedule.validities) {
                    try {
                        await recalculateValidityMetrics(validity.id);
                        processedValidities++;
                    } catch (error) {
                        migrationLogger.error({
                            scheduleId: schedule.publicCode,
                            validityId: validity.id,
                            error: error.message
                        }, 'Error recalculando validity');
                        errors++;
                    }
                }

                if (processedSchedules % 10 === 0) {
                    migrationLogger.info(`Progreso: ${processedSchedules}/${schedules.length} schedules procesados`);
                }
            } catch (error) {
                migrationLogger.error({
                    scheduleId: schedule.publicCode,
                    error: error.message
                }, 'Error recalculando schedule');
                errors++;
            }
        }

        migrationLogger.info({
            totalSchedules: schedules.length,
            processedSchedules,
            processedValidities,
            errors,
            metricsRecalculated: 'validitiesCount, exceptionsCount, rangesCount, weekCoveragePercent'
        }, 'Recálculo de métricas completado');

        return {
            success: true,
            totalSchedules: schedules.length,
            processedSchedules,
            processedValidities,
            errors
        };
    } catch (error) {
        migrationLogger.error({ error: error.message }, 'Error fatal en migración');
        throw error;
    }
}

// Ejecutar migración
(async () => {
    try {
        await sequelize.authenticate();
        migrationLogger.info('Conexión a DB establecida');

        const result = await recalculateAllSchedulesMetrics();

        if (result.errors > 0) {
            migrationLogger.warn(`Migración completada con ${result.errors} errores`);
            process.exit(1);
        } else {
            migrationLogger.info('Migración completada exitosamente');
            process.exit(0);
        }
    } catch (error) {
        migrationLogger.error({ error: error.message }, 'Error ejecutando migración');
        process.exit(1);
    } finally {
        await sequelize.close();
    }
})();
