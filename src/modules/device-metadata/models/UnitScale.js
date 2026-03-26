import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Escalas de Unidad
 * Define cómo escddress s para display visual.
 * Ej: Wh → kWh (×1000) → MWh (×1M)
 * 
 * Lógica de uso: ordenar por minValue DESC, tomar la primera donde rawValue >= minValue.
 * displayed = rawValue / factor
 */
const UnitScale = sequelize.define('UnitScale', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    baseUnit: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Unidad base del sensor (coincide con variables.unit, ej: Wh, W, A)'
    },
    symbol: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Símbolo de display (ej: kWh, MWh, GWh)'
    },
    label: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre descriptivo (ej: Kilowattora)'
    },
    factor: {
        type: DataTypes.DECIMAL(20, 10),
        allowNull: false,
        defaultValue: 1,
        comment: 'Divisor: valor_display = raw_value / factor'
    },
    minValue: {
        type: DataTypes.DECIMAL(20, 10),
        allowNull: false,
        defaultValue: 0,
        comment: 'Umbral mínimo del raw value para activar esta escala'
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'unit_scales',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            unique: true,
            fields: ['base_unit', 'symbol'],
            name: 'unit_scales_base_unit_symbol_idx'
        },
        {
            fields: ['base_unit'],
            name: 'unit_scales_base_unit_idx'
        }
    ]
});

export default UnitScale;
