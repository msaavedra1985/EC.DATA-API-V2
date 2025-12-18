import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de ChannelVariable (Relación N:N Canales-Variables)
 * 
 * Define qué variables están activas para cada canal específico.
 * Permite configurar diferentes variables por canal según el tipo de equipo.
 * 
 * Ejemplo: Un canal de termostato puede tener variables 'Temperatura' y 'Humedad',
 * mientras que un canal de totalizador puede tener 'Energía' y 'Potencia'.
 */
const ChannelVariable = sequelize.define('ChannelVariable', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID incremental - clave primaria'
    },
    channel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'channels',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a tabla channels'
    },
    variable_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'variables',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a tabla variables'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la variable está activa para este canal'
    },
    display_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Orden de visualización específico para este canal (override)'
    }
}, {
    tableName: 'channel_variables',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            unique: true,
            fields: ['channel_id', 'variable_id'],
            name: 'unique_channel_variable'
        },
        {
            fields: ['channel_id']
        },
        {
            fields: ['variable_id']
        },
        {
            fields: ['is_active']
        }
    ],
    comment: 'Relación N:N entre canales y variables de medición'
});

/**
 * Relaciones del modelo ChannelVariable
 */
ChannelVariable.associate = (models) => {
    // ChannelVariable pertenece a Channel
    ChannelVariable.belongsTo(models.Channel, {
        foreignKey: 'channel_id',
        as: 'channel'
    });

    // ChannelVariable pertenece a Variable
    ChannelVariable.belongsTo(models.Variable, {
        foreignKey: 'variable_id',
        as: 'variable'
    });
};

export default ChannelVariable;
