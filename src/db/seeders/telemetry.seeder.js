/**
 * Seeder para datos de telemetría (measurement_types y variables)
 * 
 * Carga los tipos de medición y variables necesarios para el TelemetryService.
 * Los datos se insertan con traducciones en español e inglés.
 */
import sequelize from '../sql/sequelize.js';
import { QueryTypes } from 'sequelize';

// Tipos de medición con prefijos de tabla Cassandra
const measurementTypesData = [
    { id: 1, table_prefix: '', is_active: true, translations: { es: 'Energía eléctrica', en: 'Electrical Energy' } },
    { id: 2, table_prefix: '', is_active: false, translations: { es: 'Temperatura', en: 'Temperature' } },
    { id: 3, table_prefix: 'sim', is_active: true, translations: { es: 'IoT Control', en: 'IoT Control' } },
    { id: 4, table_prefix: 'sim', is_active: true, translations: { es: 'IoT', en: 'IoT' } },
    { id: 5, table_prefix: 'btu', is_active: false, translations: { es: 'BTU', en: 'BTU' } },
    { id: 6, table_prefix: '', is_active: true, translations: { es: 'IoT Lectura', en: 'IoT Reading' } }
];

// Variables principales de telemetría basadas en el JSON proporcionado
// Se mapean los campos del JSON original a la nueva estructura
const variablesData = [
    // Energía eléctrica (tipoMedicionId: 1)
    { id: 1, measurement_type_id: 1, column_name: 'fijo', unit: null, chart_type: null, axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: null, show_in_billing: true, show_in_analysis: false, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Cargo fijo', description: 'cargo fijo' }, en: { name: 'Fixed Charge', description: 'fixed charge' } } },
    { id: 2, measurement_type_id: 1, column_name: 'e', unit: 'Wh', chart_type: 'column', axis_name: 'Energia (wh)', axis_id: 'energia', axis_min: 0, axis_function: 'total', display_order: 1, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: true, is_active: true, aggregation_type: null, translations: { es: { name: 'Energía Calculada', description: 'energia' }, en: { name: 'Calculated Energy', description: 'energy' } } },
    { id: 3, measurement_type_id: 1, column_name: 'p', unit: 'W', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: 0, axis_function: null, display_order: 3, show_in_billing: true, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Potencia', description: 'potencia' }, en: { name: 'Power', description: 'power' } } },
    { id: 4, measurement_type_id: 1, column_name: 're', unit: 'VArh', chart_type: 'column', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 4, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Energía Reactiva', description: 'energia reactiva' }, en: { name: 'Reactive Energy', description: 'reactive energy' } } },
    { id: 5, measurement_type_id: 1, column_name: 'fp', unit: '', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 8, show_in_billing: true, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Factor Potencia', description: 'factor potencia' }, en: { name: 'Power Factor', description: 'power factor' } } },
    { id: 6, measurement_type_id: 1, column_name: 'Pcontratada', unit: 'kW', chart_type: null, axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: null, show_in_billing: true, show_in_analysis: false, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Potencia contratada', description: 'potencia contratada' }, en: { name: 'Contracted Power', description: 'contracted power' } } },
    { id: 7, measurement_type_id: 1, column_name: 'v', unit: 'V', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 5, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Voltaje L-N', description: 'Voltaje L-N' }, en: { name: 'Voltage L-N', description: 'Voltage L-N' } } },
    { id: 8, measurement_type_id: 1, column_name: 'i', unit: 'A', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 7, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Corriente', description: 'amperaje' }, en: { name: 'Current', description: 'amperage' } } },
    { id: 10, measurement_type_id: 1, column_name: 's', unit: 'VA', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 9, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Potencia Aparente', description: 'potencia aparente' }, en: { name: 'Apparent Power', description: 'apparent power' } } },
    { id: 11, measurement_type_id: 1, column_name: 'u', unit: 'V', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 6, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Voltaje L-L', description: 'Voltaje L-L' }, en: { name: 'Voltage L-L', description: 'Voltage L-L' } } },
    { id: 12, measurement_type_id: 1, column_name: 'e_count', unit: 'Wh', chart_type: 'column', axis_name: 'Energia (wh)', axis_id: 'energia', axis_min: 0, axis_function: 'total', display_order: 2, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Energía Contador', description: 'energia' }, en: { name: 'Energy Counter', description: 'energy' } } },
    { id: 13, measurement_type_id: 1, column_name: 'ae', unit: 'VAh', chart_type: 'column', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 10, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Energía Aparente', description: 'energia aparente' }, en: { name: 'Apparent Energy', description: 'apparent energy' } } },
    { id: 14, measurement_type_id: 1, column_name: 'd', unit: 'THD', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 11, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Distorsión armónica', description: 'distorsión armónica' }, en: { name: 'Harmonic Distortion', description: 'harmonic distortion' } } },
    { id: 15, measurement_type_id: 1, column_name: 'c', unit: '$', chart_type: 'column', axis_name: null, axis_id: null, axis_min: 0, axis_function: 'total', display_order: 12, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Costo', description: 'costo' }, en: { name: 'Cost', description: 'cost' } } },
    { id: 34, measurement_type_id: 1, column_name: 'rex', unit: 'VArx', chart_type: 'column', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 13, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Energía Reactiva capacitiva', description: 'energia reactiva capacitiva' }, en: { name: 'Capacitive Reactive Energy', description: 'capacitive reactive energy' } } },
    { id: 45, measurement_type_id: 1, column_name: 'q', unit: 'var', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 30, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Potencia Reactiva', description: 'Potencia Reactiva' }, en: { name: 'Reactive Power', description: 'Reactive Power' } } },

    // IoT (tipoMedicionId: 4)
    { id: 24, measurement_type_id: 4, column_name: 'val1', unit: 'ºC', chart_type: 'spline', axis_name: 'Temperatura (°C)', axis_id: 'temp', axis_min: null, axis_function: null, display_order: 1, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: true, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Temperatura', description: 'Temperatura' }, en: { name: 'Temperature', description: 'Temperature' } } },
    { id: 25, measurement_type_id: 4, column_name: 'val2', unit: '%', chart_type: 'spline', axis_name: 'Humedad (%)', axis_id: null, axis_min: null, axis_function: null, display_order: 2, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Humedad', description: 'Humedad' }, en: { name: 'Humidity', description: 'Humidity' } } },
    { id: 29, measurement_type_id: 4, column_name: 'val1', unit: 'm3/h', chart_type: 'spline', axis_name: 'Flow', axis_id: null, axis_min: null, axis_function: null, display_order: 10, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'FlowRate', description: 'Flow Rate' }, en: { name: 'FlowRate', description: 'Flow Rate' } } },
    { id: 30, measurement_type_id: 4, column_name: 'val2', unit: 'm/s', chart_type: 'spline', axis_name: 'Velocity', axis_id: null, axis_min: null, axis_function: null, display_order: 11, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Velocity', description: 'Velocity' }, en: { name: 'Velocity', description: 'Velocity' } } },
    { id: 31, measurement_type_id: 4, column_name: 'val3', unit: 'm3', chart_type: 'column', axis_name: 'netAccumulator', axis_id: null, axis_min: null, axis_function: 'total', display_order: 12, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'count', translations: { es: { name: 'Net Accumulator', description: 'Net Accumulator' }, en: { name: 'Net Accumulator', description: 'Net Accumulator' } } },
    { id: 32, measurement_type_id: 4, column_name: 'val4', unit: 'm3', chart_type: 'column', axis_name: 'negativeAccumulator', axis_id: null, axis_min: null, axis_function: 'total', display_order: 13, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'count', translations: { es: { name: 'Negative Accumulator', description: 'Negative Accumulator' }, en: { name: 'Negative Accumulator', description: 'Negative Accumulator' } } },
    { id: 33, measurement_type_id: 4, column_name: 'val5', unit: 'm3', chart_type: 'column', axis_name: 'positiveAccumulator', axis_id: null, axis_min: null, axis_function: 'total', display_order: 14, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'count', translations: { es: { name: 'Positive Accumulator', description: 'Positive Accumulator' }, en: { name: 'Positive Accumulator', description: 'Positive Accumulator' } } },
    { id: 39, measurement_type_id: 4, column_name: 'val6', unit: 'BTU/h', chart_type: 'spline', axis_name: 'efr', axis_id: null, axis_min: null, axis_function: null, display_order: 15, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Energy flow rate', description: 'energy flow rate' }, en: { name: 'Energy flow rate', description: 'energy flow rate' } } },
    { id: 40, measurement_type_id: 4, column_name: 'val3', unit: 'ºC', chart_type: 'spline', axis_name: 'pr', axis_id: null, axis_min: null, axis_function: null, display_order: 5, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Punto de Rocío', description: 'punto de rocio' }, en: { name: 'Dew Point', description: 'dew point' } } },
    { id: 44, measurement_type_id: 4, column_name: 'val1', unit: 'ppm', chart_type: 'spline', axis_name: 'CO2', axis_id: null, axis_min: null, axis_function: null, display_order: 17, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'CO2', description: 'CO2' }, en: { name: 'CO2', description: 'CO2' } } },

    // BTU (tipoMedicionId: 5)
    { id: 17, measurement_type_id: 5, column_name: 'ai1', unit: 'ºC', chart_type: 'spline', axis_name: 'Temperatura (°C)', axis_id: 'tempInOut', axis_min: null, axis_function: null, display_order: 1, show_in_billing: true, show_in_analysis: true, is_realtime: true, is_default: false, is_active: false, aggregation_type: null, translations: { es: { name: 'Temperatura de Ingreso', description: 'temperatura de ingreso' }, en: { name: 'Inlet Temperature', description: 'inlet temperature' } } },
    { id: 18, measurement_type_id: 5, column_name: 'ai2', unit: 'ºC', chart_type: 'spline', axis_name: 'Temperatura (°C)', axis_id: 'tempInOut', axis_min: null, axis_function: null, display_order: 2, show_in_billing: true, show_in_analysis: true, is_realtime: true, is_default: false, is_active: false, aggregation_type: null, translations: { es: { name: 'Temperatura de Salida', description: 'temperatura de salida' }, en: { name: 'Outlet Temperature', description: 'outlet temperature' } } },
    { id: 19, measurement_type_id: 5, column_name: 'av1', unit: 'Gpm', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 3, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: false, is_active: false, aggregation_type: null, translations: { es: { name: 'Flujo de Volumen', description: 'flujo de volumen' }, en: { name: 'Volume Flow', description: 'volume flow' } } },
    { id: 20, measurement_type_id: 5, column_name: 'av2', unit: 'BTUh', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 4, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: false, is_active: false, aggregation_type: null, translations: { es: { name: 'Flujo de Energía', description: 'flujo de energia' }, en: { name: 'Energy Flow', description: 'energy flow' } } },
    { id: 21, measurement_type_id: 5, column_name: 'av3', unit: 'G', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 5, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: false, is_active: false, aggregation_type: null, translations: { es: { name: 'Volumen Total', description: 'volumen total' }, en: { name: 'Total Volume', description: 'total volume' } } },
    { id: 22, measurement_type_id: 5, column_name: 'av4', unit: 'BTU', chart_type: 'column', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 6, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: false, is_active: false, aggregation_type: null, translations: { es: { name: 'Contador BTU', description: 'Cantidad BTU' }, en: { name: 'BTU Counter', description: 'BTU Amount' } } },
    { id: 23, measurement_type_id: 5, column_name: 'btuf', unit: 'wh', chart_type: 'column', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 7, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: true, is_active: false, aggregation_type: null, translations: { es: { name: 'Energía BTU', description: 'Energia total' }, en: { name: 'BTU Energy', description: 'Total energy' } } }
];

/**
 * Ejecuta el seed de telemetría
 */
export const seedTelemetry = async () => {
    const transaction = await sequelize.transaction();
    
    try {
        console.log('🌱 Iniciando seed de telemetría...');
        
        // 1. Insertar measurement_types con IDENTITY_INSERT
        console.log('📊 Insertando tipos de medición...');
        for (const mt of measurementTypesData) {
            await sequelize.query(
                `INSERT INTO measurement_types (id, table_prefix, is_active, created_at, updated_at)
                 VALUES (:id, :table_prefix, :is_active, NOW(), NOW())
                 ON CONFLICT (id) DO UPDATE SET
                 table_prefix = EXCLUDED.table_prefix,
                 is_active = EXCLUDED.is_active,
                 updated_at = NOW()`,
                {
                    replacements: { id: mt.id, table_prefix: mt.table_prefix, is_active: mt.is_active },
                    type: QueryTypes.INSERT,
                    transaction
                }
            );
            
            // Insertar traducciones
            for (const [lang, name] of Object.entries(mt.translations)) {
                await sequelize.query(
                    `INSERT INTO measurement_type_translations (measurement_type_id, lang, name, created_at, updated_at)
                     VALUES (:measurement_type_id, :lang, :name, NOW(), NOW())
                     ON CONFLICT (measurement_type_id, lang) DO UPDATE SET
                     name = EXCLUDED.name,
                     updated_at = NOW()`,
                    {
                        replacements: { measurement_type_id: mt.id, lang, name },
                        type: QueryTypes.INSERT,
                        transaction
                    }
                );
            }
        }
        
        // Actualizar la secuencia de measurement_types
        await sequelize.query(
            `SELECT setval('measurement_types_id_seq', (SELECT MAX(id) FROM measurement_types))`,
            { transaction }
        );
        
        // 2. Insertar variables
        console.log('📈 Insertando variables...');
        for (const v of variablesData) {
            await sequelize.query(
                `INSERT INTO variables (id, measurement_type_id, column_name, unit, chart_type, axis_name, axis_id, axis_min, axis_function, aggregation_type, display_order, show_in_billing, show_in_analysis, is_realtime, is_default, is_active, created_at, updated_at)
                 VALUES (:id, :measurement_type_id, :column_name, :unit, :chart_type, :axis_name, :axis_id, :axis_min, :axis_function, :aggregation_type, :display_order, :show_in_billing, :show_in_analysis, :is_realtime, :is_default, :is_active, NOW(), NOW())
                 ON CONFLICT (id) DO UPDATE SET
                 measurement_type_id = EXCLUDED.measurement_type_id,
                 column_name = EXCLUDED.column_name,
                 unit = EXCLUDED.unit,
                 chart_type = EXCLUDED.chart_type,
                 axis_name = EXCLUDED.axis_name,
                 axis_id = EXCLUDED.axis_id,
                 axis_min = EXCLUDED.axis_min,
                 axis_function = EXCLUDED.axis_function,
                 aggregation_type = EXCLUDED.aggregation_type,
                 display_order = EXCLUDED.display_order,
                 show_in_billing = EXCLUDED.show_in_billing,
                 show_in_analysis = EXCLUDED.show_in_analysis,
                 is_realtime = EXCLUDED.is_realtime,
                 is_default = EXCLUDED.is_default,
                 is_active = EXCLUDED.is_active,
                 updated_at = NOW()`,
                {
                    replacements: {
                        id: v.id,
                        measurement_type_id: v.measurement_type_id,
                        column_name: v.column_name,
                        unit: v.unit,
                        chart_type: v.chart_type,
                        axis_name: v.axis_name,
                        axis_id: v.axis_id,
                        axis_min: v.axis_min,
                        axis_function: v.axis_function,
                        aggregation_type: v.aggregation_type,
                        display_order: v.display_order,
                        show_in_billing: v.show_in_billing,
                        show_in_analysis: v.show_in_analysis,
                        is_realtime: v.is_realtime,
                        is_default: v.is_default,
                        is_active: v.is_active
                    },
                    type: QueryTypes.INSERT,
                    transaction
                }
            );
            
            // Insertar traducciones de variables
            for (const [lang, trans] of Object.entries(v.translations)) {
                await sequelize.query(
                    `INSERT INTO variable_translations (variable_id, lang, name, description, created_at, updated_at)
                     VALUES (:variable_id, :lang, :name, :description, NOW(), NOW())
                     ON CONFLICT (variable_id, lang) DO UPDATE SET
                     name = EXCLUDED.name,
                     description = EXCLUDED.description,
                     updated_at = NOW()`,
                    {
                        replacements: { variable_id: v.id, lang, name: trans.name, description: trans.description },
                        type: QueryTypes.INSERT,
                        transaction
                    }
                );
            }
        }
        
        // Actualizar la secuencia de variables
        await sequelize.query(
            `SELECT setval('variables_id_seq', (SELECT MAX(id) FROM variables))`,
            { transaction }
        );
        
        await transaction.commit();
        console.log('✅ Seed de telemetría completado exitosamente');
        console.log(`   - ${measurementTypesData.length} tipos de medición insertados`);
        console.log(`   - ${variablesData.length} variables insertadas`);
        
        return { 
            measurementTypes: measurementTypesData.length, 
            variables: variablesData.length 
        };
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Error en seed de telemetría:', error.message);
        throw error;
    }
};

export default seedTelemetry;
