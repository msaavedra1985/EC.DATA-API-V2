import { DataTypes } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';

const Annotation = sequelize.define('Annotation', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        comment: 'UUID - clave primaria'
    },
    channelId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'channels',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'FK a channels - canal al que pertenece la anotación'
    },
    fromTs: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Timestamp inicio en Unix ms. Si fromTs === toTs es point-in-time'
    },
    toTs: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Timestamp fin en Unix ms. Si fromTs === toTs es point-in-time'
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Contenido de la anotación'
    },
    category: {
        type: DataTypes.ENUM('observation', 'incident', 'maintenance', 'alert_auto'),
        allowNull: false,
        defaultValue: 'observation',
        comment: 'Categoría de la anotación'
    },
    visibility: {
        type: DataTypes.ENUM('public', 'private'),
        allowNull: false,
        defaultValue: 'public',
        comment: 'Visibilidad: public (todos) o private (solo el autor)'
    },
    authorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a users - usuario que creó la anotación'
    }
}, {
    tableName: 'annotations',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        { fields: ['channel_id'] },
        { fields: ['author_id'] },
        { fields: ['channel_id', 'from_ts', 'to_ts'], name: 'annotations_channel_range_idx' }
    ],
    comment: 'Anotaciones sobre puntos o rangos de tiempo en canales de telemetría'
});

export default Annotation;
