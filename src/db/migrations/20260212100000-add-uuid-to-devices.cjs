'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('devices', 'uuid', {
      type: Sequelize.STRING(36),
      allowNull: true,
      unique: true,
      comment: 'UUID operativo/externo - asignado por técnicos en campo o sistemas externos'
    });

    await queryInterface.addIndex('devices', ['uuid'], {
      name: 'devices_uuid_unique_idx',
      unique: true,
      where: { uuid: { [Sequelize.Op.ne]: null } }
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('devices', 'devices_uuid_unique_idx');
    await queryInterface.removeColumn('devices', 'uuid');
  }
};
