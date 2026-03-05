// Seeder de sitios (locaciones físicas) de prueba
import Site from '../../modules/sites/models/Site.js';
import Organization from '../../modules/organizations/models/Organization.js';
import Country from '../../modules/countries/models/Country.js';
import { generateUuidV7, generatePublicCode, generateHumanId } from '../../utils/identifiers.js';
import { dbLogger } from '../../utils/logger.js';
import { sites as sitesData } from '../../modules/seed/seed-data.js';

/**
 * Seeder de sitios
 * Crea locaciones físicas de prueba asociadas a organizaciones existentes
 * Depende de que ya existan organizaciones y países
 */
export const seedSites = async () => {
    try {
        dbLogger.info('📍 Iniciando seeder de sitios...');

        const existingCount = await Site.count();

        dbLogger.debug(`📍 Conteo de sitios existentes: ${existingCount}`);

        if (existingCount > 0) {
            dbLogger.info(`ℹ️  Ya existen ${existingCount} sitios. Saltando seeder.`);
            return {
                sitesCreated: 0,
                sitesSkipped: existingCount
            };
        }

        const organizations = await Organization.findAll();
        const orgMap = new Map(organizations.map(org => [org.slug, org]));

        // Obtener todos los países para mapear country_code por índice
        // seed-data.sites usa country_id como índice 1-based en el array de countries
        const countries = await Country.findAll({
            attributes: ['isoAlpha2'],
            order: [['isoAlpha2', 'ASC']]
        });

        const countryCodeMap = new Map();
        countries.forEach((country, index) => {
            countryCodeMap.set(index + 1, country.isoAlpha2);
        });

        let sitesCreated = 0;

        for (const siteData of sitesData) {
            try {
                const organization = orgMap.get(siteData.org_slug);

                if (!organization) {
                    dbLogger.warn(`⚠️  Organización '${siteData.org_slug}' no encontrada. Saltando sitio '${siteData.name}'`);
                    continue;
                }

                const realCountryCode = countryCodeMap.get(siteData.country_id);

                if (!realCountryCode) {
                    dbLogger.warn(`⚠️  Country índice '${siteData.country_id}' no encontrado. Saltando sitio '${siteData.name}'`);
                    continue;
                }

                const id = generateUuidV7();
                const humanId = await generateHumanId(Site, null, null);
                const publicCode = generatePublicCode('SITE');

                await Site.create({
                    id,
                    humanId,
                    publicCode,
                    organizationId: organization.id,
                    name: siteData.name,
                    description: siteData.description,
                    latitude: siteData.latitude,
                    longitude: siteData.longitude,
                    address: siteData.address,
                    streetNumber: siteData.street_number,
                    city: siteData.city,
                    stateProvince: siteData.state_province,
                    postalCode: siteData.postal_code,
                    countryCode: realCountryCode,
                    timezone: siteData.timezone,
                    buildingType: siteData.building_type,
                    areaM2: siteData.area_m2,
                    floors: siteData.floors,
                    operatingHours: siteData.operating_hours,
                    imageUrl: siteData.image_url,
                    contactName: siteData.contact_name,
                    contactPhone: siteData.contact_phone,
                    contactEmail: siteData.contact_email,
                    isActive: true
                });

                sitesCreated++;
                dbLogger.debug(`✅ Sitio creado: ${siteData.name} (${publicCode})`);

            } catch (error) {
                dbLogger.error(`❌ Error creando sitio '${siteData.name}': ${error.message}`);
                dbLogger.error('Stack trace:', error.stack);
            }
        }

        dbLogger.info(`✅ Seeder de sitios completado: ${sitesCreated} sitios creados`);

        return {
            sitesCreated,
            sitesSkipped: 0
        };

    } catch (error) {
        dbLogger.error('❌ Error en seeder de sitios:', error);
        throw error;
    }
};
