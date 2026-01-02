import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import { generateUuidV7, generatePublicCode } from '../../../utils/identifiers.js';

/**
 * Modelo ResourceHierarchy (Jerarquía de Recursos)
 * 
 * Implementa un árbol jerárquico para organizar recursos (carpetas, sites, canales)
 * usando el patrón híbrido parent_id + ltree path.
 * 
 * Características:
 * - Profundidad ilimitada
 * - Cada organización tiene su jerarquía aislada
 * - Path ltree actualizado automáticamente por trigger de BD
 * - Soporta operaciones eficientes de ancestros/descendientes
 * 
 * Tipos de nodo:
 * - folder: carpeta organizadora
 * - site: ubicación física (referencia a tabla sites)
 * - channel: canal de medición (referencia a tabla channels)
 */
const ResourceHierarchy = sequelize.define('ResourceHierarchy', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => generateUuidV7(),
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    human_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        unique: true,
        comment: 'ID incremental global para uso interno/soporte'
    },
    public_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: RES-7K9D2-X) - previene enumeración'
    },
    organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'organizations',
            key: 'id'
        },
        comment: 'FK a organizations - cada org tiene su propia jerarquía aislada'
    },
    parent_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'resource_hierarchy',
            key: 'id'
        },
        comment: 'FK self-reference - nodo padre (null para nodos raíz)'
    },
    // Nota: path ltree es manejado por el trigger de BD, no por Sequelize
    node_type: {
        type: DataTypes.ENUM('folder', 'site', 'channel'),
        allowNull: false,
        comment: 'Tipo de nodo: folder, site, channel'
    },
    reference_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Public code del recurso referenciado (ej: CHN-5LYJX-4, SIT-xxx). Null para carpetas.'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 200]
        },
        comment: 'Nombre visible del nodo en la jerarquía'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción opcional del nodo'
    },
    icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Icono para mostrar en el árbol (ej: folder, building, sensor)'
    },
    display_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Orden de visualización entre hermanos (menor = primero)'
    },
    depth: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Profundidad en el árbol (0 = raíz). Calculado automáticamente por trigger.'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadatos adicionales del nodo'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el nodo está activo'
    }
}, {
    tableName: 'resource_hierarchy',
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft delete con deleted_at
    indexes: [
        { fields: ['organization_id'] },
        { fields: ['parent_id'] },
        { fields: ['node_type'] },
        { fields: ['reference_id'] },
        { fields: ['is_active'] }
    ],
    hooks: {
        // Hook para generar public_code antes de crear
        beforeCreate: (instance) => {
            if (!instance.public_code) {
                instance.public_code = generatePublicCode('RES', instance.id);
            }
        },
        // Validación: si es site o channel, debe tener reference_id
        beforeValidate: (instance) => {
            if ((instance.node_type === 'site' || instance.node_type === 'channel') && !instance.reference_id) {
                // Solo validar en creación, no en updates parciales
                if (instance.isNewRecord) {
                    // Permitir null temporalmente - se puede agregar después
                    // throw new Error(`${instance.node_type} nodes must have a reference_id`);
                }
            }
        }
    },
    comment: 'Jerarquía de recursos para organizar carpetas, sites y canales por organización'
});

// Auto-referencia para relación padre-hijo
ResourceHierarchy.hasMany(ResourceHierarchy, {
    foreignKey: 'parent_id',
    as: 'children'
});

ResourceHierarchy.belongsTo(ResourceHierarchy, {
    foreignKey: 'parent_id',
    as: 'parent'
});

export default ResourceHierarchy;
