// Datos estáticos para seeding de la base de datos
// Estos datos replican exactamente el dataset de producción

/**
 * Países - 55 países con códigos ISO
 * Los country_id en translations corresponden al orden del array (1-based)
 */
export const countries = [
    { iso_alpha2: 'AR', iso_alpha3: 'ARG', iso_numeric: '032', phone_code: '+54' },
    { iso_alpha2: 'BR', iso_alpha3: 'BRA', iso_numeric: '076', phone_code: '+55' },
    { iso_alpha2: 'CL', iso_alpha3: 'CHL', iso_numeric: '152', phone_code: '+56' },
    { iso_alpha2: 'CO', iso_alpha3: 'COL', iso_numeric: '170', phone_code: '+57' },
    { iso_alpha2: 'MX', iso_alpha3: 'MEX', iso_numeric: '484', phone_code: '+52' },
    { iso_alpha2: 'PE', iso_alpha3: 'PER', iso_numeric: '604', phone_code: '+51' },
    { iso_alpha2: 'UY', iso_alpha3: 'URY', iso_numeric: '858', phone_code: '+598' },
    { iso_alpha2: 'VE', iso_alpha3: 'VEN', iso_numeric: '862', phone_code: '+58' },
    { iso_alpha2: 'EC', iso_alpha3: 'ECU', iso_numeric: '218', phone_code: '+593' },
    { iso_alpha2: 'BO', iso_alpha3: 'BOL', iso_numeric: '068', phone_code: '+591' },
    { iso_alpha2: 'PY', iso_alpha3: 'PRY', iso_numeric: '600', phone_code: '+595' },
    { iso_alpha2: 'CR', iso_alpha3: 'CRI', iso_numeric: '188', phone_code: '+506' },
    { iso_alpha2: 'PA', iso_alpha3: 'PAN', iso_numeric: '591', phone_code: '+507' },
    { iso_alpha2: 'US', iso_alpha3: 'USA', iso_numeric: '840', phone_code: '+1' },
    { iso_alpha2: 'CA', iso_alpha3: 'CAN', iso_numeric: '124', phone_code: '+1' },
    { iso_alpha2: 'ES', iso_alpha3: 'ESP', iso_numeric: '724', phone_code: '+34' },
    { iso_alpha2: 'FR', iso_alpha3: 'FRA', iso_numeric: '250', phone_code: '+33' },
    { iso_alpha2: 'DE', iso_alpha3: 'DEU', iso_numeric: '276', phone_code: '+49' },
    { iso_alpha2: 'IT', iso_alpha3: 'ITA', iso_numeric: '380', phone_code: '+39' },
    { iso_alpha2: 'GB', iso_alpha3: 'GBR', iso_numeric: '826', phone_code: '+44' },
    { iso_alpha2: 'PT', iso_alpha3: 'PRT', iso_numeric: '620', phone_code: '+351' },
    { iso_alpha2: 'NL', iso_alpha3: 'NLD', iso_numeric: '528', phone_code: '+31' },
    { iso_alpha2: 'BE', iso_alpha3: 'BEL', iso_numeric: '056', phone_code: '+32' },
    { iso_alpha2: 'CH', iso_alpha3: 'CHE', iso_numeric: '756', phone_code: '+41' },
    { iso_alpha2: 'AT', iso_alpha3: 'AUT', iso_numeric: '040', phone_code: '+43' },
    { iso_alpha2: 'IE', iso_alpha3: 'IRL', iso_numeric: '372', phone_code: '+353' },
    { iso_alpha2: 'PL', iso_alpha3: 'POL', iso_numeric: '616', phone_code: '+48' },
    { iso_alpha2: 'RU', iso_alpha3: 'RUS', iso_numeric: '643', phone_code: '+7' },
    { iso_alpha2: 'UA', iso_alpha3: 'UKR', iso_numeric: '804', phone_code: '+380' },
    { iso_alpha2: 'CZ', iso_alpha3: 'CZE', iso_numeric: '203', phone_code: '+420' },
    { iso_alpha2: 'SE', iso_alpha3: 'SWE', iso_numeric: '752', phone_code: '+46' },
    { iso_alpha2: 'NO', iso_alpha3: 'NOR', iso_numeric: '578', phone_code: '+47' },
    { iso_alpha2: 'DK', iso_alpha3: 'DNK', iso_numeric: '208', phone_code: '+45' },
    { iso_alpha2: 'FI', iso_alpha3: 'FIN', iso_numeric: '246', phone_code: '+358' },
    { iso_alpha2: 'CN', iso_alpha3: 'CHN', iso_numeric: '156', phone_code: '+86' },
    { iso_alpha2: 'JP', iso_alpha3: 'JPN', iso_numeric: '392', phone_code: '+81' },
    { iso_alpha2: 'IN', iso_alpha3: 'IND', iso_numeric: '356', phone_code: '+91' },
    { iso_alpha2: 'KR', iso_alpha3: 'KOR', iso_numeric: '410', phone_code: '+82' },
    { iso_alpha2: 'ID', iso_alpha3: 'IDN', iso_numeric: '360', phone_code: '+62' },
    { iso_alpha2: 'TH', iso_alpha3: 'THA', iso_numeric: '764', phone_code: '+66' },
    { iso_alpha2: 'MY', iso_alpha3: 'MYS', iso_numeric: '458', phone_code: '+60' },
    { iso_alpha2: 'SG', iso_alpha3: 'SGP', iso_numeric: '702', phone_code: '+65' },
    { iso_alpha2: 'PH', iso_alpha3: 'PHL', iso_numeric: '608', phone_code: '+63' },
    { iso_alpha2: 'VN', iso_alpha3: 'VNM', iso_numeric: '704', phone_code: '+84' },
    { iso_alpha2: 'IL', iso_alpha3: 'ISR', iso_numeric: '376', phone_code: '+972' },
    { iso_alpha2: 'TR', iso_alpha3: 'TUR', iso_numeric: '792', phone_code: '+90' },
    { iso_alpha2: 'SA', iso_alpha3: 'SAU', iso_numeric: '682', phone_code: '+966' },
    { iso_alpha2: 'AE', iso_alpha3: 'ARE', iso_numeric: '784', phone_code: '+971' },
    { iso_alpha2: 'ZA', iso_alpha3: 'ZAF', iso_numeric: '710', phone_code: '+27' },
    { iso_alpha2: 'EG', iso_alpha3: 'EGY', iso_numeric: '818', phone_code: '+20' },
    { iso_alpha2: 'NG', iso_alpha3: 'NGA', iso_numeric: '566', phone_code: '+234' },
    { iso_alpha2: 'KE', iso_alpha3: 'KEN', iso_numeric: '404', phone_code: '+254' },
    { iso_alpha2: 'MA', iso_alpha3: 'MAR', iso_numeric: '504', phone_code: '+212' },
    { iso_alpha2: 'AU', iso_alpha3: 'AUS', iso_numeric: '036', phone_code: '+61' },
    { iso_alpha2: 'NZ', iso_alpha3: 'NZL', iso_numeric: '554', phone_code: '+64' },
];

