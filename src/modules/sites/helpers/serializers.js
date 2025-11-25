// modules/sites/helpers/serializers.js
// Serializadores para convertir modelos internos a DTOs públicos

/**
 * Convertir modelo Site a DTO público
 * Expone public_code como 'id', oculta UUID interno
 * 
 * POLÍTICA DE SEGURIDAD:
 * - Nunca exponer el UUID interno en APIs públicas
 * - Siempre usar public_code como 'id' en respuestas
 * - UUIDs solo para operaciones internas de base de datos
 * 
 * @param {Site} site - Modelo Sequelize Site
 * @returns {Object} - DTO público para respuestas API
 */
export const toPublicSiteDto = (site) => {
    if (!site) return null;
    
    const dto = {
        id: site.public_code, // CRÍTICO: exponer public_code como 'id'
        name: site.name,
        description: site.description,
        latitude: site.latitude ? parseFloat(site.latitude) : null,
        longitude: site.longitude ? parseFloat(site.longitude) : null,
        address: site.address,
        street_number: site.street_number,
        city: site.city,
        state_province: site.state_province,
        postal_code: site.postal_code,
        timezone: site.timezone,
        building_type: site.building_type,
        area_m2: site.area_m2 ? parseFloat(site.area_m2) : null,
        floors: site.floors,
        operating_hours: site.operating_hours,
        image_url: site.image_url,
        contact_name: site.contact_name,
        contact_phone: site.contact_phone,
        contact_email: site.contact_email,
        is_active: site.is_active,
        created_at: site.created_at,
        updated_at: site.updated_at
    };
    
    // Incluir organization si está presente
    if (site.organization) {
        dto.organization = {
            id: site.organization.public_code, // Exponer public_code como id
            slug: site.organization.slug,
            name: site.organization.name,
            logo_url: site.organization.logo_url
        };
    }
    
    // Incluir country si está presente
    if (site.country) {
        dto.country = {
            id: site.country.id,
            iso_alpha2: site.country.iso_alpha2,
            iso_alpha3: site.country.iso_alpha3,
            phone_code: site.country.phone_code
        };
    }
    
    return dto;
};
