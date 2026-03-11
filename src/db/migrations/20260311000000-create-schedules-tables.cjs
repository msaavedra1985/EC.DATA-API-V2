'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. schedules (tabla raíz)
        await queryInterface.createTable('schedules', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false
            },
            public_code: {
                type: Sequelize.STRING(20),
                allowNull: false,
                unique: true,
                comment: 'Código público legible (SCH-XXX-XXX)'
            },
            organization_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            name: {
                type: Sequelize.STRING(200),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });

        await queryInterface.sequelize.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS schedules_public_code_idx ON schedules (public_code)`
        );
        await queryInterface.sequelize.query(
            `CREATE INDEX IF NOT EXISTS schedules_organization_id_idx ON schedules (organization_id)`
        );

        // 2. schedule_exceptions
        await queryInterface.createTable('schedule_exceptions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            schedule_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'schedules', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            name: { type: Sequelize.STRING(200), allowNull: false },
            type: {
                type: Sequelize.ENUM('closed', 'special'),
                allowNull: false,
                defaultValue: 'closed'
            },
            date:          { type: Sequelize.DATEONLY, allowNull: false },
            repeat_yearly: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });

        await queryInterface.sequelize.query(
            `CREATE INDEX IF NOT EXISTS schedule_exceptions_schedule_id_idx ON schedule_exceptions (schedule_id)`
        );
        await queryInterface.sequelize.query(
            `CREATE INDEX IF NOT EXISTS schedule_exceptions_date_idx ON schedule_exceptions (date)`
        );

        // 3. schedule_validities
        await queryInterface.createTable('schedule_validities', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            schedule_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'schedules', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            valid_from: { type: Sequelize.DATEONLY, allowNull: true },
            valid_to:   { type: Sequelize.DATEONLY, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });

        await queryInterface.sequelize.query(
            `CREATE INDEX IF NOT EXISTS schedule_validities_schedule_id_idx ON schedule_validities (schedule_id)`
        );

        // 4. schedule_time_profiles
        await queryInterface.createTable('schedule_time_profiles', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            validity_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'schedule_validities', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            name: { type: Sequelize.STRING(200), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });

        await queryInterface.sequelize.query(
            `CREATE INDEX IF NOT EXISTS schedule_time_profiles_validity_id_idx ON schedule_time_profiles (validity_id)`
        );

        // 5. schedule_time_ranges
        await queryInterface.createTable('schedule_time_ranges', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            time_profile_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'schedule_time_profiles', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            day_of_week: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'ISO 8601: 1=Lunes, 7=Domingo'
            },
            start_time: {
                type: Sequelize.STRING(5),
                allowNull: false,
                comment: 'HH:mm'
            },
            end_time: {
                type: Sequelize.STRING(5),
                allowNull: false,
                comment: 'HH:mm (24:00 es válido)'
            },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });

        await queryInterface.sequelize.query(
            `CREATE INDEX IF NOT EXISTS schedule_time_ranges_profile_id_idx ON schedule_time_ranges (time_profile_id)`
        );
        await queryInterface.sequelize.query(
            `CREATE INDEX IF NOT EXISTS schedule_time_ranges_day_idx ON schedule_time_ranges (day_of_week)`
        );
    },

    async down(queryInterface) {
        await queryInterface.dropTable('schedule_time_ranges');
        await queryInterface.dropTable('schedule_time_profiles');
        await queryInterface.dropTable('schedule_validities');
        await queryInterface.dropTable('schedule_exceptions');
        await queryInterface.dropTable('schedules');
    }
};
