'use strict';

/**
 * Migración para agregar campo impersonated_org_id a audit_logs
 * 
 * Este campo registra cuando un system-admin actúa en nombre de otra organización
 * Es crítico para auditoría de seguridad y compliance
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('audit_logs', 'impersonated_org_id', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'organizations',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            comment: 'ID de la organización impersonada por system-admin (null si no hay impersonación)'
        });
        
        await queryInterface.addIndex('audit_logs', ['impersonated_org_id'], {
            name: 'idx_audit_logs_impersonated_org_id',
            where: {
                impersonated_org_id: { [Sequelize.Op.ne]: null }
            }
        });
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_impersonated_org_id');
        await queryInterface.removeColumn('audit_logs', 'impersonated_org_id');
    }
};
