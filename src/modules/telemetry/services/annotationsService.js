/**
 * Servicio de Annotations
 *
 * Lógica de negocio para gestión de anotaciones de telemetría.
 */
import {
    findAnnotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    findAnnotationById
} from '../repositories/annotationsRepository.js';

const VALID_CATEGORIES = ['observation', 'incident', 'maintenance', 'alert_auto'];
const VALID_VISIBILITIES = ['public', 'private'];

/**
 * Obtiene anotaciones de un canal para un período.
 *
 * @param {string} channelId
 * @param {string} from  - Fecha ISO (YYYY-MM-DD) o Unix ms
 * @param {string} to    - Fecha ISO (YYYY-MM-DD) o Unix ms
 * @param {Object} requester - { id, roles }
 */
export const getAnnotations = async (channelId, from, to, requester) => {
    const fromMs = parseDateParam(from);
    const toMs   = parseDateParam(to);

    if (isNaN(fromMs) || isNaN(toMs)) {
        const err = new Error('Los parámetros from y to deben ser fechas ISO o timestamps Unix ms válidos');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    if (fromMs > toMs) {
        const err = new Error('El parámetro from debe ser menor o igual a to');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    return findAnnotations(channelId, fromMs, toMs, requester.userId);
};

/**
 * Crea una anotación en el canal.
 *
 * @param {string} channelId
 * @param {Object} body - { from, to, text, category, visibility }
 * @param {Object} requester - { id }
 */
export const postAnnotation = async (channelId, body, requester) => {
    const { from, to, text, category = 'observation', visibility = 'public' } = body;

    if (from === undefined || from === null) {
        const err = new Error('El campo from es requerido');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }
    if (to === undefined || to === null) {
        const err = new Error('El campo to es requerido');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }
    if (!text || typeof text !== 'string' || text.trim() === '') {
        const err = new Error('El campo text es requerido y no puede estar vacío');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }
    if (!VALID_CATEGORIES.includes(category)) {
        const err = new Error(`La categoría debe ser una de: ${VALID_CATEGORIES.join(', ')}`);
        err.code = 'VALIDATION_ERROR';
        throw err;
    }
    if (!VALID_VISIBILITIES.includes(visibility)) {
        const err = new Error(`La visibilidad debe ser una de: ${VALID_VISIBILITIES.join(', ')}`);
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    const fromTs = Number(from);
    const toTs   = Number(to);

    if (!Number.isFinite(fromTs) || !Number.isFinite(toTs)) {
        const err = new Error('Los campos from y to deben ser timestamps Unix ms numéricos');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    if (fromTs > toTs) {
        const err = new Error('El campo from debe ser menor o igual a to');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    return createAnnotation({
        channelId,
        fromTs,
        toTs,
        text: text.trim(),
        category,
        visibility,
        authorId: requester.userId
    });
};

/**
 * Actualiza una anotación. Solo el autor o admin puede editar.
 *
 * @param {string} channelId
 * @param {string} annotationId
 * @param {Object} body
 * @param {Object} requester - { id, roles }
 */
export const putAnnotation = async (channelId, annotationId, body, requester) => {
    const existing = await findAnnotationById(annotationId);

    if (!existing) {
        const err = new Error('Anotación no encontrada');
        err.code = 'NOT_FOUND';
        throw err;
    }

    if (existing.channelId !== channelId) {
        const err = new Error('Anotación no encontrada en este canal');
        err.code = 'NOT_FOUND';
        throw err;
    }

    if (!isAdminUser(requester) && existing.authorId !== requester.userId) {
        const err = new Error('No tienes permisos para editar esta anotación');
        err.code = 'FORBIDDEN';
        throw err;
    }

    const fields = {};

    if (body.from !== undefined) {
        const fromTs = Number(body.from);
        if (!Number.isFinite(fromTs)) {
            const err = new Error('El campo from debe ser un timestamp Unix ms numérico');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        fields.fromTs = fromTs;
    }
    if (body.to !== undefined) {
        const toTs = Number(body.to);
        if (!Number.isFinite(toTs)) {
            const err = new Error('El campo to debe ser un timestamp Unix ms numérico');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        fields.toTs = toTs;
    }
    if (body.text !== undefined) {
        if (typeof body.text !== 'string' || body.text.trim() === '') {
            const err = new Error('El campo text no puede estar vacío');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        fields.text = body.text.trim();
    }
    if (body.category !== undefined) {
        if (!VALID_CATEGORIES.includes(body.category)) {
            const err = new Error(`La categoría debe ser una de: ${VALID_CATEGORIES.join(', ')}`);
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        fields.category = body.category;
    }
    if (body.visibility !== undefined) {
        if (!VALID_VISIBILITIES.includes(body.visibility)) {
            const err = new Error(`La visibilidad debe ser una de: ${VALID_VISIBILITIES.join(', ')}`);
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        fields.visibility = body.visibility;
    }

    const resolvedFromTs = fields.fromTs ?? Number(existing.fromTs);
    const resolvedToTs   = fields.toTs   ?? Number(existing.toTs);
    if (resolvedFromTs > resolvedToTs) {
        const err = new Error('El campo from debe ser menor o igual a to');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    if (Object.keys(fields).length === 0) {
        const err = new Error('No se proporcionaron campos para actualizar');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    return updateAnnotation(annotationId, fields);
};

/**
 * Elimina una anotación. Solo el autor o admin puede eliminar.
 *
 * @param {string} channelId
 * @param {string} annotationId
 * @param {Object} requester - { id, roles }
 */
export const removeAnnotation = async (channelId, annotationId, requester) => {
    const existing = await findAnnotationById(annotationId);

    if (!existing) {
        const err = new Error('Anotación no encontrada');
        err.code = 'NOT_FOUND';
        throw err;
    }

    if (existing.channelId !== channelId) {
        const err = new Error('Anotación no encontrada en este canal');
        err.code = 'NOT_FOUND';
        throw err;
    }

    if (!isAdminUser(requester) && existing.authorId !== requester.userId) {
        const err = new Error('No tienes permisos para eliminar esta anotación');
        err.code = 'FORBIDDEN';
        throw err;
    }

    await deleteAnnotation(annotationId);
    return { deleted: true, id: annotationId };
};

const isAdminUser = (requester) => {
    if (!requester) return false;
    const role = requester.role;
    return role === 'system-admin' || role === 'org-admin';
};

const parseDateParam = (param) => {
    if (param === undefined || param === null) return NaN;
    const asNum = Number(param);
    if (Number.isFinite(asNum)) return asNum;
    const asDate = Date.parse(param);
    return asDate;
};