/**
 * Traducciones de países - 110 traducciones (55 países x 2 idiomas)
 * country_id: índice basado en 1 del array countries
 */
export const countryTranslations = [
    // Argentina (1)
    { country_id: 1, lang: 'es', name: 'Argentina', official_name: 'República Argentina' },
    { country_id: 1, lang: 'en', name: 'Argentina', official_name: 'Argentine Republic' },
    // Brasil (2)
    { country_id: 2, lang: 'es', name: 'Brasil', official_name: 'República Federativa del Brasil' },
    { country_id: 2, lang: 'en', name: 'Brazil', official_name: 'Federative Republic of Brazil' },
    // Chile (3)
    { country_id: 3, lang: 'es', name: 'Chile', official_name: 'República de Chile' },
    { country_id: 3, lang: 'en', name: 'Chile', official_name: 'Republic of Chile' },
    // Colombia (4)
    { country_id: 4, lang: 'es', name: 'Colombia', official_name: 'República de Colombia' },
    { country_id: 4, lang: 'en', name: 'Colombia', official_name: 'Republic of Colombia' },
    // México (5)
    { country_id: 5, lang: 'es', name: 'México', official_name: 'Estados Unidos Mexicanos' },
    { country_id: 5, lang: 'en', name: 'Mexico', official_name: 'United Mexican States' },
    // Perú (6)
    { country_id: 6, lang: 'es', name: 'Perú', official_name: 'República del Perú' },
    { country_id: 6, lang: 'en', name: 'Peru', official_name: 'Republic of Peru' },
    // Uruguay (7)
    { country_id: 7, lang: 'es', name: 'Uruguay', official_name: 'República Oriental del Uruguay' },
    { country_id: 7, lang: 'en', name: 'Uruguay', official_name: 'Oriental Republic of Uruguay' },
    // Venezuela (8)
    { country_id: 8, lang: 'es', name: 'Venezuela', official_name: 'República Bolivariana de Venezuela' },
    { country_id: 8, lang: 'en', name: 'Venezuela', official_name: 'Bolivarian Republic of Venezuela' },
    // Ecuador (9)
    { country_id: 9, lang: 'es', name: 'Ecuador', official_name: 'República del Ecuador' },
    { country_id: 9, lang: 'en', name: 'Ecuador', official_name: 'Republic of Ecuador' },
    // Bolivia (10)
    { country_id: 10, lang: 'es', name: 'Bolivia', official_name: 'Estado Plurinacional de Bolivia' },
    { country_id: 10, lang: 'en', name: 'Bolivia', official_name: 'Plurinational State of Bolivia' },
    // Paraguay (11)
    { country_id: 11, lang: 'es', name: 'Paraguay', official_name: 'República del Paraguay' },
    { country_id: 11, lang: 'en', name: 'Paraguay', official_name: 'Republic of Paraguay' },
    // Costa Rica (12)
    { country_id: 12, lang: 'es', name: 'Costa Rica', official_name: 'República de Costa Rica' },
    { country_id: 12, lang: 'en', name: 'Costa Rica', official_name: 'Republic of Costa Rica' },
    // Panamá (13)
    { country_id: 13, lang: 'es', name: 'Panamá', official_name: 'República de Panamá' },
    { country_id: 13, lang: 'en', name: 'Panama', official_name: 'Republic of Panama' },
    // Estados Unidos (14)
    { country_id: 14, lang: 'es', name: 'Estados Unidos', official_name: 'Estados Unidos de América' },
    { country_id: 14, lang: 'en', name: 'United States', official_name: 'United States of America' },
    // Canadá (15)
    { country_id: 15, lang: 'es', name: 'Canadá', official_name: 'Canadá' },
    { country_id: 15, lang: 'en', name: 'Canada', official_name: 'Canada' },
    // España (16)
    { country_id: 16, lang: 'es', name: 'España', official_name: 'Reino de España' },
    { country_id: 16, lang: 'en', name: 'Spain', official_name: 'Kingdom of Spain' },
    // Francia (17)
    { country_id: 17, lang: 'es', name: 'Francia', official_name: 'República Francesa' },
    { country_id: 17, lang: 'en', name: 'France', official_name: 'French Republic' },
    // Alemania (18)
    { country_id: 18, lang: 'es', name: 'Alemania', official_name: 'República Federal de Alemania' },
    { country_id: 18, lang: 'en', name: 'Germany', official_name: 'Federal Republic of Germany' },
    // Italia (19)
    { country_id: 19, lang: 'es', name: 'Italia', official_name: 'República Italiana' },
    { country_id: 19, lang: 'en', name: 'Italy', official_name: 'Italian Republic' },
    // Reino Unido (20)
    { country_id: 20, lang: 'es', name: 'Reino Unido', official_name: 'Reino Unido de Gran Bretaña e Irlanda del Norte' },
    { country_id: 20, lang: 'en', name: 'United Kingdom', official_name: 'United Kingdom of Great Britain and Northern Ireland' },
    // Portugal (21)
    { country_id: 21, lang: 'es', name: 'Portugal', official_name: 'República Portuguesa' },
    { country_id: 21, lang: 'en', name: 'Portugal', official_name: 'Portuguese Republic' },
    // Países Bajos (22)
    { country_id: 22, lang: 'es', name: 'Países Bajos', official_name: 'Reino de los Países Bajos' },
    { country_id: 22, lang: 'en', name: 'Netherlands', official_name: 'Kingdom of the Netherlands' },
    // Bélgica (23)
    { country_id: 23, lang: 'es', name: 'Bélgica', official_name: 'Reino de Bélgica' },
    { country_id: 23, lang: 'en', name: 'Belgium', official_name: 'Kingdom of Belgium' },
    // Suiza (24)
    { country_id: 24, lang: 'es', name: 'Suiza', official_name: 'Confederación Suiza' },
    { country_id: 24, lang: 'en', name: 'Switzerland', official_name: 'Swiss Confederation' },
    // Austria (25)
    { country_id: 25, lang: 'es', name: 'Austria', official_name: 'República de Austria' },
    { country_id: 25, lang: 'en', name: 'Austria', official_name: 'Republic of Austria' },
    // Irlanda (26)
    { country_id: 26, lang: 'es', name: 'Irlanda', official_name: 'Irlanda' },
    { country_id: 26, lang: 'en', name: 'Ireland', official_name: 'Ireland' },
    // Polonia (27)
    { country_id: 27, lang: 'es', name: 'Polonia', official_name: 'República de Polonia' },
    { country_id: 27, lang: 'en', name: 'Poland', official_name: 'Republic of Poland' },
    // Rusia (28)
    { country_id: 28, lang: 'es', name: 'Rusia', official_name: 'Federación de Rusia' },
    { country_id: 28, lang: 'en', name: 'Russia', official_name: 'Russian Federation' },
    // Ucrania (29)
    { country_id: 29, lang: 'es', name: 'Ucrania', official_name: 'Ucrania' },
    { country_id: 29, lang: 'en', name: 'Ukraine', official_name: 'Ukraine' },
    // República Checa (30)
    { country_id: 30, lang: 'es', name: 'República Checa', official_name: 'República Checa' },
    { country_id: 30, lang: 'en', name: 'Czech Republic', official_name: 'Czech Republic' },
    // Suecia (31)
    { country_id: 31, lang: 'es', name: 'Suecia', official_name: 'Reino de Suecia' },
    { country_id: 31, lang: 'en', name: 'Sweden', official_name: 'Kingdom of Sweden' },
    // Noruega (32)
    { country_id: 32, lang: 'es', name: 'Noruega', official_name: 'Reino de Noruega' },
    { country_id: 32, lang: 'en', name: 'Norway', official_name: 'Kingdom of Norway' },
    // Dinamarca (33)
    { country_id: 33, lang: 'es', name: 'Dinamarca', official_name: 'Reino de Dinamarca' },
    { country_id: 33, lang: 'en', name: 'Denmark', official_name: 'Kingdom of Denmark' },
    // Finlandia (34)
    { country_id: 34, lang: 'es', name: 'Finlandia', official_name: 'República de Finlandia' },
    { country_id: 34, lang: 'en', name: 'Finland', official_name: 'Republic of Finland' },
    // China (35)
    { country_id: 35, lang: 'es', name: 'China', official_name: 'República Popular China' },
    { country_id: 35, lang: 'en', name: 'China', official_name: 'People\'s Republic of China' },
    // Japón (36)
    { country_id: 36, lang: 'es', name: 'Japón', official_name: 'Japón' },
    { country_id: 36, lang: 'en', name: 'Japan', official_name: 'Japan' },
    // India (37)
    { country_id: 37, lang: 'es', name: 'India', official_name: 'República de la India' },
    { country_id: 37, lang: 'en', name: 'India', official_name: 'Republic of India' },
    // Corea del Sur (38)
    { country_id: 38, lang: 'es', name: 'Corea del Sur', official_name: 'República de Corea' },
    { country_id: 38, lang: 'en', name: 'South Korea', official_name: 'Republic of Korea' },
    // Indonesia (39)
    { country_id: 39, lang: 'es', name: 'Indonesia', official_name: 'República de Indonesia' },
    { country_id: 39, lang: 'en', name: 'Indonesia', official_name: 'Republic of Indonesia' },
    // Tailandia (40)
    { country_id: 40, lang: 'es', name: 'Tailandia', official_name: 'Reino de Tailandia' },
    { country_id: 40, lang: 'en', name: 'Thailand', official_name: 'Kingdom of Thailand' },
    // Malasia (41)
    { country_id: 41, lang: 'es', name: 'Malasia', official_name: 'Malasia' },
    { country_id: 41, lang: 'en', name: 'Malaysia', official_name: 'Malaysia' },
    // Singapur (42)
    { country_id: 42, lang: 'es', name: 'Singapur', official_name: 'República de Singapur' },
    { country_id: 42, lang: 'en', name: 'Singapore', official_name: 'Republic of Singapore' },
    // Filipinas (43)
    { country_id: 43, lang: 'es', name: 'Filipinas', official_name: 'República de Filipinas' },
    { country_id: 43, lang: 'en', name: 'Philippines', official_name: 'Republic of the Philippines' },
    // Vietnam (44)
    { country_id: 44, lang: 'es', name: 'Vietnam', official_name: 'República Socialista de Vietnam' },
    { country_id: 44, lang: 'en', name: 'Vietnam', official_name: 'Socialist Republic of Vietnam' },
    // Israel (45)
    { country_id: 45, lang: 'es', name: 'Israel', official_name: 'Estado de Israel' },
    { country_id: 45, lang: 'en', name: 'Israel', official_name: 'State of Israel' },
    // Turquía (46)
    { country_id: 46, lang: 'es', name: 'Turquía', official_name: 'República de Turquía' },
    { country_id: 46, lang: 'en', name: 'Turkey', official_name: 'Republic of Turkey' },
    // Arabia Saudita (47)
    { country_id: 47, lang: 'es', name: 'Arabia Saudita', official_name: 'Reino de Arabia Saudita' },
    { country_id: 47, lang: 'en', name: 'Saudi Arabia', official_name: 'Kingdom of Saudi Arabia' },
    // Emiratos Árabes Unidos (48)
    { country_id: 48, lang: 'es', name: 'Emiratos Árabes Unidos', official_name: 'Emiratos Árabes Unidos' },
    { country_id: 48, lang: 'en', name: 'United Arab Emirates', official_name: 'United Arab Emirates' },
    // Sudáfrica (49)
    { country_id: 49, lang: 'es', name: 'Sudáfrica', official_name: 'República de Sudáfrica' },
    { country_id: 49, lang: 'en', name: 'South Africa', official_name: 'Republic of South Africa' },
    // Egipto (50)
    { country_id: 50, lang: 'es', name: 'Egipto', official_name: 'República Árabe de Egipto' },
    { country_id: 50, lang: 'en', name: 'Egypt', official_name: 'Arab Republic of Egypt' },
    // Nigeria (51)
    { country_id: 51, lang: 'es', name: 'Nigeria', official_name: 'República Federal de Nigeria' },
    { country_id: 51, lang: 'en', name: 'Nigeria', official_name: 'Federal Republic of Nigeria' },
    // Kenia (52)
    { country_id: 52, lang: 'es', name: 'Kenia', official_name: 'República de Kenia' },
    { country_id: 52, lang: 'en', name: 'Kenya', official_name: 'Republic of Kenya' },
    // Marruecos (53)
    { country_id: 53, lang: 'es', name: 'Marruecos', official_name: 'Reino de Marruecos' },
    { country_id: 53, lang: 'en', name: 'Morocco', official_name: 'Kingdom of Morocco' },
    // Australia (54)
    { country_id: 54, lang: 'es', name: 'Australia', official_name: 'Mancomunidad de Australia' },
    { country_id: 54, lang: 'en', name: 'Australia', official_name: 'Commonwealth of Australia' },
    // Nueva Zelanda (55)
    { country_id: 55, lang: 'es', name: 'Nueva Zelanda', official_name: 'Nueva Zelanda' },
    { country_id: 55, lang: 'en', name: 'New Zealand', official_name: 'New Zealand' },
];

