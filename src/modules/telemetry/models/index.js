/**
 * Índice de modelos del módulo Telemetry
 * 
 * Exporta todos los modelos relacionados con telemetría y mediciones.
 * Configura asociaciones inline (patrón consistente con device-metadata).
 */
import MeasurementType from './MeasurementType.js';
import MeasurementTypeTranslation from './MeasurementTypeTranslation.js';
import Variable from './Variable.js';
import VariableTranslation from './VariableTranslation.js';
import ChannelVariable from './ChannelVariable.js';
import Annotation from './Annotation.js';
import User from '../../auth/models/User.js';

MeasurementType.hasMany(MeasurementTypeTranslation, {
    foreignKey: 'measurementTypeId',
    as: 'translations',
    onDelete: 'CASCADE'
});

MeasurementTypeTranslation.belongsTo(MeasurementType, {
    foreignKey: 'measurementTypeId',
    as: 'measurementType'
});

MeasurementType.hasMany(Variable, {
    foreignKey: 'measurementTypeId',
    as: 'variables',
    onDelete: 'RESTRICT'
});

Variable.belongsTo(MeasurementType, {
    foreignKey: 'measurementTypeId',
    as: 'measurementType'
});

Variable.hasMany(VariableTranslation, {
    foreignKey: 'variableId',
    as: 'translations',
    onDelete: 'CASCADE'
});

VariableTranslation.belongsTo(Variable, {
    foreignKey: 'variableId',
    as: 'variable'
});

Annotation.belongsTo(User, {
    foreignKey: 'authorId',
    as: 'author'
});

User.hasMany(Annotation, {
    foreignKey: 'authorId',
    as: 'annotations'
});

export {
    MeasurementType,
    MeasurementTypeTranslation,
    Variable,
    VariableTranslation,
    ChannelVariable,
    Annotation
};

export default {
    MeasurementType,
    MeasurementTypeTranslation,
    Variable,
    VariableTranslation,
    ChannelVariable,
    Annotation
};
