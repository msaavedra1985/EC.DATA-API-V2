import { v7 as uuidv7 } from 'uuid';
import Hashids from 'hashids';
import { config } from '../config/env.js';

/**
 * Salt para Hashids - debe estar en variable de entorno
 * En producción usar KMS para rotación de salt
 */
const HASHIDS_SALT = process.env.HASHIDS_SALT || 'dev-salt-change-in-production';
const HASHIDS_MIN_LENGTH = 5;

/**
 * Instancia de Hashids para encoding/decoding
 */
const hashids = new Hashids(HASHIDS_SALT, HASHIDS_MIN_LENGTH);

/**
 * Genera un UUID v7 (time-ordered UUID)
 * UUID v7 incluye timestamp en los primeros bits, lo que permite ordenamiento natural
 * 
 * @returns {string} - UUID v7 en formato string
 */
export const generateUuidV7 = () => {
    return uuidv7();
};

/**
 * Genera el siguiente human_id para una entidad con scope
 * 
 * @param {Object} model - Modelo de Sequelize
 * @param {string} scopeField - Campo de scope (ej: 'organization_id')
 * @param {string|null} scopeValue - Valor del scope (ej: UUID de organization)
 * @returns {Promise<number>} - Siguiente human_id
 */
export const generateHumanId = async (model, scopeField, scopeValue) => {
    // Si no hay scope (ej: Organizations), buscar el máximo global
    if (!scopeField || scopeValue === null || scopeValue === undefined) {
        const maxRecord = await model.findOne({
            attributes: [[model.sequelize.fn('MAX', model.sequelize.col('human_id')), 'max_id']],
            raw: true
        });
        
        const maxId = maxRecord?.max_id || 0;
        return maxId + 1;
    }

    // Con scope (ej: Users scoped por organization_id)
    const maxRecord = await model.findOne({
        where: { [scopeField]: scopeValue },
        attributes: [[model.sequelize.fn('MAX', model.sequelize.col('human_id')), 'max_id']],
        raw: true
    });

    const maxId = maxRecord?.max_id || 0;
    return maxId + 1;
};

/**
 * Calcula dígito verificador usando algoritmo de Luhn
 * Usado para detectar errores de tipeo en public_code
 * 
 * @param {string} input - String numérico
 * @returns {number} - Dígito verificador (0-9)
 */
export const calculateLuhnChecksum = (input) => {
    // Convertir a array de dígitos
    const digits = input.toString().split('').map(Number);
    
    let sum = 0;
    let isEven = false;

    // Procesar de derecha a izquierda
    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = digits[i];

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    // Calcular dígito que hace que sum % 10 === 0
    return (10 - (sum % 10)) % 10;
};

/**
 * Valida dígito verificador Luhn
 * 
 * @param {string} input - String numérico con checksum al final
 * @returns {boolean} - true si checksum es válido
 */
export const validateLuhnChecksum = (input) => {
    if (!input || input.length < 2) {
        return false;
    }

    const digits = input.toString().split('').map(Number);
    const providedChecksum = digits[digits.length - 1];
    const dataWithoutChecksum = input.slice(0, -1);
    
    const calculatedChecksum = calculateLuhnChecksum(dataWithoutChecksum);
    
    return providedChecksum === calculatedChecksum;
};

/**
 * Genera public_code opaco para una entidad
 * Formato: PREFIX-ENCODED-CHECKSUM
 * Ejemplo: EC-7K9D2-X o ORG-A5B3C-7
 * 
 * @param {string} prefix - Prefijo (ej: 'EC' para users, 'ORG' para organizations)
 * @param {number} humanId - human_id numérico
 * @returns {string} - public_code opaco
 */
export const generatePublicCode = (prefix, humanId) => {
    // Encode human_id usando Hashids
    const encoded = hashids.encode(humanId);
    
    // Calcular checksum sobre el human_id
    const checksum = calculateLuhnChecksum(humanId.toString());
    
    // Formato: PREFIX-ENCODED-CHECKSUM
    return `${prefix}-${encoded}-${checksum}`;
};

/**
 * Decodifica public_code a human_id
 * 
 * @param {string} publicCode - public_code (ej: 'EC-7K9D2-X')
 * @param {string} expectedPrefix - Prefijo esperado (opcional, para validación)
 * @returns {Object} - { humanId, prefix, isValid }
 */
export const decodePublicCode = (publicCode, expectedPrefix = null) => {
    try {
        // Dividir en partes: PREFIX-ENCODED-CHECKSUM
        const parts = publicCode.split('-');
        
        if (parts.length !== 3) {
            return { humanId: null, prefix: null, isValid: false, error: 'Formato inválido' };
        }

        const [prefix, encoded, checksumStr] = parts;

        // Validar prefijo si se proporciona
        if (expectedPrefix && prefix !== expectedPrefix) {
            return { humanId: null, prefix, isValid: false, error: 'Prefijo inválido' };
        }

        // Decodificar usando Hashids
        const decoded = hashids.decode(encoded);
        
        if (decoded.length === 0) {
            return { humanId: null, prefix, isValid: false, error: 'Código inválido' };
        }

        const humanId = Number(decoded[0]);

        // Validar checksum
        const calculatedChecksum = calculateLuhnChecksum(humanId.toString());
        const providedChecksum = parseInt(checksumStr, 10);

        if (calculatedChecksum !== providedChecksum) {
            return { humanId, prefix, isValid: false, error: 'Checksum inválido' };
        }

        return { humanId, prefix, isValid: true };
    } catch (error) {
        return { humanId: null, prefix: null, isValid: false, error: error.message };
    }
};

/**
 * Valida formato de public_code
 * 
 * @param {string} publicCode - public_code a validar
 * @param {string} expectedPrefix - Prefijo esperado (opcional)
 * @returns {boolean} - true si es válido
 */
export const isValidPublicCode = (publicCode, expectedPrefix = null) => {
    const result = decodePublicCode(publicCode, expectedPrefix);
    return result.isValid;
};
