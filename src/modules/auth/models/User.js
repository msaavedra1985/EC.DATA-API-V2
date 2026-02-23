import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import Role from './Role.js';
import Organization from '../../organizations/models/Organization.js';

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            comment: 'UUID v7 - clave primaria time-ordered'
        },
        humanId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'ID incremental scoped por organization_id (solo uso interno/soporte)'
        },
        publicCode: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'ID público opaco (ej: EC-7K9D2-X) - previene enumeración'
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: {
                    msg: 'Debe ser un email válido'
                }
            },
            comment: 'Email único para login'
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Nombre de usuario único para login (formato: primera letra nombre + apellido)'
        },
        passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'Hash bcrypt de la contraseña (nunca devolver al cliente)'
        },
        firstName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Nombre del usuario'
        },
        lastName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Apellido del usuario'
        },
        roleId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'roles',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
            comment: 'FK a roles table para RBAC'
        },
        organizationId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'organizations',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
            comment: 'FK a organizations para multi-tenancy (null = usuario global)'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            comment: 'Usuario activo/inactivo (soft disable)'
        },
        lastLoginAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Última fecha de login exitoso'
        },
        emailVerifiedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Fecha de verificación de email (null = no verificado)'
        },
        phone: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Número de teléfono del usuario (formato internacional)'
        },
        language: {
            type: DataTypes.STRING(5),
            allowNull: true,
            defaultValue: 'es',
            comment: 'Idioma preferido del usuario (es, en)'
        },
        timezone: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: 'America/Argentina/Buenos_Aires',
            comment: 'Zona horaria del usuario (formato IANA)'
        },
        avatarUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'URL del avatar del usuario (puede ser URL larga de storage)'
        }
    },
    {
        tableName: 'users',
        comment: 'Usuarios del sistema con autenticación JWT',
        indexes: [
            {
                unique: true,
                fields: ['email'],
                name: 'users_email_unique'
            },
            {
                unique: true,
                fields: ['public_code'],
                name: 'users_public_code_unique'
            },
            {
                unique: true,
                fields: ['organization_id', 'human_id'],
                name: 'users_org_human_id_unique',
                comment: 'human_id es único dentro de cada organización'
            },
            {
                fields: ['organization_id'],
                name: 'users_organization_id_idx'
            },
            {
                fields: ['role_id'],
                name: 'users_role_id_idx'
            },
            {
                fields: ['is_active'],
                name: 'users_is_active_idx'
            }
        ]
    }
);

User.belongsTo(Role, {
    foreignKey: 'roleId',
    as: 'role'
});

User.belongsToMany(Organization, {
    through: 'user_organizations',
    foreignKey: 'userId',
    otherKey: 'organizationId',
    as: 'organizations'
});

User.prototype.hasRole = function (roleName) {
    return this.role && this.role.name === roleName;
};

User.prototype.isSystemAdmin = function () {
    return this.hasRole('system-admin');
};

User.prototype.isOrgAdmin = function () {
    return this.hasRole('org-admin');
};

User.prototype.getFullName = function () {
    return `${this.firstName} ${this.lastName}`.trim();
};

export default User;
