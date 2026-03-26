import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const OrganizationResourceCounter = sequelize.define('OrganizationResourceCounter', {
    organizationId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        field: 'organization_id',
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    lastValue: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'last_value'
    }
}, {
    tableName: 'organization_resource_counters',
    timestamps: true,
    underscored: true
});

export default OrganizationResourceCounter;
