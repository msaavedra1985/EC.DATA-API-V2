// Seeder de organizaciones de prueba
import Organization from '../../modules/organizations/models/Organization.js';
import { generateUuidV7, generatePublicCode, generateHumanId } from '../../utils/identifiers.js';
import { dbLogger } from '../../utils/logger.js';

/**
 * Datos de organizaciones de prueba
 * Organizaciones de diferentes países para testing multi-tenant
 */
const organizationsData = [
    {
        slug: 'acme-corp',
        name: 'ACME Corporation',
        country_id: 14, // US
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
        country_id: 1, // AR
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
        country_id: 16, // ES
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

        // Obtener el scope para human_id (global para organizaciones)
        const scope = 'ORG';
        
        // Crear organizaciones con triple identificador
        const organizations = [];
        for (const data of organizationsData) {
            const id = generateUuidV7();
            const humanId = await generateHumanId(scope);
            const publicCode = generatePublicCode(scope, humanId);
            
            const org = await Organization.create({
                id,
                human_id: humanId,
                public_code: publicCode,
                ...data
            });
            
            organizations.push(org);
            dbLogger.info(`✅ Organización creada: ${org.name} (${org.public_code})`);
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
