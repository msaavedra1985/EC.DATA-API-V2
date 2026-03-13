import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const Schedule = sequelize.define('Schedule', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    publicCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Código público legible (ej: SCH-4X9-R2T). NUNCA exponer el UUID.'
    },
    organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK a organizations.id'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    validitiesCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Contador de vigencias totales (cache)'
    }
}, {
    tableName: 'schedules',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
        { fields: ['public_code'], unique: true, name: 'schedules_public_code_idx' },
        { fields: ['organization_id'], name: 'schedules_organization_id_idx' }
    ]
});

export default Schedule;
