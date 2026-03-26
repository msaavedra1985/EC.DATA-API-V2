import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import { recalculateScheduleMetrics } from '../helpers/metrics.js';

const Validity = sequelize.define('Validity', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    scheduleId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK a schedules.id'
    },
    validFrom: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Inicio de vigencia YYYY-MM-DD. null = desde siempre'
    },
    validTo: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Fin de vigencia YYYY-MM-DD. null = sin vencimiento'
    },
    rangesCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Contador de rangos horarios totales (cache)'
    },
    weekCoveragePercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Porcentaje de cobertura semanal (0.00-100.00)'
    },
    exceptionsCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Contador de excepciones en esta validity (cache)'
    }
}, {
    tableName: 'schedule_validities',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        { fields: ['schedule_id'], name: 'schedule_validities_schedule_id_idx' }
    ],
    hooks: {
        // Hook: Después de crear una Validity, recalcular validitiesCount del Schedule
        afterCreate: async (validity, options) => {
            await recalculateScheduleMetrics(validity.scheduleId, options.transaction);
        },

        // Hook: Después de eliminar una Validity, recalcular validitiesCount del Schedule
        afterDestroy: async (validity, options) => {
            await recalculateScheduleMetrics(validity.scheduleId, options.transaction);
        }
    }
});

export default Validity;