/**
 * Roles - 7 roles predefinidos del sistema RBAC
 * Estos roles son fundamentales para el sistema de autenticación
 */
export const roles = [
    {
        name: 'system-admin',
        description: 'Full platform control (all organizations). Access to global panel, auditing, plans/quotas, feature flags. Can create/suspend/delete organizations and users. No tenant restrictions.',
        is_active: true,
    },
    {
        name: 'org-admin',
        description: 'Administrator of their organization (and sub-organizations if they exist). Creates/manages users in their org, assigns roles, configures org preferences/themes/languages, and can create other org-admins. Rule: an organization cannot exist without at least one org-admin.',
        is_active: true,
    },
    {
        name: 'org-manager',
        description: 'Advanced operational management within the org (teams/sections/processes). Can view and manage operational data (e.g., invoices, reports, dashboards) and users in their area, but cannot change global organization settings (billing, branding, SSO, etc.).',
        is_active: true,
    },
    {
        name: 'user',
        description: 'Standard internal user. Access to enabled sections; can create/view own content or team content (e.g., upload invoices, view dashboards), without user management or configuration permissions.',
        is_active: true,
    },
    {
        name: 'viewer',
        description: 'Read-only access. Ideal for dashboards and reports. Can view information and (if enabled) download files/reports. Cannot edit or execute actions that modify data.',
        is_active: true,
    },
    {
        name: 'guest',
        description: 'Temporary or limited access (via token/link with expiration). Normally read-only on a specific subset of resources; designed to share specific data with third parties without full registration.',
        is_active: true,
    },
    {
        name: 'demo',
        description: 'Demo environment user. Always read-only and isolated from real data; sees example data (mock) with statistical consistency. Cannot modify anything, even if the UI attempts it.',
        is_active: true,
    },
];

