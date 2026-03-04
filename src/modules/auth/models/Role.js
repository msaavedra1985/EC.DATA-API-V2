import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const Role = sequelize.define(
    'Role',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV7,
            primaryKey: true,
            comment: 'UUID v7 - clave primaria time-ordered'
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Nombre único del rol (system-admin, org-admin, etc.)'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'Descripción detallada de las responsabilidades del rol'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            comment: 'Habilitar/deshabilitar roles sin eliminar'
        }
    },
    {
        tableName: 'roles',
        timestamps: true,
        underscored: true,
        paranoid: false,
        indexes: [
            {
                unique: true,
                fields: ['name']
            }
        ]
    }
);

export default Role;
