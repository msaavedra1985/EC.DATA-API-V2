// modules/sites/helpers/serializers.js
// Serializadores para convertir modelos internos a DTOs públicos

/**
 * Convertir modelo Site a DTO público
 * Expone publicCode como 'id', oculta UUID interno
 * 
 * POLÍTICA DE SEGURIDAD:
 * - Nunca exponer el UUID interno en APIs públicas
 * - Siempre usar publicCode como 'id' en respuestas
 * - UUIDs solo para operaciones internas de base de datos
 * 
 * @param {Site} site - Modelo Sequelize Site
 * @returns {Object} - DTO público para respuestas API
 */
export const toPublicSiteDto = (site) => {
    if (!site) return null;
    
    const dto = {
        id: site.publicCode,
        name: site.name,
        description: site.description,
        latitude: site.latitude ? parseFloat(site.latitude) : null,
        longitude: site.longitude ? parseFloat(site.longitude) : null,
        address: site.address,
        streetNumber: site.streetNumber,
        city: site.city,
        stateProvince: site.stateProvince,
        postalCode: site.postalCode,
        timezone: site.timezone,
        buildingType: site.buildingType,
        areaM2: site.areaM2 ? parseFloat(site.areaM2) : null,
        floors: site.floors,
        operatingHours: site.operatingHours,
        imageUrl: site.imageUrl,
        contactName: site.contactName,
        contactPhone: site.contactPhone,
        contactEmail: site.contactEmail,
        isActive: site.isActive,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt
    };
    
    // Incluir organization si está presente
    if (site.organization) {
        dto.organization = {
            id: site.organization.publicCode,
            slug: site.organization.slug,
            name: site.organization.name,
            logoUrl: site.organization.logoUrl
        };
    }
    
    // Incluir country si está presente
    if (site.country) {
        dto.country = {
            id: site.country.id,
            isoAlpha2: site.country.isoAlpha2,
            isoAlpha3: site.country.isoAlpha3,
            phoneCode: site.country.phoneCode
        };
    }
    
    return dto;
};
