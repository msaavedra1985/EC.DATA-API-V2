'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('unit_scales', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            base_unit: {
                type: Sequelize.STRING(50),
                allowNull: false,
                comment: 'Unidad base que llega del sensor (coincide con variables.unit)'
            },
            symbol: {
                type: Sequelize.STRING(50),
                allowNull: false,
                comment: 'Símbolo de display (ej: kWh, MWh)'
            },
            label: {
                type: Sequelize.STRING(100),
                allowNull: false,
                comment: 'Nombre descriptivo (ej: Kilowattora)'
            },
            factor: {
                type: Sequelize.DECIMAL(20, 10),
                allowNull: false,
                defaultValue: 1,
                comment: 'Divisor: valor_display = raw_value / factor'
            },
            min_value: {
                type: Sequelize.DECIMAL(20, 10),
                allowNull: false,
                defaultValue: 0,
                comment: 'Umbral mínimo del raw value para activar esta escala'
            },
            display_order: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Orden de display dentro de la familia'
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW')
            }
        });

        await queryInterface.addIndex('unit_scales', ['base_unit', 'symbol'], {
            unique: true,
            name: 'unit_scales_base_unit_symbol_idx'
        });

        await queryInterface.addIndex('unit_scales', ['base_unit'], {
            name: 'unit_scales_base_unit_idx'
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('unit_scales');
    }
};