/**
 * Organizaciones - 3 organizaciones de ejemplo
 * Los country_id corresponden al array countries (USA=14, Argentina=1, España=16)
 */
export const organizations = [
    {
        slug: 'acme-corp',
        name: 'ACME Corporation',
        country_id: 14, // USA
        tax_id: '12-3456789',
        email: 'contact@acmecorp.com',
        phone: '+1-555-0100',
        address: '123 Main St, New York, NY 10001, USA',
        config: { currency: 'USD', language: 'en', timezone: 'America/New_York' },
    },
    {
        slug: 'techsolutions-ar',
        name: 'Tech Solutions Argentina',
        country_id: 1, // Argentina
        tax_id: '30-12345678-9',
        email: 'info@techsolutions.com.ar',
        phone: '+54-11-4567-8900',
        address: 'Av. Corrientes 1234, Buenos Aires, Argentina',
        config: { currency: 'ARS', language: 'es', timezone: 'America/Argentina/Buenos_Aires' },
    },
    {
        slug: 'global-enterprises',
        name: 'Global Enterprises S.A.',
        country_id: 16, // España
        tax_id: 'B12345678',
        email: 'contacto@globalenterprises.es',
        phone: '+34-91-123-4567',
        address: 'Gran Vía 123, 28013 Madrid, España',
        config: { currency: 'EUR', language: 'es', timezone: 'Europe/Madrid' },
    },
];

