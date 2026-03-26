import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import { recalculateValidityMetrics } from '../helpers/metrics.js';
import TimeProfile from './TimeProfile.js';

const TimeRange = sequelize.define('TimeRange', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    timeProfileId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'FK a schedule_time_profiles.id'
    },
    dayOfWeek: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Día de la semana ISO 8601: 1=Lunes, 7=Domingo'
    },
    startTime: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'Hora de inicio HH:mm (ej: 08:00, 00:00). 24:00 es válido como fin.'
    },
    endTime: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'Hora de fin HH:mm (ej: 12:00, 24:00)'
    }
}, {
    tableName: 'schedule_time_ranges',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        { fields: ['time_profile_id'], name: 'schedule_time_ranges_profile_id_idx' },
        { fields: ['day_of_week'], name: 'schedule_time_ranges_day_idx' }
    ],
    hooks: {
        // Hook: Después de crear un TimeRange, recalcular métricas de la validity
        afterCreate: async (timeRange, options) => {
            const profile = await TimeProfile.findByPk(timeRange.timeProfileId, {
                attributes: ['validityId'],
                transaction: options.transaction
            });
            if (profile) {
                await recalculateValidityMetrics(profile.validityId, options.transaction);
            }
        },

        // Hook: Después de actualizar un TimeRange, recalcular si cambió startTime o endTime
        afterUpdate: async (timeRange, options) => {
            const changed = timeRange.changed();
            if (changed && (changed.includes('startTime') || changed.includes('endTime'))) {
                const profile = await TimeProfile.findByPk(timeRange.timeProfileId, {
                    attributes: ['validityId'],
                    transaction: options.transaction
                });
                if (profile) {
                    await recalculateValidityMetrics(profile.validityId, options.transaction);
                }
            }
        },

        // Hook: Después de eliminar un TimeRange, recalcular métricas de la validity
        afterDestroy: async (timeRange, options) => {
            const profile = await TimeProfile.findByPk(timeRange.timeProfileId, {
                attributes: ['validityId'],
                transaction: options.transaction
            });
            if (profile) {
                await recalculateValidityMetrics(profile.validityId, options.transaction);
            }
        }
    }
});

export default TimeRange;
