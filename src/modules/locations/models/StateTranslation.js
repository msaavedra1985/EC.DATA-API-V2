import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import State from './State.js';

/**
 * Modelo de Traducciones de Estado/Provincia
 * Soporta nombres en múltiples idiomas (español, inglés, etc.)
 */
const StateTranslation = sequelize.define('StateTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    stateCode: {
        type: DataTypes.STRING(10),
        allowNull: false,
        references: {
            model: 'states',
            key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a states.code (ej: AR-B)'
    },
    lang: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'Código de idioma (es, en, pt)'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre del estado en el idioma'
    }
}, {
    tableName: 'state_translations',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            unique: true,
            fields: ['state_code', 'lang'],
            name: 'unique_state_code_lang'
        },
        {
            fields: ['lang']
        }
    ],
    comment: 'Traducciones de nombres de estados'
});

/**
 * Relaciones
 */
State.hasMany(StateTranslation, {
    foreignKey: 'stateCode',
    sourceKey: 'code',
    as: 'translations',
    onDelete: 'CASCADE'
});

StateTranslation.belongsTo(State, {
    foreignKey: 'stateCode',
    targetKey: 'code',
    as: 'state'
});

export default StateTranslation;
