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

MeasurementType.hasMany(MeasurementTypeTranslation, {
    foreignKey: 'measurement_type_id',
    as: 'translations',
    onDelete: 'CASCADE'
});

MeasurementTypeTranslation.belongsTo(MeasurementType, {
    foreignKey: 'measurement_type_id',
    as: 'measurementType'
});

export {
    MeasurementType,
    MeasurementTypeTranslation,
    Variable,
    VariableTranslation,
    ChannelVariable
};

export default {
    MeasurementType,
    MeasurementTypeTranslation,
    Variable,
    VariableTranslation,
    ChannelVariable
};
