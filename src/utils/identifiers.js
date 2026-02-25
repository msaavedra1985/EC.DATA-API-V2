import { v7 as uuidv7 } from 'uuid';
import { customAlphabet } from 'nanoid';

// Alfabeto seguro: sin 0/O, 1/I, 8/B (confusión visual y telefónica)
const SAFE_ALPHABET = '2345679ACDEFGHJKLMNPQRSTUVWXYZ';
const BLOCK_SIZE = 3;

const generateBlock = customAlphabet(SAFE_ALPHABET, BLOCK_SIZE);

export const generateUuidV7 = () => {
    return uuidv7();
};

export const generateHumanId = async (model, scopeField, scopeValue) => {
    if (!scopeField || scopeValue === null || scopeValue === undefined) {
        const maxRecord = await model.findOne({
            attributes: [[model.sequelize.fn('MAX', model.sequelize.col('human_id')), 'max_id']],
            raw: true
        });
        
        const maxId = maxRecord?.max_id || 0;
        return maxId + 1;
    }

    const maxRecord = await model.findOne({
        where: { [scopeField]: scopeValue },
        attributes: [[model.sequelize.fn('MAX', model.sequelize.col('human_id')), 'max_id']],
        raw: true
    });

    const maxId = maxRecord?.max_id || 0;
    return maxId + 1;
};

/**
 * Genera public_code estilo "boleto de avión"
 * Formato: PREFIX-XXX-XXX (ej: DEV-4X9-R2T, CHN-K7M-3DP)
 * Alfabeto seguro de 29 caracteres, 6 chars = ~594M combinaciones por prefijo
 * 
 * @param {string} prefix - Prefijo de entidad (ej: 'CHN', 'DEV', 'ORG')
 * @returns {string} - public_code (ej: 'DEV-4X9-R2T')
 */
export const generatePublicCode = (prefix) => {
    const block1 = generateBlock();
    const block2 = generateBlock();
    return `${prefix.toUpperCase()}-${block1}-${block2}`;
};

/**
 * Genera public_code con verificación de unicidad en DB
 * Reintenta hasta maxAttempts veces si hay colisión
 * 
 * @param {string} prefix - Prefijo de entidad
 * @param {Object} model - Modelo Sequelize para verificar unicidad
 * @param {string} field - Nombre del campo en el modelo (default: 'publicCode')
 * @param {number} maxAttempts - Intentos máximos (default: 5)
 * @returns {Promise<string>} - public_code único
 */
export const generatePublicCodeWithRetry = async (prefix, model, field = 'publicCode', maxAttempts = 5) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const code = generatePublicCode(prefix);
        const existing = await model.findOne({
            where: { [field]: code },
            attributes: ['id'],
            raw: true,
            paranoid: false
        });
        if (!existing) {
            return code;
        }
    }
    throw new Error(`No se pudo generar un public_code único para ${prefix} después de ${maxAttempts} intentos`);
};

/**
 * Valida formato de public_code (nuevo formato boleto de avión)
 * 
 * @param {string} publicCode - public_code a validar (ej: 'DEV-4X9-R2T')
 * @param {string} expectedPrefix - Prefijo esperado (opcional)
 * @returns {boolean} - true si tiene formato válido
 */
export const isValidPublicCode = (publicCode, expectedPrefix = null) => {
    if (!publicCode || typeof publicCode !== 'string') return false;
    const regex = /^[A-Z]{2,4}-[2345679ACDEFGHJKLMNPQRSTUVWXYZ]{3}-[2345679ACDEFGHJKLMNPQRSTUVWXYZ]{3}$/;
    if (!regex.test(publicCode)) return false;
    if (expectedPrefix) {
        return publicCode.startsWith(`${expectedPrefix}-`);
    }
    return true;
};
