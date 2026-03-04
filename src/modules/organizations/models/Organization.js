import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Organización
 * Usa sistema triple identificador: UUID v7 + human_id + public_code
 * 
 * - id: UUID v7 (clave primaria, usado en FKs)
 * - human_id: incremental global (sin scope, solo para uso interno/soporte)
 * - public_code: ID opaco público (formato: ORG-XXXXX-Y)
 */
const Organization = sequelize.define('Organization', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    humanId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        comment: 'ID incremental global para uso interno/soporte'
    },
    publicCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: ORG-7K9D2-X) - previene enumeración'
    },
    slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Slug único de la organización (ej: acme, techcorp)'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre de la organización'
    },
    parentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'organizations',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a organizations - organización padre (null = raíz)'
    },
    logoUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL del logo de la organización'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción de la organización'
    },
    taxId: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Identificación fiscal (CUIT, RFC, EIN, etc.)'
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
            isEmail: true
        },
        comment: 'Email de contacto de la organización'
    },
    phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Teléfono de contacto'
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Dirección física de la organización'
    },
    config: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Configuración JSON de la organización (theme, formatos, preferencias)'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la organización está activa'
    }
}, {
    tableName: 'organizations',
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft delete
    indexes: [
        {
            fields: ['public_code']
        },
        {
            fields: ['human_id']
        },
        {
            fields: ['slug']
        },
        {
            fields: ['parent_id']
        },
        {
            fields: ['is_active']
        },
        {
            fields: ['email']
        }
    ],
    comment: 'Organizaciones/tenants del sistema con identificadores UUID v7'
});

// Relación jerárquica: organización padre
Organization.belongsTo(Organization, {
    foreignKey: 'parentId',
    as: 'parent'
});

// Relación jerárquica: organizaciones hijas
Organization.hasMany(Organization, {
    foreignKey: 'parentId',
    as: 'children'
});

export default Organization;
