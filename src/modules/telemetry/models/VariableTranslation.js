import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de VariableTranslation (Traducciones de Variables)
 * 
 * Almacena las traducciones de nombres y descripciones de variables
 * en múltiples idiomas.
 */
const VariableTranslation = sequelize.define('VariableTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID incremental - clave primaria'
    },
    variableId: {
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
    lang: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'Código de idioma (es, en, pt, etc.)'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre de la variable en el idioma especificado'
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Descripción de la variable en el idioma especificado'
    }
}, {
    tableName: 'variable_translations',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            unique: true,
            fields: ['variable_id', 'lang'],
            name: 'unique_variable_lang'
        },
        {
            fields: ['lang']
        }
    ],
    comment: 'Traducciones de variables en múltiples idiomas'
});

/**
 * Relaciones del modelo VariableTranslation
 */
VariableTranslation.associate = (models) => {
    VariableTranslation.belongsTo(models.Variable, {
        foreignKey: 'variableId',
        as: 'variable'
    });
};

export default VariableTranslation;
