/**
 * Seeder para datos de telemetría (measurement_types y variables)
 * 
 * Carga los tipos de medición y variables necesarios para el TelemetryService.
 * Los datos se insertan con traducciones en español e inglés.
 * 
 * IDs actuales de measurement_types (secuenciales 1-4):
 *   1 = electric_energy (Energía eléctrica) - 19 variables (IDs 1-19)
 *   2 = iot_control (IoT Control) - 0 variables
 *   3 = iot (IoT) - 56 variables (IDs 20-75)
 *   4 = iot_reading (IoT Lectura) - 0 variables
 * 
 * Codes de variables usan prefijo corto del tipo:
 *   ee_  = electric_energy
 *   iotc_ = iot_control
 *   iot_  = iot
 *   iotr_ = iot_reading
 */
import sequelize from '../sql/sequelize.js';
import { QueryTypes } from 'sequelize';

const measurementTypesData = [
    { id: 1, code: 'electric_energy', table_prefix: '', is_active: true, translations: { es: 'Energía eléctrica', en: 'Electrical Energy' } },
    { id: 2, code: 'iot_control', table_prefix: 'sim', is_active: true, translations: { es: 'IoT Control', en: 'IoT Control' } },
    { id: 3, code: 'iot', table_prefix: 'sim', is_active: true, translations: { es: 'IoT', en: 'IoT' } },
    { id: 4, code: 'iot_reading', table_prefix: '', is_active: true, translations: { es: 'IoT Lectura', en: 'IoT Reading' } }
];

