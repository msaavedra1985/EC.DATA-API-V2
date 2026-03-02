/**
 * Servicio de Variables - Lógica de negocio
 * 
 * Maneja validación, audit logging y operaciones de negocio
 * para el CRUD de variables de telemetría.
 */
import { z } from 'zod';
import * as variablesRepository from '../repositories/variablesRepository.js';
import { logAuditAction } from '../../../helpers/auditLog.js';
import logger from '../../../utils/logger.js';

// Esquemas de validación Zod

const chartTypeEnum = z.enum(['column', 'spline', 'line', 'area', 'bar', 'pie', 'scatter', 'gauge', 'none']);
const aggregationTypeEnum = z.enum(['sum', 'avg', 'min', 'max', 'count', 'last', 'first', 'none']);

/**
 * Esquema para crear variable
 */
const createVariableSchema = z.object({
    measurementTypeId: z.number().int().positive('measurementTypeId debe ser un entero positivo'),
    columnName: z.string().min(1, 'columnName es requerido').max(50),
    unit: z.string().max(20).optional().nullable(),
    chartType: chartTypeEnum.optional().default('spline'),
    axisName: z.string().max(50).optional().nullable(),
    axisId: z.string().max(30).optional().nullable(),
    axisMin: z.number().optional().nullable(),
    axisFunction: z.string().max(20).optional().nullable(),
    aggregationType: aggregationTypeEnum.optional().default('none'),
    displayOrder: z.number().int().optional().nullable(),
    showInBilling: z.boolean().optional().default(false),
    showInAnalysis: z.boolean().optional().default(true),
    isRealtime: z.boolean().optional().default(false),
    isDefault: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
    translations: z.record(z.string(), z.object({
        name: z.string().min(1, 'name es requerido').max(100),
        description: z.string().max(255).optional().nullable()
    })).optional().default({})
});

/**
 * Esquema para actualizar variable
 */
const updateVariableSchema = z.object({
    measurementTypeId: z.number().int().positive().optional(),
    columnName: z.string().min(1).max(50).optional(),
    unit: z.string().max(20).optional().nullable(),
    chartType: chartTypeEnum.optional(),
    axisName: z.string().max(50).optional().nullable(),
    axisId: z.string().max(30).optional().nullable(),
    axisMin: z.number().optional().nullable(),
    axisFunction: z.string().max(20).optional().nullable(),
    aggregationType: aggregationTypeEnum.optional(),
    displayOrder: z.number().int().optional().nullable(),
    showInBilling: z.boolean().optional(),
    showInAnalysis: z.boolean().optional(),
    isRealtime: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
    translations: z.record(z.string(), z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(255).optional().nullable()
    })).optional()
});

/**
 * Esquema para filtros de listado
 */
const listFiltersSchema = z.object({
    lang: z.string().max(5).optional().default('es'),
    search: z.string().max(100).optional(),
    measurementTypeId: z.coerce.number().int().positive().optional(),
    isRealtime: z.coerce.boolean().optional(),
    isDefault: z.coerce.boolean().optional(),
    isActive: z.coerce.boolean().optional(),
    showInBilling: z.coerce.boolean().optional(),
    showInAnalysis: z.coerce.boolean().optional(),
    chartType: chartTypeEnum.optional(),
    aggregationType: aggregationTypeEnum.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
    sortBy: z.enum(['id', 'displayOrder', 'columnName', 'name', 'measurementTypeId', 'createdAt', 'updatedAt']).optional().default('displayOrder'),
    sortOrder: z.enum(['ASC', 'DESC', 'asc', 'desc']).optional().default('ASC')
});

/**
 * Lista variables con filtros y paginación
 * 
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Object>} { items, total, page, limit }
 */
export const listVariables = async (filters = {}) => {
    // Validar filtros
    const validation = listFiltersSchema.safeParse(filters);
    
    if (!validation.success) {
        const error = new Error('Parámetros de filtrado inválidos');
        error.code = 'VALIDATION_ERROR';
        error.details = validation.error.errors;
        throw error;
    }

    const validatedData = { ...validation.data };
    if (validatedData.page !== undefined && validatedData.page >= 1) {
        validatedData.offset = (validatedData.page - 1) * validatedData.limit;
    }

    const result = await variablesRepository.findAll(validatedData);
    
    logger.debug({ 
        filters: validation.data, 
        total: result.total 
    }, 'Variables listed');

    return result;
};

/**
 * Obtiene una variable por ID
 * 
 * @param {number} id - ID de la variable
 * @param {string} lang - Código de idioma
 * @returns {Promise<Object>} Variable con traducciones
 */
export const getVariable = async (id, lang = 'es') => {
    const variable = await variablesRepository.findById(id, lang);
    
    if (!variable) {
        const error = new Error(`Variable con ID ${id} no encontrada`);
        error.code = 'NOT_FOUND';
        throw error;
    }

    // Obtener todas las traducciones disponibles
    const translations = await variablesRepository.getTranslations(id);
    
    return {
        ...variable,
        translations: translations.reduce((acc, t) => {
            acc[t.lang] = { name: t.name, description: t.description };
            return acc;
        }, {})
    };
};

