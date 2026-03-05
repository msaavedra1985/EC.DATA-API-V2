// Seeder de organizaciones de prueba
import Organization from '../../modules/organizations/models/Organization.js';
import { generateUuidV7, generatePublicCode, generateHumanId } from '../../utils/identifiers.js';
import { dbLogger } from '../../utils/logger.js';

/**
 * Datos de organizaciones de prueba
 * EC.DATA es la organización raíz (parentId = null)
 * Las demás organizaciones son hijas de EC.DATA
 */
const organizationsData = [
    {
        slug: 'ec-data',
        name: 'EC.DATA',
        taxId: '76.123.456-7',
        email: 'contact@ecdata.com',
        phone: '+56-2-2345-6789',
        address: 'Av. Providencia 1234, Santiago, Chile',
        description: 'Enterprise data solutions and scalable backend infrastructure',
        config: {
            timezone: 'America/Santiago',
            currency: 'CLP',
            language: 'es'
        },
        isActive: true
    },
    {
        slug: 'acme-corp',
        name: 'ACME Corporation',
        taxId: '12-3456789',
        email: 'contact@acmecorp.com',
        phone: '+1-555-0100',
        address: '123 Main St, New York, NY 10001, USA',
        config: {
            timezone: 'America/New_York',
            currency: 'USD',
            language: 'en'
        },
        isActive: true
    },
    {
        slug: 'techsolutions-ar',
        name: 'Tech Solutions Argentina',
        taxId: '30-12345678-9',
        email: 'info@techsolutions.com.ar',
        phone: '+54-11-4567-8900',
        address: 'Av. Corrientes 1234, Buenos Aires, Argentina',
        config: {
            timezone: 'America/Argentina/Buenos_Aires',
            currency: 'ARS',
            language: 'es'
        },
        isActive: true
    },
    {
        slug: 'global-enterprises',
        name: 'Global Enterprises S.A.',
        taxId: 'B12345678',
        email: 'contacto@globalenterprises.es',
        phone: '+34-91-123-4567',
        address: 'Gran Vía 123, 28013 Madrid, España',
        config: {
            timezone: 'Europe/Madrid',
            currency: 'EUR',
            language: 'es'
        },
        isActive: true
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

        const existingCount = await Organization.count();

        if (existingCount > 0) {
            dbLogger.info(`ℹ️  Ya existen ${existingCount} organizaciones. Saltando seeder.`);
            return {
                organizationsCreated: 0,
                organizationsSkipped: existingCount
            };
        }

        const organizations = [];
        let rootOrgId = null;

        // Primera pasada: crear EC.DATA (root)
        const rootData = organizationsData[0];
        const rootId = generateUuidV7();
        const rootHumanId = await generateHumanId(Organization, null, null);
        const rootPublicCode = generatePublicCode('ORG');

        const rootOrg = await Organization.create({
            id: rootId,
            humanId: rootHumanId,
            publicCode: rootPublicCode,
            slug: rootData.slug,
            name: rootData.name,
            parentId: null,
            taxId: rootData.taxId,
            email: rootData.email,
            phone: rootData.phone,
            address: rootData.address,
            description: rootData.description,
            config: rootData.config,
            isActive: rootData.isActive
        });

        organizations.push(rootOrg);
        rootOrgId = rootOrg.id;
        dbLogger.info(`✅ Organización raíz creada: ${rootOrg.name} (${rootOrg.publicCode})`);

        // Segunda pasada: crear organizaciones hijas
        for (let i = 1; i < organizationsData.length; i++) {
            const data = organizationsData[i];

            const id = generateUuidV7();
            const humanId = await generateHumanId(Organization, null, null);
            const publicCode = generatePublicCode('ORG');

            const org = await Organization.create({
                id,
                humanId,
                publicCode,
                slug: data.slug,
                name: data.name,
                parentId: rootOrgId,
                taxId: data.taxId,
                email: data.email,
                phone: data.phone,
                address: data.address,
                description: data.description,
                config: data.config,
                isActive: data.isActive
            });

            organizations.push(org);
            dbLogger.info(`✅ Organización creada: ${org.name} (${org.publicCode}) - Padre: ${rootOrg.name}`);
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
