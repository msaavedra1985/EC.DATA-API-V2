import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../sql/sequelize.js';
import { dbLogger } from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEO_DATA_DIR = path.resolve(__dirname, '../../../data/geo');

const VALID_STATE_TYPES = ['state', 'province', 'department', 'region', 'territory', 'district', 'other'];

function normalizeStateType(type) {
    if (!type) return null;
    const lower = type.toLowerCase().trim();
    if (VALID_STATE_TYPES.includes(lower)) return lower;
    if (lower.includes('state')) return 'state';
    if (lower.includes('province') || lower.includes('provincia')) return 'province';
    if (lower.includes('department') || lower.includes('departamento')) return 'department';
    if (lower.includes('region') || lower.includes('región')) return 'region';
    if (lower.includes('territory') || lower.includes('territorio')) return 'territory';
    if (lower.includes('district') || lower.includes('distrito')) return 'district';
    return 'other';
}

function escSql(val) {
    if (val === null || val === undefined) return 'NULL';
    return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Seed de estados/provincias desde JSON local (data/geo/states.json)
 * Las ciudades NO se insertan en DB - se sirven on-demand desde JSONs locales
 */
export async function seedGeoData() {
    const t = await sequelize.transaction();
    try {
        dbLogger.info('🌍 Iniciando seeder de estados/provincias...');

        const statesFile = path.join(GEO_DATA_DIR, 'states.json');
        if (!fs.existsSync(statesFile)) {
            throw new Error(`No se encontró ${statesFile}. Ejecutar primero la descarga de datos geográficos.`);
        }

        const sourceStates = JSON.parse(fs.readFileSync(statesFile, 'utf8'));
        dbLogger.info(`📊 Estados en JSON: ${sourceStates.length}`);

        const [existingCountries] = await sequelize.query(
            `SELECT iso_alpha2 FROM countries WHERE is_active = true`,
            { transaction: t }
        );
        const validCountryCodes = new Set(existingCountries.map(c => c.iso_alpha2));
        dbLogger.info(`🌐 Países válidos en DB: ${validCountryCodes.size}`);

        const [existingStatesRows] = await sequelize.query(
            `SELECT code FROM states`,
            { transaction: t }
        );
        const existingStateCodes = new Set(existingStatesRows.map(s => s.code));
        dbLogger.info(`📍 Estados existentes en DB: ${existingStateCodes.size}`);

        const statesToInsert = sourceStates.filter(s => {
            const code = `${s.country_code}-${s.state_code}`;
            return validCountryCodes.has(s.country_code) && !existingStateCodes.has(code);
        });

        dbLogger.info(`📍 Estados nuevos a insertar: ${statesToInsert.length}`);

        let statesCreated = 0;
        let stateTranslationsCreated = 0;
        const BATCH_SIZE = 500;

        for (let i = 0; i < statesToInsert.length; i += BATCH_SIZE) {
            const batch = statesToInsert.slice(i, i + BATCH_SIZE);
            const stateValues = batch.map(s => {
                const code = `${s.country_code}-${s.state_code}`;
                const type = normalizeStateType(s.type);
                return `(${escSql(code)}, ${escSql(s.country_code)}, ${escSql(s.state_code)}, ${type ? escSql(type) : 'NULL'}, ${s.latitude || 'NULL'}, ${s.longitude || 'NULL'}, true, NOW(), NOW())`;
            }).join(',\n');

            await sequelize.query(
                `INSERT INTO states (code, country_code, state_code, type, latitude, longitude, is_active, created_at, updated_at)
                 VALUES ${stateValues}
                 ON CONFLICT (code) DO NOTHING`,
                { transaction: t }
            );
            statesCreated += batch.length;

            const translationValues = [];
            for (const s of batch) {
                const code = `${s.country_code}-${s.state_code}`;
                const esName = s.translations?.es || s.name;
                const enName = s.translations?.en || s.name;
                translationValues.push(`(${escSql(code)}, 'es', ${escSql(esName)}, NOW(), NOW())`);
                translationValues.push(`(${escSql(code)}, 'en', ${escSql(enName)}, NOW(), NOW())`);
            }

            if (translationValues.length > 0) {
                await sequelize.query(
                    `INSERT INTO state_translations (state_code, lang, name, created_at, updated_at)
                     VALUES ${translationValues.join(',\n')}
                     ON CONFLICT (state_code, lang) DO NOTHING`,
                    { transaction: t }
                );
                stateTranslationsCreated += translationValues.length;
            }

            if ((i + BATCH_SIZE) % 2000 === 0 || i + BATCH_SIZE >= statesToInsert.length) {
                dbLogger.info(`  Progreso: ${Math.min(i + BATCH_SIZE, statesToInsert.length)}/${statesToInsert.length}`);
            }
        }

        await t.commit();

        dbLogger.info(`✅ Seeder geográfico completado:`);
        dbLogger.info(`   - ${statesCreated} estados nuevos insertados`);
        dbLogger.info(`   - ${stateTranslationsCreated} traducciones de estados`);
        dbLogger.info(`   ℹ️  Ciudades se sirven on-demand desde data/geo/cities/{CC}.json`);

        return { success: true, statesCreated, stateTranslationsCreated };
    } catch (error) {
        await t.rollback();
        dbLogger.error(error, '❌ Error en seeder geográfico');
        throw error;
    }
}
