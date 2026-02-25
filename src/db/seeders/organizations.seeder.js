// Seeder de organizaciones de prueba
import Organization from '../../modules/organizations/models/Organization.js';
import Country from '../../modules/countries/models/Country.js';
import { generateUuidV7, generatePublicCode, generateHumanId } from '../../utils/identifiers.js';
import { dbLogger } from '../../utils/logger.js';

/**
 * Datos de organizaciones de prueba
 * EC.DATA es la organización raíz (parent_id = null)
 * Las demás organizaciones pueden ser hijas de EC.DATA
 */
const organizationsData = [
    {
        slug: 'ec-data',
        name: 'EC.DATA',
        country_iso: 'CL', // Chile
        parent_id: null, // Organización raíz
        tax_id: '76.123.456-7',
        email: 'contact@ecdata.com',
        phone: '+56-2-2345-6789',
        address: 'Av. Providencia 1234, Santiago, Chile',
        description: 'Enterprise data solutions and scalable backend infrastructure',
        website: 'https://ecdata.com',
        settings: {
            timezone: 'America/Santiago',
            currency: 'CLP',
            language: 'es'
        },
        is_active: true
    },
    {
        slug: 'acme-corp',
        name: 'ACME Corporation',
        country_iso: 'US', // United States
        parent_id: null, // Será establecido después (hijo de EC.DATA)
        tax_id: '12-3456789',
        email: 'contact@acmecorp.com',
        phone: '+1-555-0100',
        address: '123 Main St, New York, NY 10001, USA',
        settings: {
            timezone: 'America/New_York',
            currency: 'USD',
            language: 'en'
        },
        is_active: true
    },
    {
        slug: 'techsolutions-ar',
        name: 'Tech Solutions Argentina',
        country_iso: 'AR', // Argentina
        parent_id: null, // Será establecido después (hijo de EC.DATA)
        tax_id: '30-12345678-9',
        email: 'info@techsolutions.com.ar',
        phone: '+54-11-4567-8900',
        address: 'Av. Corrientes 1234, Buenos Aires, Argentina',
        settings: {
            timezone: 'America/Argentina/Buenos_Aires',
            currency: 'ARS',
            language: 'es'
        },
        is_active: true
    },
    {
        slug: 'global-enterprises',
        name: 'Global Enterprises S.A.',
        country_iso: 'ES', // España
        parent_id: null, // Será establecido después (hijo de EC.DATA)
        tax_id: 'B12345678',
        email: 'contacto@globalenterprises.es',
        phone: '+34-91-123-4567',
        address: 'Gran Vía 123, 28013 Madrid, España',
        settings: {
            timezone: 'Europe/Madrid',
            currency: 'EUR',
            language: 'es'
        },
        is_active: true
    }
];

/**
 * Seeder de organizaciones
 * Crea organizaciones de prueba si no existen
 * EC.DATA es la raíz, las demás son sus hijas
 */
export const seedOrganizations = async () => {
    try {
        dbLogger.info('🏢 Iniciando seeder de organizaciones...');

        // Verificar si ya existen organizaciones
        const existingCount = await Organization.count();
        
        if (existingCount > 0) {
            dbLogger.info(`ℹ️  Ya existen ${existingCount} organizaciones. Saltando seeder.`);
            return {
                organizationsCreated: 0,
                organizationsSkipped: existingCount
            };
        }

        // Obtener países por ISO code
        const countries = await Country.findAll({
            where: {
                iso_alpha2: ['CL', 'US', 'AR', 'ES']
            },
            attributes: ['id', 'iso_alpha2']
        });

        const countryMap = {};
        countries.forEach(country => {
            countryMap[country.iso_alpha2] = country.id;
        });

        dbLogger.info('✅ Países cargados:', Object.keys(countryMap));

        // Crear organizaciones con triple identificador
        const organizations = [];
        let rootOrgId = null;

        // Primera pasada: crear EC.DATA (root)
        const rootData = organizationsData[0]; // ec-data
        const rootCountryId = countryMap[rootData.country_iso];
        
        if (!rootCountryId) {
            throw new Error(`País no encontrado: ${rootData.country_iso}`);
        }

        const rootId = generateUuidV7();
        const rootHumanId = await generateHumanId(Organization, null, null);
        const rootPublicCode = generatePublicCode('ORG');
        
        const rootOrg = await Organization.create({
            id: rootId,
            human_id: rootHumanId,
            public_code: rootPublicCode,
            slug: rootData.slug,
            name: rootData.name,
            parent_id: null,
            country_id: rootCountryId,
            tax_id: rootData.tax_id,
            email: rootData.email,
            phone: rootData.phone,
            address: rootData.address,
            description: rootData.description,
            website: rootData.website,
            config: rootData.settings,
            is_active: rootData.is_active
        });
        
        organizations.push(rootOrg);
        rootOrgId = rootOrg.id;
        dbLogger.info(`✅ Organización raíz creada: ${rootOrg.name} (${rootOrg.public_code})`);

        // Segunda pasada: crear organizaciones hijas
        for (let i = 1; i < organizationsData.length; i++) {
            const data = organizationsData[i];
            const countryId = countryMap[data.country_iso];
            
            if (!countryId) {
                dbLogger.warn(`⚠️  País no encontrado: ${data.country_iso}, saltando ${data.name}`);
                continue;
            }

            const id = generateUuidV7();
            const humanId = await generateHumanId(Organization, null, null);
            const publicCode = generatePublicCode('ORG');
            
            const org = await Organization.create({
                id,
                human_id: humanId,
                public_code: publicCode,
                slug: data.slug,
                name: data.name,
                parent_id: rootOrgId,
                country_id: countryId,
                tax_id: data.tax_id,
                email: data.email,
                phone: data.phone,
                address: data.address,
                description: data.description,
                website: data.website,
                config: data.settings,
                is_active: data.is_active
            });
            
            organizations.push(org);
            dbLogger.info(`✅ Organización creada: ${org.name} (${org.public_code}) - Padre: ${rootOrg.name}`);
        }

        dbLogger.info(`✅ ${organizations.length} organizaciones creadas exitosamente`);
        
        return {
            organizationsCreated: organizations.length,
            organizationsSkipped: 0
        };
    } catch (error) {
        dbLogger.error(error, '❌ Error en seeder de organizaciones');
        throw error;
    }
};

export default seedOrganizations;
