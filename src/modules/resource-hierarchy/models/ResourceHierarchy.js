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
    humanId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        unique: true,
        comment: 'ID incremental global para uso interno/soporte'
    },
    publicCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: RES-7K9D2-X) - previene enumeración'
    },
    organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'organizations',
            key: 'id'
        },
        comment: 'FK a organizations - cada org tiene su propia jerarquía aislada'
    },
    parentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'resource_hierarchy',
            key: 'id'
        },
        comment: 'FK self-reference - nodo padre (null para nodos raíz)'
    },
    nodeType: {
        type: DataTypes.ENUM('folder', 'site', 'channel'),
        allowNull: false,
        comment: 'Tipo de nodo: folder, site, channel'
    },
    referenceId: {
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
    displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Orden de visualización entre hermanos (menor = primero)'
    },
    assetCategoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'asset_categories',
            key: 'id'
        },
        comment: 'FK a asset_categories - tag asignado al nodo (principalmente para node_type=channel)'
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
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el nodo está activo'
    }
}, {
    tableName: 'resource_hierarchy',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
        { fields: ['organization_id'] },
        { fields: ['parent_id'] },
        { fields: ['node_type'] },
        { fields: ['reference_id'] },
        { fields: ['is_active'] }
    ],
    hooks: {
        beforeCreate: (instance) => {
            if (!instance.publicCode) {
                instance.publicCode = generatePublicCode('RES');
            }
        },
        beforeValidate: (instance) => {
            if ((instance.nodeType === 'site' || instance.nodeType === 'channel') && !instance.referenceId) {
                if (instance.isNewRecord) {
                }
            }
        }
    },
    comment: 'Jerarquía de recursos para organizar carpetas, sites y canales por organización'
});

ResourceHierarchy.hasMany(ResourceHierarchy, {
    foreignKey: 'parentId',
    as: 'children'
});

ResourceHierarchy.belongsTo(ResourceHierarchy, {
    foreignKey: 'parentId',
    as: 'parent'
});

/**
 * Asociaciones con otros modelos
 * Llamada desde el inicializador de modelos
 */
ResourceHierarchy.associate = (models) => {
    ResourceHierarchy.belongsTo(models.Organization, {
        foreignKey: 'organizationId',
        as: 'organization'
    });

    ResourceHierarchy.belongsTo(models.AssetCategory, {
        foreignKey: 'assetCategoryId',
        as: 'assetCategory'
    });
};

export default ResourceHierarchy;
