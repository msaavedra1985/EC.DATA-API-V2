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

        // Verificar si ya existen sitios
        const existingCount = await Site.count();
        
        dbLogger.debug(`📍 Conteo de sitios existentes: ${existingCount}`);
        
        if (existingCount > 0) {
            dbLogger.info(`ℹ️  Ya existen ${existingCount} sitios. Saltando seeder.`);
            return {
                sitesCreated: 0,
                sitesSkipped: existingCount
            };
        }

        // Obtener todas las organizaciones por slug para mapear
        const organizations = await Organization.findAll();
        const orgMap = new Map(organizations.map(org => [org.slug, org]));

        // Obtener todos los países para mapear country_id
        const countries = await Country.findAll({
            attributes: ['id']
        });
        
        // El country_id en seed-data es el índice basado en 1 del array de countries
        // Necesitamos mapear el índice a los IDs reales de la base de datos
        const countryIdMap = new Map();
        countries.forEach((country, index) => {
            // Los IDs en seed-data son 1-based (1, 2, 3...), pero los IDs reales son autoincrement
            countryIdMap.set(index + 1, country.id);
        });

        // Crear sitios uno por uno
        let sitesCreated = 0;

        for (const siteData of sitesData) {
            try {
                // Buscar organización por slug
                const organization = orgMap.get(siteData.org_slug);
                
                if (!organization) {
                    dbLogger.warn(`⚠️  Organización '${siteData.org_slug}' no encontrada. Saltando sitio '${siteData.name}'`);
                    continue;
                }

                // Mapear country_id del índice al ID real
                const realCountryId = countryIdMap.get(siteData.country_id);
                
                if (!realCountryId) {
                    dbLogger.warn(`⚠️  Country ID '${siteData.country_id}' no encontrado. Saltando sitio '${siteData.name}'`);
                    continue;
                }

                // Generar identificadores
                const id = generateUuidV7();
                const human_id = await generateHumanId(Site, null, null);
                const public_code = generatePublicCode('SITE', id);

                // Crear sitio
                await Site.create({
                    id,
                    human_id,
                    public_code,
                    organization_id: organization.id,
                    name: siteData.name,
                    description: siteData.description,
                    latitude: siteData.latitude,
                    longitude: siteData.longitude,
                    address: siteData.address,
                    street_number: siteData.street_number,
                    city: siteData.city,
                    state_province: siteData.state_province,
                    postal_code: siteData.postal_code,
                    country_id: realCountryId,
                    timezone: siteData.timezone,
                    building_type: siteData.building_type,
                    area_m2: siteData.area_m2,
                    floors: siteData.floors,
                    operating_hours: siteData.operating_hours,
                    image_url: siteData.image_url,
                    contact_name: siteData.contact_name,
                    contact_phone: siteData.contact_phone,
                    contact_email: siteData.contact_email,
                    is_active: true
                });

                sitesCreated++;
                dbLogger.debug(`✅ Sitio creado: ${siteData.name} (${public_code})`);

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
