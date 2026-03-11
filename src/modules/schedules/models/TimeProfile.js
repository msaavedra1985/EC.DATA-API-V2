import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const TimeProfile = sequelize.define('TimeProfile', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    validityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'FK a schedule_validities.id'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Etiqueta agrupadora para BI (ej: Turno Mañana, Turno Noche)'
    }
}, {
    tableName: 'schedule_time_profiles',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        { fields: ['validity_id'], name: 'schedule_time_profiles_validity_id_idx' }
    ]
});

export default TimeProfile;
