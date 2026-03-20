'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Agregar validities_count a schedules (si no existe)
        await queryInterface.sequelize.query(`
            ALTER TABLE schedules ADD COLUMN IF NOT EXISTS validities_count INTEGER NOT NULL DEFAULT 0;
        `);

        // Agregar exceptions_count a schedules (si no existe)
        // Note: migration 20260313000000 will later remove this column from schedules.
        // If already removed (i.e., this table is in the final state), this is a no-op.
        await queryInterface.sequelize.query(`
            ALTER TABLE schedules ADD COLUMN IF NOT EXISTS exceptions_count INTEGER NOT NULL DEFAULT 0;
        `);

        // Agregar ranges_count a schedule_validities (si no existe)
        await queryInterface.sequelize.query(`
            ALTER TABLE schedule_validities ADD COLUMN IF NOT EXISTS ranges_count INTEGER NOT NULL DEFAULT 0;
        `);

        // Agregar week_coverage_percent a schedule_validities (si no existe)
        await queryInterface.sequelize.query(`
            ALTER TABLE schedule_validities ADD COLUMN IF NOT EXISTS week_coverage_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00;
        `);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
            ALTER TABLE schedule_validities DROP COLUMN IF EXISTS week_coverage_percent;
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE schedule_validities DROP COLUMN IF EXISTS ranges_count;
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE schedules DROP COLUMN IF EXISTS exceptions_count;
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE schedules DROP COLUMN IF EXISTS validities_count;
        `);
    }
};
