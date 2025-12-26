import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import { generateUuidV7 } from '../../../utils/identifiers.js';

/**
 * Modelo UserResourceAccess (Acceso de Usuario a Recursos)
 * 
 * Define qué usuarios tienen acceso a qué nodos de la jerarquía de recursos.
 * Soporta herencia de permisos a descendientes mediante el flag include_descendants.
 * 
 * Niveles de acceso:
 * - view: solo lectura de datos
 * - edit: modificar datos del nodo
 * - admin: gestionar permisos del nodo
 * 
 * Herencia:
 * - Si include_descendants = true, el acceso se propaga a todos los nodos hijos
 * - Útil para dar acceso a una carpeta y todos sus contenidos
 */
const UserResourceAccess = sequelize.define('UserResourceAccess', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => generateUuidV7(),
        comment: 'UUID v7 - clave primaria'
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'FK a users - usuario que recibe el acceso'
    },
    resource_node_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'resource_hierarchy',
            key: 'id'
        },
        comment: 'FK a resource_hierarchy - nodo al que se otorga acceso'
    },
    organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'organizations',
            key: 'id'
        },
        comment: 'FK a organizations - denormalizado para queries rápidas'
    },
    access_type: {
        type: DataTypes.ENUM('view', 'edit', 'admin'),
        allowNull: false,
        defaultValue: 'view',
        comment: 'Nivel de acceso: view (solo lectura), edit (modificar), admin (gestionar permisos)'
    },
    include_descendants: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Si true, el acceso se hereda a todos los nodos descendientes'
    },
    granted_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'FK a users - usuario que otorgó este acceso'
    },
    granted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha en que se otorgó el acceso'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de expiración del acceso (null = permanente)'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas o razón del otorgamiento de acceso'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Permite desactivar el acceso sin eliminar el registro'
    }
}, {
    tableName: 'user_resource_access',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'resource_node_id'],
            name: 'user_resource_access_unique_idx'
        },
        { fields: ['user_id'] },
        { fields: ['resource_node_id'] },
        { fields: ['organization_id'] },
        { fields: ['is_active'] }
    ],
    comment: 'Permisos de acceso de usuarios a nodos de la jerarquía de recursos'
});

export default UserResourceAccess;
