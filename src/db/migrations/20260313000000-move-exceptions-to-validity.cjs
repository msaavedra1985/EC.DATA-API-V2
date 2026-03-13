'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Eliminar todas las excepciones existentes (migración manual)
        await queryInterface.sequelize.query('TRUNCATE TABLE schedule_exceptions CASCADE');

        // 2. Eliminar FK constraint actual (schedule_id -> schedules)
        await queryInterface.removeConstraint(
            'schedule_exceptions',
            'schedule_exceptions_schedule_id_fkey'
        );

        // 3. Eliminar índice actual
        await queryInterface.sequelize.query(
            'DROP INDEX IF EXISTS schedule_exceptions_schedule_id_idx'
        );

        // 4. Renombrar columna schedule_id a validity_id
        await queryInterface.renameColumn(
            'schedule_exceptions',
            'schedule_id',
            'validity_id'
        );

        // 5. Agregar nueva FK constraint (validity_id -> schedule_validities)
        await queryInterface.addConstraint('schedule_exceptions', {
            fields: ['validity_id'],
            type: 'foreign key',
            name: 'schedule_exceptions_validity_id_fkey',
            references: {
                table: 'schedule_validities',
                field: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        });

        // 6. Crear nuevo índice
        await queryInterface.sequelize.query(
            'CREATE INDEX IF NOT EXISTS schedule_exceptions_validity_id_idx ON schedule_exceptions (validity_id)'
        );

        // 7. Agregar columna exceptions_count a schedule_validities
        await queryInterface.addColumn('schedule_validities', 'exceptions_count', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Contador de excepciones en esta validity (cache)'
        });

        // 8. Eliminar columna exceptions_count de schedules
        await queryInterface.removeColumn('schedules', 'exceptions_count');
    },

    async down(queryInterface, Sequelize) {
        // 1. Agregar de vuelta exceptions_count a schedules
        await queryInterface.addColumn('schedules', 'exceptions_count', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        });

        // 2. Eliminar exceptions_count de schedule_validities
        await queryInterface.removeColumn('schedule_validities', 'exceptions_count');

        // 3. Truncar excepciones (no se pueden migrar de vuelta)
        await queryInterface.sequelize.query('TRUNCATE TABLE schedule_exceptions CASCADE');

        // 4. Eliminar FK constraint actual
        await queryInterface.removeConstraint(
            'schedule_exceptions',
            'schedule_exceptions_validity_id_fkey'
        );

        // 5. Eliminar índice
        await queryInterface.sequelize.query(
            'DROP INDEX IF EXISTS schedule_exceptions_validity_id_idx'
        );

        // 6. Renombrar columna validity_id a schedule_id
        await queryInterface.renameColumn(
            'schedule_exceptions',
            'validity_id',
            'schedule_id'
        );

        // 7. Agregar FK constraint original
        await queryInterface.addConstraint('schedule_exceptions', {
            fields: ['schedule_id'],
            type: 'foreign key',
            name: 'schedule_exceptions_schedule_id_fkey',
            references: {
                table: 'schedules',
                field: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        });

        // 8. Crear índice original
        await queryInterface.sequelize.query(
            'CREATE INDEX IF NOT EXISTS schedule_exceptions_schedule_id_idx ON schedule_exceptions (schedule_id)'
        );
    }
};
