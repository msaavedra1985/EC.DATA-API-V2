/**
 * Repositorio de Annotations
 *
 * Operaciones de base de datos para anotaciones de telemetría.
 */
import { Op } from 'sequelize';
import Annotation from '../models/Annotation.js';
import User from '../../auth/models/User.js';

/**
 * Obtiene anotaciones de un canal en un rango de fechas, respetando visibilidad.
 *
 * @param {string} channelId - UUID del canal
 * @param {number} fromMs    - Unix ms inicio del período
 * @param {number} toMs      - Unix ms fin del período
 * @param {string} requesterId  - UUID del usuario que realiza la consulta (ve sus privadas + todas las públicas)
 * @returns {Promise<Array>}
 */
export const findAnnotations = async (channelId, fromMs, toMs, requesterId) => {
    const where = {
        channelId,
        fromTs: { [Op.lte]: toMs },
        toTs:   { [Op.gte]: fromMs },
        [Op.or]: [
            { visibility: 'public' },
            { authorId: requesterId }
        ]
    };

    const rows = await Annotation.findAll({
        where,
        include: [
            {
                model: User,
                as: 'author',
                attributes: ['id', 'firstName', 'lastName']
            }
        ],
        order: [['fromTs', 'ASC']]
    });

    return rows.map(formatAnnotation);
};

/**
 * Crea una nueva anotación.
 *
 * @param {Object} data
 * @param {string} data.channelId
 * @param {number} data.fromTs
 * @param {number} data.toTs
 * @param {string} data.text
 * @param {string} data.category
 * @param {string} data.visibility
 * @param {string} data.authorId
 * @returns {Promise<Object>}
 */
export const createAnnotation = async (data) => {
    const annotation = await Annotation.create(data);

    const full = await Annotation.findByPk(annotation.id, {
        include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] }]
    });

    return formatAnnotation(full);
};

/**
 * Actualiza una anotación existente.
 *
 * @param {string} annotationId
 * @returns {Promise<Object|null>} - Retorna la anotación actualizada o null si no existe
 */
export const updateAnnotation = async (annotationId, fields) => {
    const annotation = await Annotation.findByPk(annotationId);
    if (!annotation) return null;

    await annotation.update(fields);

    const full = await Annotation.findByPk(annotationId, {
        include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] }]
    });

    return formatAnnotation(full);
};

/**
 * Elimina una anotación.
 *
 * @param {string} annotationId
 * @returns {Promise<boolean>}
 */
export const deleteAnnotation = async (annotationId) => {
    const annotation = await Annotation.findByPk(annotationId);
    if (!annotation) return false;

    await annotation.destroy();
    return true;
};

/**
 * Busca una anotación por id (raw, sin formato).
 *
 * @param {string} annotationId
 * @returns {Promise<Annotation|null>}
 */
export const findAnnotationById = async (annotationId) => {
    return Annotation.findByPk(annotationId);
};

/**
 * Formatea una instancia de Annotation al contrato de respuesta.
 */
const formatAnnotation = (annotation) => ({
    id:          annotation.id,
    channelId:   annotation.channelId,
    from:        Number(annotation.fromTs),
    to:          Number(annotation.toTs),
    text:        annotation.text,
    category:    annotation.category,
    visibility:  annotation.visibility,
    author: annotation.author
        ? {
            id: annotation.author.id,
            name: `${annotation.author.firstName} ${annotation.author.lastName}`.trim()
          }
        : { id: annotation.authorId, name: null },
    attachments: [],
    createdAt:   annotation.createdAt,
    updatedAt:   annotation.updatedAt
});
