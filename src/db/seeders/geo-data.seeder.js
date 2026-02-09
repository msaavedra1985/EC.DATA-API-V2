import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../sql/sequelize.js';
import { dbLogger } from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = '/tmp/geo-data';

const VALID_STATE_TYPES = ['state', 'province', 'department', 'region', 'territory', 'district', 'other'];

async function downloadFile(url, dest) {
    const { execSync } = await import('child_process');
    if (!fs.existsSync(dest)) {
        dbLogger.info(`Descargando ${path.basename(dest)}...`);
        execSync(`curl -sL "${url}" -o "${dest}"`, { timeout: 120000 });
    }
    if (dest.endsWith('.gz') && !fs.existsSync(dest.replace('.gz', ''))) {
        execSync(`gunzip -k "${dest}"`, { timeout: 60000 });
    }
}

async function loadJsonFile(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
}

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

export async function seedGeoData() {
    const t = await sequelize.transaction();
    try {
        dbLogger.info('🌍 Iniciando seeder de datos geográficos (estados + ciudades)...');

        fs.mkdirSync(DATA_DIR, { recursive: true });

        const statesUrl = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json';
        const citiesGzUrl = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/cities.json.gz';

        await downloadFile(statesUrl, `${DATA_DIR}/states.json`);
        await downloadFile(citiesGzUrl, `${DATA_DIR}/cities.json.gz`);

        const sourceStates = await loadJsonFile(`${DATA_DIR}/states.json`);
        const sourceCities = await loadJsonFile(`${DATA_DIR}/cities.json`);

        dbLogger.info(`📊 Datos cargados: ${sourceStates.length} estados, ${sourceCities.length} ciudades`);

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

        let statesCreated = 0;
        let stateTranslationsCreated = 0;
        const BATCH_SIZE = 500;

        const statesToInsert = sourceStates.filter(s => {
            const code = `${s.country_code}-${s.state_code || s.iso2}`;
            return validCountryCodes.has(s.country_code) && !existingStateCodes.has(code);
        });

        dbLogger.info(`📍 Estados nuevos a insertar: ${statesToInsert.length}`);

        for (let i = 0; i < statesToInsert.length; i += BATCH_SIZE) {
            const batch = statesToInsert.slice(i, i + BATCH_SIZE);
            const stateValues = batch.map(s => {
                const stCode = s.state_code || s.iso2;
                const code = `${s.country_code}-${stCode}`;
                const type = normalizeStateType(s.type);
                return `(${escSql(code)}, ${escSql(s.country_code)}, ${escSql(stCode)}, ${type ? escSql(type) : 'NULL'}, ${s.latitude || 'NULL'}, ${s.longitude || 'NULL'}, true, NOW(), NOW())`;
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
                const stCode = s.state_code || s.iso2;
                const code = `${s.country_code}-${stCode}`;
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
                dbLogger.info(`  Estados: ${Math.min(i + BATCH_SIZE, statesToInsert.length)}/${statesToInsert.length}`);
            }
        }

        const [allStatesRows] = await sequelize.query(
            `SELECT code FROM states`,
            { transaction: t }
        );
        const allStateCodes = new Set(allStatesRows.map(s => s.code));

        const [existingCitiesCount] = await sequelize.query(
            `SELECT COUNT(*) as cnt FROM cities`,
            { transaction: t }
        );
        const citiesExist = parseInt(existingCitiesCount[0].cnt) > 0;

        if (citiesExist) {
            dbLogger.info('ℹ️  Ya existen ciudades en la DB. Saltando inserción de ciudades.');
        } else {
            const validCities = sourceCities.filter(c => {
                const stateCode = `${c.country_code}-${c.state_code}`;
                return validCountryCodes.has(c.country_code) && allStateCodes.has(stateCode);
            });

            dbLogger.info(`🏙️  Ciudades válidas a insertar: ${validCities.length} (de ${sourceCities.length} totales)`);

            let citiesCreated = 0;
            let cityTranslationsCreated = 0;
            const CITY_BATCH = 1000;

            for (let i = 0; i < validCities.length; i += CITY_BATCH) {
                const batch = validCities.slice(i, i + CITY_BATCH);
                const cityValues = batch.map(c => {
                    const stateCode = `${c.country_code}-${c.state_code}`;
                    const isCapital = c.type === 'adm1' ? true : false;
                    return `(${escSql(stateCode)}, ${escSql(c.name)}, NULL, ${c.latitude || 'NULL'}, ${c.longitude || 'NULL'}, ${c.population || 'NULL'}, ${c.timezone ? escSql(c.timezone) : 'NULL'}, ${isCapital}, true, NOW(), NOW())`;
                }).join(',\n');

                const [insertedCities] = await sequelize.query(
                    `INSERT INTO cities (state_code, name, zip_code, latitude, longitude, population, timezone, is_capital, is_active, created_at, updated_at)
                     VALUES ${cityValues}
                     RETURNING id`,
                    { transaction: t }
                );
                citiesCreated += insertedCities.length;

                const translationValues = [];
                for (let j = 0; j < batch.length; j++) {
                    const c = batch[j];
                    const cityId = insertedCities[j]?.id;
                    if (!cityId) continue;

                    const esName = c.translations?.es || c.name;
                    const enName = c.translations?.en || c.name;
                    translationValues.push(`(${cityId}, 'es', ${escSql(esName)}, NOW(), NOW())`);
                    translationValues.push(`(${cityId}, 'en', ${escSql(enName)}, NOW(), NOW())`);
                }

                if (translationValues.length > 0) {
                    await sequelize.query(
                        `INSERT INTO city_translations (city_id, lang, name, created_at, updated_at)
                         VALUES ${translationValues.join(',\n')}
                         ON CONFLICT (city_id, lang) DO NOTHING`,
                        { transaction: t }
                    );
                    cityTranslationsCreated += translationValues.length;
                }

                if ((i + CITY_BATCH) % 10000 === 0 || i + CITY_BATCH >= validCities.length) {
                    dbLogger.info(`  Ciudades: ${Math.min(i + CITY_BATCH, validCities.length)}/${validCities.length}`);
                }
            }

            dbLogger.info(`✅ Ciudades insertadas: ${citiesCreated}`);
            dbLogger.info(`✅ Traducciones de ciudades: ${cityTranslationsCreated}`);
        }

        await t.commit();

        dbLogger.info(`✅ Seeder geográfico completado:`);
        dbLogger.info(`   - ${statesCreated} estados nuevos`);
        dbLogger.info(`   - ${stateTranslationsCreated} traducciones de estados`);

        return { success: true, statesCreated, stateTranslationsCreated };
    } catch (error) {
        await t.rollback();
        dbLogger.error(error, '❌ Error en seeder geográfico');
        throw error;
    }
}
