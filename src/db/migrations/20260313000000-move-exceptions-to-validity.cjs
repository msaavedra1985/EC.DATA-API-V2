'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Check current state of schedule_exceptions columns
        const tableDescription = await queryInterface.describeTable('schedule_exceptions');
        const hasScheduleId = !!tableDescription.schedule_id;
        const hasValidityId = !!tableDescription.validity_id;

        // 1. Eliminar todas las excepciones existentes (migración manual)
        await queryInterface.sequelize.query('TRUNCATE TABLE schedule_exceptions CASCADE');

        // 2. Eliminar FK constraint actual (schedule_id -> schedules) si existe
        if (hasScheduleId) {
            try {
                await queryInterface.removeConstraint(
                    'schedule_exceptions',
                    'schedule_exceptions_schedule_id_fkey'
                );
            } catch (e) {
                // Constraint may not exist if it was already removed
            }

            // 3. Eliminar índice actual si existe
            await queryInterface.sequelize.query(
                'DROP INDEX IF EXISTS schedule_exceptions_schedule_id_idx'
            );

            // 4. Renombrar columna schedule_id a validity_id
            await queryInterface.renameColumn(
                'schedule_exceptions',
                'schedule_id',
                'validity_id'
            );
        }
        // If validity_id already exists (table already in final state), skip rename steps

        // 5. Eliminar FK constraint de validity_id si ya existe (para recrearla limpiamente)
        try {
            await queryInterface.removeConstraint(
                'schedule_exceptions',
                'schedule_exceptions_validity_id_fkey'
            );
        } catch (e) {
            // Constraint may not exist yet
        }

        // 6. Agregar nueva FK constraint (validity_id -> schedule_validities)
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

        // 7. Crear nuevo índice (IF NOT EXISTS es seguro)
        await queryInterface.sequelize.query(
            'CREATE INDEX IF NOT EXISTS schedule_exceptions_validity_id_idx ON schedule_exceptions (validity_id)'
        );

        // 8. Agregar columna exceptions_count a schedule_validities (si no existe)
        await queryInterface.sequelize.query(`
            ALTER TABLE schedule_validities ADD COLUMN IF NOT EXISTS exceptions_count INTEGER NOT NULL DEFAULT 0;
        `);

        // 9. Eliminar columna exceptions_count de schedules (si existe)
        await queryInterface.sequelize.query(`
            ALTER TABLE schedules DROP COLUMN IF EXISTS exceptions_count;
        `);
    },

    async down(queryInterface, Sequelize) {
        // 1. Agregar de vuelta exceptions_count a schedules
        await queryInterface.sequelize.query(`
            ALTER TABLE schedules ADD COLUMN IF NOT EXISTS exceptions_count INTEGER NOT NULL DEFAULT 0;
        `);

        // 2. Eliminar exceptions_count de schedule_validities
        await queryInterface.sequelize.query(`
            ALTER TABLE schedule_validities DROP COLUMN IF EXISTS exceptions_count;
        `);

        // 3. Truncar excepciones (no se pueden migrar de vuelta)
        await queryInterface.sequelize.query('TRUNCATE TABLE schedule_exceptions CASCADE');

        // 4. Eliminar FK constraint actual
        try {
            await queryInterface.removeConstraint(
                'schedule_exceptions',
                'schedule_exceptions_validity_id_fkey'
            );
        } catch (e) {
            // Constraint may not exist
        }

        // 5. Eliminar índice
        await queryInterface.sequelize.query(
            'DROP INDEX IF EXISTS schedule_exceptions_validity_id_idx'
        );

        // 6. Check state before renaming
        const tableDescription = await queryInterface.describeTable('schedule_exceptions');
        if (tableDescription.validity_id && !tableDescription.schedule_id) {
            // 7. Renombrar columna validity_id a schedule_id
            await queryInterface.renameColumn(
                'schedule_exceptions',
                'validity_id',
                'schedule_id'
            );

            // 8. Agregar FK constraint original
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

            // 9. Crear índice original
            await queryInterface.sequelize.query(
                'CREATE INDEX IF NOT EXISTS schedule_exceptions_schedule_id_idx ON schedule_exceptions (schedule_id)'
            );
        }
    }
};
