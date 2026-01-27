import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Modelo de Site (Locación Física)
 * Usa sistema triple identificador: UUID v7 + human_id + public_code
 * 
 * - id: UUID v7 (clave primaria, usado en FKs)
 * - human_id: incremental global (sin scope, solo para uso interno/soporte)
 * - public_code: ID opaco público (formato: SITE-XXXXX-Y)
 * 
 * Representa una locación física que pertenece a una organización.
 * Usado para gestionar ubicaciones, datos de clima, monedas, formatos locales, etc.
 */
const Site = sequelize.define('Site', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        comment: 'UUID v7 - clave primaria time-ordered'
    },
    human_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        comment: 'ID incremental global para uso interno/soporte'
    },
    public_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'ID público opaco (ej: SITE-7K9D2-X) - previene enumeración'
    },
    organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'organizations',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a organizations - organización a la que pertenece el site'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre del site (ej: "Sucursal Centro", "Planta Norte")'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del site'
    },
    // Geolocalización
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        validate: {
            min: -90,
            max: 90
        },
        comment: 'Latitud GPS (ej: -34.6037389)'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        validate: {
            min: -180,
            max: 180
        },
        comment: 'Longitud GPS (ej: -58.3815704)'
    },
    // Dirección completa
    address: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Dirección completa del site'
    },
    street_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Número de calle'
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Ciudad'
    },
    state_province: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Estado/Provincia/Región'
    },
    postal_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Código postal'
    },
    country_code: {
        type: DataTypes.STRING(2),
        allowNull: false,
        references: {
            model: 'countries',
            key: 'iso_alpha2'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a countries.iso_alpha2 - código ISO del país (ej: AR, US)'
    },
    // Datos adicionales
    timezone: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Zona horaria (ej: America/Argentina/Buenos_Aires)'
    },
    // Características del edificio
    building_type: {
        type: DataTypes.ENUM(
            'office', 'warehouse', 'factory', 'retail', 
            'hospital', 'school', 'datacenter', 'hotel', 
            'restaurant', 'residential', 'mixed', 'other'
        ),
        allowNull: true,
        comment: 'Tipo de edificio o instalación'
    },
    area_m2: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
            min: 0
        },
        comment: 'Área total en metros cuadrados'
    },
    floors: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0
        },
        comment: 'Número de pisos/plantas del edificio'
    },
    operating_hours: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Horario de operación (ej: "Lun-Vie 8:00-18:00")'
    },
    image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL de imagen/foto del site'
    },
    // Datos de contacto del site
    contact_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Nombre del contacto en el site'
    },
    contact_phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Teléfono de contacto del site'
    },
    contact_email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isEmail: true
        },
        comment: 'Email de contacto del site'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el site está activo'
    }
}, {
    tableName: 'sites',
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
            fields: ['organization_id']
        },
        {
            fields: ['country_code']
        },
        {
            fields: ['is_active']
        },
        {
            fields: ['latitude', 'longitude']
        },
        {
            fields: ['city']
        }
    ],
    comment: 'Sites (locaciones físicas) del sistema con identificadores UUID v7'
});

// Relaciones
// Se definen en un archivo separado para evitar dependencias circulares
// Importar Organization y Country después de que Site esté definido

export default Site;
