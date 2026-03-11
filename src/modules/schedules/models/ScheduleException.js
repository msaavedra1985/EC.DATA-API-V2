import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const ScheduleException = sequelize.define('ScheduleException', {
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
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre del evento (ej: Año Nuevo, Navidad)'
    },
    type: {
        type: DataTypes.ENUM('closed', 'special'),
        allowNull: false,
        defaultValue: 'closed',
        comment: 'closed = sin actividad, special = horario distinto'
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Fecha del evento en formato YYYY-MM-DD'
    },
    repeatYearly: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'true = se repite todos los años en esa fecha (ignora el año)'
    }
}, {
    tableName: 'schedule_exceptions',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        { fields: ['schedule_id'], name: 'schedule_exceptions_schedule_id_idx' },
        { fields: ['date'], name: 'schedule_exceptions_date_idx' }
    ]
});

export default ScheduleException;