/**
 * Usuarios de prueba - 7 usuarios (uno por rol)
 * Password para todos: "Test123!" (se hasheará con bcrypt al insertar)
 * Los org_slug corresponden a las organizaciones definidas arriba
 */
export const users = [
    {
        email: 'admin@ecdata.com',
        first_name: 'System',
        last_name: 'Administrator',
        role_name: 'system-admin',
        org_slug: null, // Sin organización (acceso global)
    },
    {
        email: 'orgadmin@acme.com',
        first_name: 'John',
        last_name: 'Smith',
        role_name: 'org-admin',
        org_slug: 'acme-corp',
    },
    {
        email: 'manager@techsolutions.com.ar',
        first_name: 'María',
        last_name: 'García',
        role_name: 'org-manager',
        org_slug: 'techsolutions-ar',
    },
    {
        email: 'user@global.es',
        first_name: 'Carlos',
        last_name: 'Rodríguez',
        role_name: 'user',
        org_slug: 'global-enterprises',
    },
    {
        email: 'viewer@acme.com',
        first_name: 'Jane',
        last_name: 'Doe',
        role_name: 'viewer',
        org_slug: 'acme-corp',
    },
    {
        email: 'guest@demo.com',
        first_name: 'Guest',
        last_name: 'User',
        role_name: 'guest',
        org_slug: null, // Sin organización
    },
    {
        email: 'demo@ecdata.com',
        first_name: 'Demo',
        last_name: 'Account',
        role_name: 'demo',
        org_slug: null, // Sin organización
    },
];
