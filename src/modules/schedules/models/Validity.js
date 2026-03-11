import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

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
    }
}, {
    tableName: 'schedule_validities',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        { fields: ['schedule_id'], name: 'schedule_validities_schedule_id_idx' }
    ]
});

export default Validity;