/**
 * Crea una nueva variable
 * 
 * @param {Object} data - Datos de la variable
 * @param {Object} context - Contexto de la operación (userId, ip, userAgent)
 * @returns {Promise<Object>} Variable creada
 */
export const createVariable = async (data, context = {}) => {
    // Validar datos
    const validation = createVariableSchema.safeParse(data);
    
    if (!validation.success) {
        const error = new Error('Datos de variable inválidos');
        error.code = 'VALIDATION_ERROR';
        error.details = validation.error.errors;
        throw error;
    }

    const validData = validation.data;
    const { translations, ...variableData } = validData;

    // Verificar que no exista duplicado de column_name en el measurement_type
    const duplicateExists = await variablesRepository.existsDuplicate(
        variableData.measurementTypeId,
        variableData.columnName
    );

    if (duplicateExists) {
        const error = new Error(`Ya existe una variable con column_name '${variableData.columnName}' para este tipo de medición`);
        error.code = 'DUPLICATE_ERROR';
        throw error;
    }

    // Asegurar que al menos exista traducción en español
    if (!translations.es) {
        const error = new Error('Se requiere al menos traducción en español (es)');
        error.code = 'VALIDATION_ERROR';
        throw error;
    }

    // Crear variable
    const variable = await variablesRepository.create(variableData, translations);

    // Audit log
    await logAuditAction({
        entityType: 'variable',
        entityId: variable.id.toString(),
        action: 'created',
        performedBy: context.userId || null,
        changes: { 
            new: { 
                ...variableData, 
                translations: Object.keys(translations) 
            } 
        },
        metadata: {
            columnName: variableData.columnName,
            measurementTypeId: variableData.measurementTypeId
        },
        ipAddress: context.ip,
        userAgent: context.userAgent
    });

    // Retornar variable completa con traducciones
    return await getVariable(variable.id);
};

/**
 * Actualiza una variable existente
 * 
 * @param {number} id - ID de la variable
 * @param {Object} data - Datos a actualizar
 * @param {Object} context - Contexto de la operación
 * @returns {Promise<Object>} Variable actualizada
 */
export const updateVariable = async (id, data, context = {}) => {
    // Validar datos
    const validation = updateVariableSchema.safeParse(data);
    
    if (!validation.success) {
        const error = new Error('Datos de actualización inválidos');
        error.code = 'VALIDATION_ERROR';
        error.details = validation.error.errors;
        throw error;
    }

    // Obtener variable actual para comparar cambios
    const currentVariable = await variablesRepository.findById(id);
    
    if (!currentVariable) {
        const error = new Error(`Variable con ID ${id} no encontrada`);
        error.code = 'NOT_FOUND';
        throw error;
    }

    const validData = validation.data;
    const { translations, ...updateData } = validData;

    // Verificar duplicado si se está cambiando column_name o measurement_type_id
    if (updateData.columnName || updateData.measurementTypeId) {
        const measurementTypeId = updateData.measurementTypeId || currentVariable.measurementTypeId;
        const columnName = updateData.columnName || currentVariable.columnName;

        const duplicateExists = await variablesRepository.existsDuplicate(
            measurementTypeId,
            columnName,
            id
        );

        if (duplicateExists) {
            const error = new Error(`Ya existe una variable con column_name '${columnName}' para este tipo de medición`);
            error.code = 'DUPLICATE_ERROR';
            throw error;
        }
    }

    // Actualizar variable
    const updatedVariable = await variablesRepository.update(id, updateData, translations || {});

    const changes = {};
    for (const [key, value] of Object.entries(updateData)) {
        if (currentVariable[key] !== value) {
            changes[key] = { old: currentVariable[key], new: value };
        }
    }
    if (translations) {
        changes.translations = { updated: Object.keys(translations) };
    }

    // Audit log
    await logAuditAction({
        entityType: 'variable',
        entityId: id.toString(),
        action: 'updated',
        performedBy: context.userId || null,
        changes,
        metadata: {
            columnName: currentVariable.columnName
        },
        ipAddress: context.ip,
        userAgent: context.userAgent
    });

    return updatedVariable;
};

/**
 * Elimina una variable (soft delete)
 * 
 * @param {number} id - ID de la variable
 * @param {Object} context - Contexto de la operación
 * @returns {Promise<boolean>} True si se eliminó
 */
export const deleteVariable = async (id, context = {}) => {
    // Verificar que existe
    const variable = await variablesRepository.findById(id);
    
    if (!variable) {
        const error = new Error(`Variable con ID ${id} no encontrada`);
        error.code = 'NOT_FOUND';
        throw error;
    }

    // Soft delete
    await variablesRepository.remove(id);

    // Audit log
    await logAuditAction({
        entityType: 'variable',
        entityId: id.toString(),
        action: 'deleted',
        performedBy: context.userId || null,
        changes: {
            old: { 
                columnName: variable.columnName,
                name: variable.name,
                isActive: true 
            },
            new: { isActive: false }
        },
        metadata: {
            columnName: variable.columnName
        },
        ipAddress: context.ip,
        userAgent: context.userAgent
    });

    return true;
};

export default {
    listVariables,
    getVariable,
    createVariable,
    updateVariable,
    deleteVariable
};
