/**
 * Seeder de Escalas de Unidad
 * 
 * Define cómo escalar cada unidad base para display visual en el frontend.
 * Algoritmo: ordenar por min_value DESC, tomar la primera donde raw_value >= min_value.
 * displayed = raw_value / factor
 */

export const seedUnitScales = async (sequelize) => {
    const scales = [
        // ============================================
        // ENERGÍA ACTIVA
        // ============================================
        { base_unit: 'Wh', symbol: 'Wh',  label: 'Wattora',        factor: 1,          min_value: 0,          display_order: 1 },
        { base_unit: 'Wh', symbol: 'kWh', label: 'Kilowattora',    factor: 1000,       min_value: 1000,       display_order: 2 },
        { base_unit: 'Wh', symbol: 'MWh', label: 'Megawattora',    factor: 1000000,    min_value: 1000000,    display_order: 3 },
        { base_unit: 'Wh', symbol: 'GWh', label: 'Gigawattora',    factor: 1000000000, min_value: 1000000000, display_order: 4 },

        // ============================================
        // POTENCIA ACTIVA (raw en W)
        // ============================================
        { base_unit: 'W', symbol: 'W',  label: 'Watt',     factor: 1,       min_value: 0,       display_order: 1 },
        { base_unit: 'W', symbol: 'kW', label: 'Kilowatt', factor: 1000,    min_value: 1000,    display_order: 2 },
        { base_unit: 'W', symbol: 'MW', label: 'Megawatt', factor: 1000000, min_value: 1000000, display_order: 3 },

        // ============================================
        // POTENCIA ACTIVA (raw en kW — variables que ya vienen en kW)
        // ============================================
        { base_unit: 'kW', symbol: 'kW', label: 'Kilowatt', factor: 1,       min_value: 0,       display_order: 1 },
        { base_unit: 'kW', symbol: 'MW', label: 'Megawatt', factor: 1000,    min_value: 1000,    display_order: 2 },
        { base_unit: 'kW', symbol: 'GW', label: 'Gigawatt', factor: 1000000, min_value: 1000000, display_order: 3 },

        // ============================================
        // ENERGÍA REACTIVA (VArh)
        // ============================================
        { base_unit: 'VArh', symbol: 'VArh',  label: 'Volt-ampere reactivo hora',       factor: 1,       min_value: 0,       display_order: 1 },
        { base_unit: 'VArh', symbol: 'kVArh', label: 'Kilovolt-ampere reactivo hora',   factor: 1000,    min_value: 1000,    display_order: 2 },
        { base_unit: 'VArh', symbol: 'MVArh', label: 'Megavolt-ampere reactivo hora',   factor: 1000000, min_value: 1000000, display_order: 3 },

        // ============================================
        // ENERGÍA APARENTE (VAh)
        // ============================================
        { base_unit: 'VAh', symbol: 'VAh',  label: 'Volt-ampere hora',       factor: 1,       min_value: 0,       display_order: 1 },
        { base_unit: 'VAh', symbol: 'kVAh', label: 'Kilovolt-ampere hora',   factor: 1000,    min_value: 1000,    display_order: 2 },
        { base_unit: 'VAh', symbol: 'MVAh', label: 'Megavolt-ampere hora',   factor: 1000000, min_value: 1000000, display_order: 3 },

        // ============================================
        // POTENCIA APARENTE (VA)
        // ============================================
        { base_unit: 'VA', symbol: 'VA',  label: 'Volt-ampere',       factor: 1,       min_value: 0,       display_order: 1 },
        { base_unit: 'VA', symbol: 'kVA', label: 'Kilovolt-ampere',   factor: 1000,    min_value: 1000,    display_order: 2 },
        { base_unit: 'VA', symbol: 'MVA', label: 'Megavolt-ampere',   factor: 1000000, min_value: 1000000, display_order: 3 },

        // ============================================
        // POTENCIA REACTIVA (VArx — para variables de potencia reactiva)
        // ============================================
        { base_unit: 'VArx', symbol: 'var',  label: 'Volt-ampere reactivo',       factor: 1,       min_value: 0,       display_order: 1 },
        { base_unit: 'VArx', symbol: 'kvar', label: 'Kilovolt-ampere reactivo',   factor: 1000,    min_value: 1000,    display_order: 2 },
        { base_unit: 'VArx', symbol: 'Mvar', label: 'Megavolt-ampere reactivo',   factor: 1000000, min_value: 1000000, display_order: 3 },

        // ============================================
        // CORRIENTE (A)
        // Para valores < 1A se muestra en mA; ≥ 1A en A; ≥ 1000A en kA
        // ============================================
        { base_unit: 'A', symbol: 'mA', label: 'Miliampere',  factor: 0.001, min_value: 0,    display_order: 1 },
        { base_unit: 'A', symbol: 'A',  label: 'Ampere',      factor: 1,     min_value: 1,    display_order: 2 },
        { base_unit: 'A', symbol: 'kA', label: 'Kiloampere',  factor: 1000,  min_value: 1000, display_order: 3 },

        // ============================================
        // VOLTAJE (V)
        // ============================================
        { base_unit: 'V', symbol: 'V',  label: 'Volt',      factor: 1,    min_value: 0,    display_order: 1 },
        { base_unit: 'V', symbol: 'kV', label: 'Kilovolt',  factor: 1000, min_value: 1000, display_order: 2 },

        // ============================================
        // VOLUMEN (m3)
        // Para pequeños volúmenes se muestra en litros
        // ============================================
        { base_unit: 'm3', symbol: 'L',    label: 'Litro',               factor: 0.001, min_value: 0,    display_order: 1 },
        { base_unit: 'm3', symbol: 'm³',   label: 'Metro cúbico',        factor: 1,     min_value: 1,    display_order: 2 },
        { base_unit: 'm3', symbol: 'dam³', label: 'Decámetro cúbico',    factor: 1000,  min_value: 1000, display_order: 3 },

        // ============================================
        // CAUDAL (m3/h)
        // ============================================
        { base_unit: 'm3/h', symbol: 'L/h',   label: 'Litros por hora',          factor: 0.001, min_value: 0, display_order: 1 },
        { base_unit: 'm3/h', symbol: 'm³/h',  label: 'Metros cúbicos por hora',  factor: 1,     min_value: 1, display_order: 2 },

        // ============================================
        // BTU — ENERGÍA TÉRMICA
        // ============================================
        { base_unit: 'BTU', symbol: 'BTU',  label: 'British Thermal Unit', factor: 1,       min_value: 0,       display_order: 1 },
        { base_unit: 'BTU', symbol: 'kBTU', label: 'Kilo BTU',             factor: 1000,    min_value: 1000,    display_order: 2 },
        { base_unit: 'BTU', symbol: 'MBTU', label: 'Mega BTU',             factor: 1000000, min_value: 1000000, display_order: 3 },

        // ============================================
        // BTU/h — POTENCIA TÉRMICA
        // ============================================
        { base_unit: 'BTU/h', symbol: 'BTU/h',  label: 'BTU por hora',      factor: 1,       min_value: 0,       display_order: 1 },
        { base_unit: 'BTU/h', symbol: 'kBTU/h', label: 'kBTU por hora',     factor: 1000,    min_value: 1000,    display_order: 2 },
        { base_unit: 'BTU/h', symbol: 'MBTU/h', label: 'MBTU por hora',     factor: 1000000, min_value: 1000000, display_order: 3 },

        // ============================================
        // DISTANCIA (cm como base)
        // ============================================
        { base_unit: 'cm', symbol: 'cm', label: 'Centímetro', factor: 1,      min_value: 0,      display_order: 1 },
        { base_unit: 'cm', symbol: 'm',  label: 'Metro',      factor: 100,    min_value: 100,    display_order: 2 },
        { base_unit: 'cm', symbol: 'km', label: 'Kilómetro',  factor: 100000, min_value: 100000, display_order: 3 },

        // ============================================
        // PRESIÓN (hPa como base)
        // ============================================
        { base_unit: 'hPa', symbol: 'hPa', label: 'Hectopascal', factor: 1,    min_value: 0,      display_order: 1 },
        { base_unit: 'hPa', symbol: 'kPa', label: 'Kilopascal',  factor: 10,   min_value: 1000,   display_order: 2 },
        { base_unit: 'hPa', symbol: 'bar', label: 'Bar',         factor: 1000, min_value: 100000, display_order: 3 },

        // ============================================
        // PRESIÓN (mbar como base)
        // ============================================
        { base_unit: 'mbar', symbol: 'mbar', label: 'Milibar', factor: 1,    min_value: 0,    display_order: 1 },
        { base_unit: 'mbar', symbol: 'bar',  label: 'Bar',     factor: 1000, min_value: 1000, display_order: 2 },

        // ============================================
        // FRECUENCIA (Hz)
        // ============================================
        { base_unit: 'Hz', symbol: 'Hz',  label: 'Hertz',      factor: 1,       min_value: 0,       display_order: 1 },
        { base_unit: 'Hz', symbol: 'kHz', label: 'Kilohertz',  factor: 1000,    min_value: 1000,    display_order: 2 },
        { base_unit: 'Hz', symbol: 'MHz', label: 'Megahertz',  factor: 1000000, min_value: 1000000, display_order: 3 },

        // ============================================
        // CONCENTRACIÓN CO2 / GASES (ppm)
        // ============================================
        { base_unit: 'ppm', symbol: 'ppm',  label: 'Partes por millón',  factor: 1,     min_value: 0,     display_order: 1 },
        { base_unit: 'ppm', symbol: '%vol', label: 'Porcentaje volumen', factor: 10000, min_value: 10000, display_order: 2 },

        // ============================================
        // ILUMINANCIA (lux)
        // ============================================
        { base_unit: 'lux', symbol: 'lux',  label: 'Lux',      factor: 1,    min_value: 0,    display_order: 1 },
        { base_unit: 'lux', symbol: 'klux', label: 'Kilolux',  factor: 1000, min_value: 1000, display_order: 2 }
    ];

    for (const scale of scales) {
        await sequelize.query(
            `INSERT INTO unit_scales (base_unit, symbol, label, factor, min_value, display_order, is_active, created_at, updated_at)
             VALUES (:base_unit, :symbol, :label, :factor, :min_value, :display_order, true, NOW(), NOW())
             ON CONFLICT (base_unit, symbol) DO NOTHING`,
            { replacements: scale }
        );
    }

    console.log(`✓ unit_scales: ${scales.length} escalas cargadas`);
};