const variablesData = [
    // === Energía eléctrica (measurement_type_id: 1 = electric_energy) - 19 variables ===
    { id: 1, code: 'ee_fixed_charge', measurement_type_id: 1, column_name: 'fijo', unit: null, chart_type: null, axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: null, show_in_billing: true, show_in_analysis: false, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Cargo fijo', description: 'cargo fijo' }, en: { name: 'Fixed Charge', description: 'fixed charge' } } },
    { id: 2, code: 'ee_energy', measurement_type_id: 1, column_name: 'e', unit: 'Wh', chart_type: 'column', axis_name: 'Energia (wh)', axis_id: 'energia', axis_min: 0, axis_function: 'total', display_order: 1, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: true, is_active: true, aggregation_type: null, translations: { es: { name: 'Energia Calculada', description: 'energia' }, en: { name: 'Calculated Energy', description: 'energy' } } },
    { id: 3, code: 'ee_power', measurement_type_id: 1, column_name: 'p', unit: 'W', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: 0, axis_function: null, display_order: 3, show_in_billing: true, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Potencia', description: 'potencia' }, en: { name: 'Power', description: 'power' } } },
    { id: 4, code: 'ee_reactive_energy', measurement_type_id: 1, column_name: 're', unit: 'VArh', chart_type: 'column', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 4, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Energia Reactiva', description: 'energia reactiva' }, en: { name: 'Reactive Energy', description: 'reactive energy' } } },
    { id: 5, code: 'ee_power_factor', measurement_type_id: 1, column_name: 'fp', unit: '', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 8, show_in_billing: true, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Factor Potencia', description: 'factor potencia' }, en: { name: 'Power Factor', description: 'power factor' } } },
    { id: 6, code: 'ee_contracted_power', measurement_type_id: 1, column_name: 'Pcontratada', unit: 'kW', chart_type: null, axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: null, show_in_billing: true, show_in_analysis: false, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Potencia contratada', description: 'potencia contratada' }, en: { name: 'Contracted Power', description: 'contracted power' } } },
    { id: 7, code: 'ee_voltage_ln', measurement_type_id: 1, column_name: 'v', unit: 'V', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 5, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Voltaje L-N', description: 'Voltaje L-N' }, en: { name: 'Voltage L-N', description: 'Voltage L-N' } } },
    { id: 8, code: 'ee_current', measurement_type_id: 1, column_name: 'i', unit: 'A', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 7, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Corriente', description: 'amperaje' }, en: { name: 'Current', description: 'amperage' } } },
    { id: 9, code: 'ee_apparent_power', measurement_type_id: 1, column_name: 's', unit: 'VA', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 9, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Potencia Aparente', description: 'potencia aparente' }, en: { name: 'Apparent Power', description: 'apparent power' } } },
    { id: 10, code: 'ee_voltage_ll', measurement_type_id: 1, column_name: 'u', unit: 'V', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 6, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Voltaje L-L', description: 'Voltaje L-L' }, en: { name: 'Voltage L-L', description: 'Voltage L-L' } } },
    { id: 11, code: 'ee_energy_counter', measurement_type_id: 1, column_name: 'e_count', unit: 'Wh', chart_type: 'column', axis_name: 'Energia (wh)', axis_id: 'energia', axis_min: 0, axis_function: 'total', display_order: 2, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Energia Contador', description: 'energia' }, en: { name: 'Energy Counter', description: 'energy' } } },
    { id: 12, code: 'ee_apparent_energy', measurement_type_id: 1, column_name: 'ae', unit: 'VAh', chart_type: 'column', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 10, show_in_billing: true, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Energia Aparente', description: 'energia aparente' }, en: { name: 'Apparent Energy', description: 'apparent energy' } } },
    { id: 13, code: 'ee_harmonic_distortion', measurement_type_id: 1, column_name: 'd', unit: 'THD', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 11, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Distorsión armónica', description: 'distorsión armónica' }, en: { name: 'Harmonic Distortion', description: 'harmonic distortion' } } },
    { id: 14, code: 'ee_cost', measurement_type_id: 1, column_name: 'c', unit: '$', chart_type: 'column', axis_name: null, axis_id: null, axis_min: 0, axis_function: 'total', display_order: 12, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Costo', description: 'costo' }, en: { name: 'Cost', description: 'cost' } } },
    { id: 15, code: 'ee_capacitive_reactive', measurement_type_id: 1, column_name: 'rex', unit: 'VArx', chart_type: 'column', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 13, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Energia Reactiva capacitiva', description: 'energia reactiva capacitiva' }, en: { name: 'Capacitive Reactive Energy', description: 'capacitive reactive energy' } } },
    { id: 16, code: 'ee_reactive_power', measurement_type_id: 1, column_name: 'q', unit: 'var', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 30, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Potencia Reactiva', description: 'Potencia Reactiva' }, en: { name: 'Reactive Power', description: 'Reactive Power' } } },
    { id: 17, code: 'ee_max_power_period', measurement_type_id: 1, column_name: 'p_max', unit: 'W', chart_type: null, axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: null, show_in_billing: false, show_in_analysis: false, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Potencia Maxima Periodo', description: 'Potencia Maxima Periodo' }, en: { name: 'Max Power Period', description: 'Max Power Period' } } },
    { id: 18, code: 'ee_co2', measurement_type_id: 1, column_name: 'CO2', unit: 'CO2', chart_type: 'column', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 14, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'CO2', description: 'CO2' }, en: { name: 'CO2', description: 'CO2' } } },
    { id: 19, code: 'ee_frequency', measurement_type_id: 1, column_name: 'f', unit: 'Hz', chart_type: 'spline', axis_name: 'frecuencia', axis_id: null, axis_min: null, axis_function: null, display_order: 20, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: null, translations: { es: { name: 'Frecuencia', description: 'frecuencia' }, en: { name: 'Frequency', description: 'frequency' } } },

    // === IoT (measurement_type_id: 3 = iot) - 56 variables ===
    { id: 20, code: 'iot_temperature', measurement_type_id: 3, column_name: 'val1', unit: 'ºC', chart_type: 'spline', axis_name: 'Temperatura (°C)', axis_id: 'temp', axis_min: null, axis_function: null, display_order: 1, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: true, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Temperatura', description: 'Temperatura' }, en: { name: 'Temperature', description: 'Temperature' } } },
    { id: 21, code: 'iot_humidity', measurement_type_id: 3, column_name: 'val2', unit: '%', chart_type: 'spline', axis_name: 'Humedad (%)', axis_id: null, axis_min: null, axis_function: null, display_order: 2, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Humedad', description: 'Humedad' }, en: { name: 'Humidity', description: 'Humidity' } } },
    { id: 22, code: 'iot_on_off', measurement_type_id: 3, column_name: 'val1', unit: '', chart_type: 'spline', axis_name: 'Status', axis_id: 'onoff', axis_min: null, axis_function: null, display_order: 6, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Estado On/Off', description: 'OUT Estado On/Off' }, en: { name: 'On/Off Status', description: 'OUT On/Off Status' } } },
    { id: 23, code: 'iot_analog_in', measurement_type_id: 3, column_name: 'val1', unit: '', chart_type: 'spline', axis_name: 'Status', axis_id: null, axis_min: null, axis_function: null, display_order: 7, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Analog In', description: 'IN analogo' }, en: { name: 'Analog In', description: 'Analog input' } } },
    { id: 24, code: 'iot_digital_in', measurement_type_id: 3, column_name: 'val1', unit: '', chart_type: 'spline', axis_name: 'Status', axis_id: null, axis_min: null, axis_function: null, display_order: 8, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Digital IN', description: 'IN digital' }, en: { name: 'Digital IN', description: 'Digital input' } } },
    { id: 25, code: 'iot_flow_rate', measurement_type_id: 3, column_name: 'val1', unit: 'm3/h', chart_type: 'spline', axis_name: 'Flow', axis_id: null, axis_min: null, axis_function: null, display_order: 10, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'FlowRate', description: 'Flow Rate' }, en: { name: 'Flow Rate', description: 'Flow Rate' } } },
    { id: 26, code: 'iot_velocity', measurement_type_id: 3, column_name: 'val2', unit: 'm/s', chart_type: 'spline', axis_name: 'Velocity', axis_id: null, axis_min: null, axis_function: null, display_order: 11, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Velocity', description: 'Velocity' }, en: { name: 'Velocity', description: 'Velocity' } } },
    { id: 27, code: 'iot_net_accumulator', measurement_type_id: 3, column_name: 'val3', unit: 'm3', chart_type: 'column', axis_name: 'netAccumulator', axis_id: null, axis_min: null, axis_function: 'total', display_order: 12, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'count', translations: { es: { name: 'Net Accumulator', description: 'Net Accumulator' }, en: { name: 'Net Accumulator', description: 'Net Accumulator' } } },
    { id: 28, code: 'iot_negative_accumulator', measurement_type_id: 3, column_name: 'val4', unit: 'm3', chart_type: 'column', axis_name: 'negativeAccumulator', axis_id: null, axis_min: null, axis_function: 'total', display_order: 13, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'count', translations: { es: { name: 'Negative Accumulator', description: 'Negative Accumulator' }, en: { name: 'Negative Accumulator', description: 'Negative Accumulator' } } },
    { id: 29, code: 'iot_positive_accumulator', measurement_type_id: 3, column_name: 'val5', unit: 'm3', chart_type: 'column', axis_name: 'positiveAccumulator', axis_id: null, axis_min: null, axis_function: 'total', display_order: 14, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'count', translations: { es: { name: 'Positive Accumulator', description: 'Positive Accumulator' }, en: { name: 'Positive Accumulator', description: 'Positive Accumulator' } } },
    { id: 30, code: 'iot_counter', measurement_type_id: 3, column_name: 'val1', unit: '', chart_type: 'column', axis_name: 'contador', axis_id: null, axis_min: null, axis_function: 'total', display_order: 9, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'count', translations: { es: { name: 'Contador', description: 'Contador' }, en: { name: 'Counter', description: 'Counter' } } },
    { id: 31, code: 'iot_pressure_psi', measurement_type_id: 3, column_name: 'val1', unit: 'PSI', chart_type: 'spline', axis_name: 'presion', axis_id: null, axis_min: null, axis_function: null, display_order: 20, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Presion', description: 'Presion' }, en: { name: 'Pressure', description: 'Pressure' } } },
    { id: 32, code: 'iot_percentage', measurement_type_id: 3, column_name: 'val1', unit: '%', chart_type: 'spline', axis_name: 'porcentaje', axis_id: null, axis_min: null, axis_function: null, display_order: 9, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Porcentaje', description: 'Porcentaje' }, en: { name: 'Percentage', description: 'Percentage' } } },
    { id: 33, code: 'iot_distance_m', measurement_type_id: 3, column_name: 'val7', unit: 'm', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 10, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Distancia', description: 'Distancia' }, en: { name: 'Distance', description: 'Distance' } } },
    { id: 34, code: 'iot_energy_flow_rate', measurement_type_id: 3, column_name: 'val6', unit: 'BTU/h', chart_type: 'spline', axis_name: 'efr', axis_id: null, axis_min: null, axis_function: null, display_order: 15, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Energy flow rate', description: 'energy flow rate' }, en: { name: 'Energy Flow Rate', description: 'energy flow rate' } } },
    { id: 35, code: 'iot_dew_point', measurement_type_id: 3, column_name: 'val3', unit: 'ºC', chart_type: 'spline', axis_name: 'pr', axis_id: null, axis_min: null, axis_function: null, display_order: 5, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Punto de Rocio', description: 'punto de rocio' }, en: { name: 'Dew Point', description: 'dew point' } } },
    { id: 36, code: 'iot_frequency', measurement_type_id: 3, column_name: 'val1', unit: 'Hz', chart_type: 'spline', axis_name: 'frecuencia', axis_id: null, axis_min: null, axis_function: null, display_order: 20, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Frecuencia', description: 'frecuencia' }, en: { name: 'Frequency', description: 'frequency' } } },
    { id: 37, code: 'iot_pressure_bar', measurement_type_id: 3, column_name: 'val2', unit: 'BAR', chart_type: 'spline', axis_name: 'presion', axis_id: null, axis_min: null, axis_function: null, display_order: 20, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Presion', description: 'presion' }, en: { name: 'Pressure', description: 'pressure' } } },
    { id: 38, code: 'iot_quality', measurement_type_id: 3, column_name: 'val6', unit: '', chart_type: 'spline', axis_name: 'Quality', axis_id: null, axis_min: null, axis_function: null, display_order: 16, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Quality', description: 'Quality signal' }, en: { name: 'Quality', description: 'Quality signal' } } },
    { id: 39, code: 'iot_co2', measurement_type_id: 3, column_name: 'val1', unit: 'ppm', chart_type: 'spline', axis_name: 'CO2', axis_id: null, axis_min: null, axis_function: null, display_order: 17, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'CO2', description: 'CO2' }, en: { name: 'CO2', description: 'CO2' } } },
    { id: 40, code: 'iot_temperature_f', measurement_type_id: 3, column_name: 'val24F', unit: '°F', chart_type: 'spline', axis_name: 'Temperatura (°F)', axis_id: null, axis_min: null, axis_function: null, display_order: 3, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Temperatura [F]', description: 'Temperatura [F]' }, en: { name: 'Temperature [F]', description: 'Temperature [F]' } } },
    { id: 41, code: 'iot_btu', measurement_type_id: 3, column_name: 'val3', unit: 'BTU', chart_type: 'column', axis_name: 'BTU', axis_id: null, axis_min: null, axis_function: 'total', display_order: 15, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: 'count', translations: { es: { name: 'BTU', description: 'BTU' }, en: { name: 'BTU', description: 'BTU' } } },
    { id: 42, code: 'iot_battery', measurement_type_id: 3, column_name: 'val3', unit: '%', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 55, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: '%Bateria', description: '%Bateria' }, en: { name: 'Battery %', description: 'Battery %' } } },
    { id: 43, code: 'iot_rssi', measurement_type_id: 3, column_name: 'val4', unit: '', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 56, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'RSSI', description: 'RSSI' }, en: { name: 'RSSI', description: 'RSSI' } } },
    { id: 44, code: 'iot_snr', measurement_type_id: 3, column_name: 'val5', unit: '', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 57, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'SNR', description: 'SNR' }, en: { name: 'SNR', description: 'SNR' } } },
    { id: 45, code: 'iot_ph', measurement_type_id: 3, column_name: 'val2', unit: 'pH', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 23, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: true, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'pH', description: 'pH' }, en: { name: 'pH', description: 'pH' } } },
    { id: 46, code: 'iot_concentration', measurement_type_id: 3, column_name: 'val3', unit: 'MTCV', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 24, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: true, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'concentración', description: 'MTCV' }, en: { name: 'Concentration', description: 'MTCV' } } },
    { id: 47, code: 'iot_mv', measurement_type_id: 3, column_name: 'val4', unit: 'mV', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 25, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: true, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'mV', description: 'mV' }, en: { name: 'mV', description: 'mV' } } },
    { id: 48, code: 'iot_suspended_solids', measurement_type_id: 3, column_name: 'val1', unit: 'mg/L', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 26, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: true, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Sólidos suspendidos', description: 'mg/L' }, en: { name: 'Suspended Solids', description: 'mg/L' } } },
    { id: 49, code: 'iot_auto_manual', measurement_type_id: 3, column_name: 'val2', unit: 'auto-manual', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 27, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: true, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'auto-manual', description: 'auto-manual' }, en: { name: 'Auto-Manual', description: 'auto-manual' } } },
    { id: 50, code: 'iot_ppm', measurement_type_id: 3, column_name: 'val2', unit: 'ppm', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 28, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: true, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'ppm', description: 'ppm' }, en: { name: 'PPM', description: 'PPM' } } },
    { id: 51, code: 'iot_temperature_out', measurement_type_id: 3, column_name: 'val7', unit: 'ºC', chart_type: 'spline', axis_name: 'Temperatura (°C)', axis_id: 'temp', axis_min: null, axis_function: null, display_order: 4, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: true, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Temperatura Salida', description: 'Temperatura' }, en: { name: 'Outlet Temperature', description: 'Temperature' } } },
    { id: 52, code: 'iot_temperature_return', measurement_type_id: 3, column_name: 'val8', unit: 'ºC', chart_type: 'spline', axis_name: 'Temperatura (°C)', axis_id: 'temp', axis_min: null, axis_function: null, display_order: 5, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: true, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Temperatura Retorno', description: 'Temperatura' }, en: { name: 'Return Temperature', description: 'Temperature' } } },
    { id: 53, code: 'iot_upload', measurement_type_id: 3, column_name: 'val4', unit: 'KBs', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 50, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Upload', description: 'Upload' }, en: { name: 'Upload', description: 'Upload' } } },
    { id: 54, code: 'iot_download', measurement_type_id: 3, column_name: 'val5', unit: 'KBs', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 51, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Download', description: 'Download' }, en: { name: 'Download', description: 'Download' } } },
    { id: 55, code: 'iot_disk', measurement_type_id: 3, column_name: 'val6', unit: '%', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 52, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: '%Disco', description: '%Disco' }, en: { name: 'Disk %', description: 'Disk %' } } },
    { id: 56, code: 'iot_cpu', measurement_type_id: 3, column_name: 'val7', unit: '%', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 53, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: '%CPU', description: '%CPU' }, en: { name: 'CPU %', description: 'CPU %' } } },
    { id: 57, code: 'iot_quality_signal', measurement_type_id: 3, column_name: 'val2', unit: '', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 54, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Quality', description: 'Quality signal' }, en: { name: 'Quality', description: 'Quality signal' } } },
    { id: 58, code: 'iot_time', measurement_type_id: 3, column_name: 'val7', unit: 'seg', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 28, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Tiempo', description: 'Tiempo' }, en: { name: 'Time', description: 'Time' } } },
    { id: 59, code: 'iot_staff', measurement_type_id: 3, column_name: 'val6', unit: 'capacidad', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 29, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Staff', description: 'Staff' }, en: { name: 'Staff', description: 'Staff' } } },
    { id: 60, code: 'iot_people_in', measurement_type_id: 3, column_name: 'val7', unit: 'p', chart_type: 'column', axis_name: 'Personas', axis_id: null, axis_min: null, axis_function: 'total', display_order: 30, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'count', translations: { es: { name: 'Personas Ingresan', description: 'Personas Ingresan' }, en: { name: 'People In', description: 'People In' } } },
    { id: 61, code: 'iot_people_out', measurement_type_id: 3, column_name: 'val8', unit: 'p', chart_type: 'column', axis_name: 'Personas', axis_id: null, axis_min: null, axis_function: 'total', display_order: 31, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'count', translations: { es: { name: 'Personas Salen', description: 'Personas Salen' }, en: { name: 'People Out', description: 'People Out' } } },
    { id: 62, code: 'iot_distance_cm', measurement_type_id: 3, column_name: 'val6', unit: 'cm', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 32, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Distancia', description: 'Distancia' }, en: { name: 'Distance', description: 'Distance' } } },
    { id: 63, code: 'iot_volume', measurement_type_id: 3, column_name: 'val1', unit: 'm3', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 16, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Volumen', description: 'Volumen' }, en: { name: 'Volume', description: 'Volume' } } },
    { id: 64, code: 'iot_liters', measurement_type_id: 3, column_name: 'val5', unit: 'L', chart_type: 'column', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 33, show_in_billing: false, show_in_analysis: true, is_realtime: false, is_default: false, is_active: true, aggregation_type: 'count', translations: { es: { name: 'Litros', description: 'Litros' }, en: { name: 'Liters', description: 'Liters' } } },
    { id: 65, code: 'iot_rpm', measurement_type_id: 3, column_name: 'val3', unit: 'rpm', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 34, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'RPM', description: 'RPM' }, en: { name: 'RPM', description: 'RPM' } } },
    { id: 66, code: 'iot_setpoint_cold', measurement_type_id: 3, column_name: 'val4', unit: 'ºC', chart_type: 'spline', axis_name: 'SetPoint', axis_id: 'temp', axis_min: null, axis_function: null, display_order: null, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'SetPoint Frio', description: 'SetPoint Frio' }, en: { name: 'Cold SetPoint', description: 'Cold SetPoint' } } },
    { id: 67, code: 'iot_setpoint_heat', measurement_type_id: 3, column_name: 'val5', unit: 'ºC', chart_type: 'spline', axis_name: 'SetPoint', axis_id: 'temp', axis_min: null, axis_function: null, display_order: null, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'SetPoint Calor', description: 'SetPoint Calor' }, en: { name: 'Heat SetPoint', description: 'Heat SetPoint' } } },
    { id: 68, code: 'iot_gpm', measurement_type_id: 3, column_name: 'val6', unit: 'GPM', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 99, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Galones x minuto', description: 'GPM' }, en: { name: 'Gallons per Minute', description: 'GPM' } } },
    { id: 69, code: 'iot_capacity', measurement_type_id: 3, column_name: 'val5', unit: 'L', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 99, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Capacidad', description: 'Capacidad litros' }, en: { name: 'Capacity', description: 'Capacity liters' } } },
    { id: 70, code: 'iot_refrigeration_ton', measurement_type_id: 3, column_name: 'val4', unit: 'TR', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 99, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Tonelada de refrigeracion', description: 'Tonelada de refrigeracion' }, en: { name: 'Refrigeration Ton', description: 'Refrigeration Ton' } } },
    { id: 71, code: 'iot_btu_h', measurement_type_id: 3, column_name: 'val5', unit: 'BTU/h', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: 'total', display_order: 99, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'BTU/h', description: 'BTU/h' }, en: { name: 'BTU/h', description: 'BTU/h' } } },
    { id: 72, code: 'iot_hp', measurement_type_id: 3, column_name: 'val8', unit: 'HP', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 99, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'HP', description: 'HP' }, en: { name: 'HP', description: 'HP' } } },
    { id: 73, code: 'iot_kw', measurement_type_id: 3, column_name: 'val7', unit: 'kw', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 99, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Kw', description: 'Kw' }, en: { name: 'kW', description: 'kW' } } },
    { id: 74, code: 'iot_pulse', measurement_type_id: 3, column_name: 'val2', unit: 'pls', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 99, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Pulso', description: 'Pulso' }, en: { name: 'Pulse', description: 'Pulse' } } },
    { id: 75, code: 'iot_failure', measurement_type_id: 3, column_name: 'val3', unit: 'fail', chart_type: 'spline', axis_name: null, axis_id: null, axis_min: null, axis_function: null, display_order: 99, show_in_billing: false, show_in_analysis: true, is_realtime: true, is_default: false, is_active: true, aggregation_type: 'avg', translations: { es: { name: 'Failure', description: 'Failure' }, en: { name: 'Failure', description: 'Failure' } } }
];

/**
 * Ejecuta el seed de telemetría
 */
export const seedTelemetry = async () => {
    const transaction = await sequelize.transaction();
    
    try {
        console.log('Iniciando seed de telemetría...');
        
        console.log('Insertando tipos de medición...');
        for (const mt of measurementTypesData) {
            await sequelize.query(
                `INSERT INTO measurement_types (id, code, table_prefix, is_active, created_at, updated_at)
                 VALUES (:id, :code, :table_prefix, :is_active, NOW(), NOW())
                 ON CONFLICT (id) DO UPDATE SET
                 code = EXCLUDED.code,
                 table_prefix = EXCLUDED.table_prefix,
                 is_active = EXCLUDED.is_active,
                 updated_at = NOW()`,
                {
                    replacements: { id: mt.id, code: mt.code, table_prefix: mt.table_prefix, is_active: mt.is_active },
                    type: QueryTypes.INSERT,
                    transaction
                }
            );
            
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
        
        await sequelize.query(
            `SELECT setval('measurement_types_id_seq', (SELECT MAX(id) FROM measurement_types))`,
            { transaction }
        );
        
        console.log('Insertando variables...');
        for (const v of variablesData) {
            await sequelize.query(
                `INSERT INTO variables (id, measurement_type_id, code, column_name, unit, chart_type, axis_name, axis_id, axis_min, axis_function, aggregation_type, display_order, show_in_billing, show_in_analysis, is_realtime, is_default, is_active, created_at, updated_at)
                 VALUES (:id, :measurement_type_id, :code, :column_name, :unit, :chart_type, :axis_name, :axis_id, :axis_min, :axis_function, :aggregation_type, :display_order, :show_in_billing, :show_in_analysis, :is_realtime, :is_default, :is_active, NOW(), NOW())
                 ON CONFLICT (id) DO UPDATE SET
                 measurement_type_id = EXCLUDED.measurement_type_id,
                 code = EXCLUDED.code,
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
                        code: v.code,
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
        
        await sequelize.query(
            `SELECT setval('variables_id_seq', (SELECT MAX(id) FROM variables))`,
            { transaction }
        );
        
        await transaction.commit();
        console.log('Seed de telemetría completado exitosamente');
        console.log(`   - ${measurementTypesData.length} tipos de medición`);
        console.log(`   - ${variablesData.length} variables`);
        
        return { 
            measurementTypes: measurementTypesData.length, 
            variables: variablesData.length 
        };
    } catch (error) {
        await transaction.rollback();
        console.error('Error en seed de telemetría:', error.message);
        throw error;
    }
};

export default seedTelemetry;
