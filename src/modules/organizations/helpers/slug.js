// modules/organizations/helpers/slug.js
// Funciones para generación y validación de slugs únicos

import Organization from '../models/Organization.js';
import { Op } from 'sequelize';

const normalizeToSlug = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const generateUniqueSlug = async (baseText, excludeId = null) => {
    const baseSlug = normalizeToSlug(baseText);

    if (!baseSlug) {
        throw new Error('No se puede generar un slug válido a partir del texto proporcionado');
    }

    const where = {
        slug: { [Op.iLike]: `${baseSlug}%` }
    };
    if (excludeId) {
        where.id = { [Op.ne]: excludeId };
    }

    const existing = await Organization.findAll({
        where,
        attributes: ['slug'],
        paranoid: true
    });

    const existingSlugs = new Set(existing.map(o => o.slug.toLowerCase()));

    if (!existingSlugs.has(baseSlug)) {
        return baseSlug;
    }

    let counter = 2;
    while (existingSlugs.has(`${baseSlug}-${counter}`)) {
        counter++;
    }

    return `${baseSlug}-${counter}`;
};

const findSuggestion = async (slug) => {
    const normalized = normalizeToSlug(slug);
    if (!normalized) return null;

    const where = {
        slug: { [Op.iLike]: `${normalized}%` }
    };

    const existing = await Organization.findAll({
        where,
        attributes: ['slug'],
        paranoid: true
    });

    const existingSlugs = new Set(existing.map(o => o.slug.toLowerCase()));

    if (!existingSlugs.has(normalized)) {
        return normalized;
    }

    let counter = 2;
    while (existingSlugs.has(`${normalized}-${counter}`)) {
        counter++;
    }

    return `${normalized}-${counter}`;
};

export { normalizeToSlug, generateUniqueSlug, findSuggestion };
