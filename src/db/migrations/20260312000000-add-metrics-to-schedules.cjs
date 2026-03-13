'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Agregar validities_count a schedules
        await queryInterface.addColumn('schedules', 'validities_count', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Contador de vigencias totales (cache)'
        });

        // Agregar exceptions_count a schedules
        await queryInterface.addColumn('schedules', 'exceptions_count', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Contador de excepciones totales (cache)'
        });

        // Agregar ranges_count a schedule_validities
        await queryInterface.addColumn('schedule_validities', 'ranges_count', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Contador de rangos horarios totales (cache)'
        });

        // Agregar week_coverage_percent a schedule_validities
        await queryInterface.addColumn('schedule_validities', 'week_coverage_percent', {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Porcentaje de cobertura semanal (0.00-100.00)'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('schedule_validities', 'week_coverage_percent');
        await queryInterface.removeColumn('schedule_validities', 'ranges_count');
        await queryInterface.removeColumn('schedules', 'exceptions_count');
        await queryInterface.removeColumn('schedules', 'validities_count');
    }
};
