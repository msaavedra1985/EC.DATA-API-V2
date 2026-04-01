'use strict';

/**
 * Migración: Agregar columna unit_scaling (JSONB) a la tabla variables
 * 
 * La columna almacena la configuración de escalado de unidad para una variable:
 * { threshold: number, scaledUnit: string, factor: number, scaledDecimalPlaces: number }
 * 
 * Esto permite al frontend Data Analyzer escalar automáticamente los valores
 * cuando superan un umbral (ej: Wh → kWh cuando supera 100,000 Wh)
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('variables', 'unit_scaling', {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: null,
            comment: 'Configuración de escalado de unidad: { threshold, scaledUnit, factor, scaledDecimalPlaces }'
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('variables', 'unit_scaling');
    }
};
