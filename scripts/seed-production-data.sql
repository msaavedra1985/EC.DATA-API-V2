-- =====================================================
-- SCRIPT DE DATOS INICIALES PARA PRODUCCIÓN
-- EC.DATA API - Enterprise REST API
-- =====================================================
-- IMPORTANTE: Este script debe ejecutarse en orden estricto
-- para respetar las dependencias de foreign keys
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ROLES (Primero - porque users.role_id depende de esto)
-- =====================================================

INSERT INTO roles (id, name, description, is_active) VALUES
    (gen_random_uuid(), 'system-admin', 'Administrador del sistema con acceso completo a todas las organizaciones', true),
    (gen_random_uuid(), 'org-admin', 'Administrador de organización con acceso a su org y descendientes', true),
    (gen_random_uuid(), 'org-manager', 'Gerente de organización con acceso a su org e hijos directos', true),
    (gen_random_uuid(), 'user', 'Usuario estándar con acceso solo a sus organizaciones directas', true),
    (gen_random_uuid(), 'viewer', 'Visualizador con permisos de solo lectura', true),
    (gen_random_uuid(), 'guest', 'Invitado con acceso limitado', true),
    (gen_random_uuid(), 'demo', 'Usuario de demostración', true)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. ORGANIZATIONS - Jerarquía
-- =====================================================

-- 2.1. Organización RAÍZ (EC.DATA - sin parent_id)
INSERT INTO organizations (id, slug, name, logo_url, description, parent_id, is_active, config) VALUES
    (gen_random_uuid(), 'ecdata', 'EC.DATA', 'https://cdn.ecdata.com/logos/ecdata.png', 
     'EC.DATA - Organización raíz del sistema', NULL, true, 
     '{"theme": {"primaryColor": "#0066CC", "secondaryColor": "#00A3E0"}, "features": {"multiTenant": true, "analytics": true}}')
ON CONFLICT (slug) DO NOTHING;

-- 2.2. Organizaciones de PRIMER NIVEL (hijas directas de EC.DATA)
INSERT INTO organizations (id, slug, name, logo_url, description, parent_id, is_active, config)
SELECT 
    gen_random_uuid(),
    'acme-corp',
    'ACME Corporation',
    'https://cdn.ecdata.com/logos/acme.png',
    'ACME Corporation - Cliente empresarial',
    (SELECT id FROM organizations WHERE slug = 'ecdata'),
    true,
    '{"theme": {"primaryColor": "#FF6B35"}, "settings": {"invoicePrefix": "ACME"}}'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'acme-corp');

INSERT INTO organizations (id, slug, name, logo_url, description, parent_id, is_active, config)
SELECT 
    gen_random_uuid(),
    'tech-solutions-ar',
    'Tech Solutions Argentina',
    'https://cdn.ecdata.com/logos/techsolutions.png',
    'Tech Solutions Argentina - Proveedor de servicios tecnológicos',
    (SELECT id FROM organizations WHERE slug = 'ecdata'),
    true,
    '{"theme": {"primaryColor": "#6C63FF"}, "settings": {"timezone": "America/Argentina/Buenos_Aires", "currency": "ARS"}}'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'tech-solutions-ar');

INSERT INTO organizations (id, slug, name, logo_url, description, parent_id, is_active, config)
SELECT 
    gen_random_uuid(),
    'global-enterprises-sa',
    'Global Enterprises S.A.',
    'https://cdn.ecdata.com/logos/global.png',
    'Global Enterprises S.A. - Corporación multinacional',
    (SELECT id FROM organizations WHERE slug = 'ecdata'),
    true,
    '{"theme": {"primaryColor": "#28A745"}, "settings": {"multiCurrency": true, "languages": ["es", "en", "pt"]}}'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'global-enterprises-sa');

-- 2.3. Organizaciones de SEGUNDO NIVEL (sub-organizaciones)
INSERT INTO organizations (id, slug, name, logo_url, description, parent_id, is_active, config)
SELECT 
    gen_random_uuid(),
    'acme-latam',
    'ACME LATAM',
    'https://cdn.ecdata.com/logos/acme-latam.png',
    'ACME LATAM - División Latinoamérica',
    (SELECT id FROM organizations WHERE slug = 'acme-corp'),
    true,
    '{"theme": {"primaryColor": "#FF6B35"}, "settings": {"region": "LATAM", "languages": ["es", "pt"]}}'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'acme-latam');

INSERT INTO organizations (id, slug, name, logo_url, description, parent_id, is_active, config)
SELECT 
    gen_random_uuid(),
    'techsol-dev',
    'Tech Solutions Dev Team',
    NULL,
    'Equipo de desarrollo de Tech Solutions',
    (SELECT id FROM organizations WHERE slug = 'tech-solutions-ar'),
    true,
    '{"settings": {"department": "development", "teamSize": 15}}'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'techsol-dev');

-- =====================================================
-- 3. USUARIOS (Tercero - depende de roles y organizations)
-- =====================================================

-- 3.1. System Admin (pertenece a EC.DATA) - Password: Admin123!
INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, organization_id, is_active, email_verified_at)
SELECT 
    gen_random_uuid(),
    'admin@ecdata.com',
    '$2b$10$GA4USD.r9szt0wNl5jwOr.EwsHgTBeK5ZNJmcMy1g.XLBnm/2bHJ.',
    'System',
    'Administrator',
    (SELECT id FROM roles WHERE name = 'system-admin'),
    (SELECT id FROM organizations WHERE slug = 'ecdata'),
    true,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@ecdata.com');

-- 3.2. Org Admins - Password: Admin123!
INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, organization_id, is_active, email_verified_at)
SELECT 
    gen_random_uuid(),
    'admin@acme.com',
    '$2b$10$GA4USD.r9szt0wNl5jwOr.EwsHgTBeK5ZNJmcMy1g.XLBnm/2bHJ.',
    'John',
    'Smith',
    (SELECT id FROM roles WHERE name = 'org-admin'),
    (SELECT id FROM organizations WHERE slug = 'acme-corp'),
    true,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@acme.com');

INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, organization_id, is_active, email_verified_at)
SELECT 
    gen_random_uuid(),
    'admin@techsolutions.com.ar',
    '$2b$10$GA4USD.r9szt0wNl5jwOr.EwsHgTBeK5ZNJmcMy1g.XLBnm/2bHJ.',
    'María',
    'González',
    (SELECT id FROM roles WHERE name = 'org-admin'),
    (SELECT id FROM organizations WHERE slug = 'tech-solutions-ar'),
    true,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@techsolutions.com.ar');

-- 3.3. Org Manager - Password: Manager123!
INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, organization_id, is_active, email_verified_at)
SELECT 
    gen_random_uuid(),
    'manager@acme.com',
    '$2b$10$GQ78MFWxEY1b8wL1LY1ureyhTbF4HLKkHh6gO/IF4Jr2NO6bQik3u',
    'Sarah',
    'Johnson',
    (SELECT id FROM roles WHERE name = 'org-manager'),
    (SELECT id FROM organizations WHERE slug = 'acme-corp'),
    true,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'manager@acme.com');

-- 3.4. Regular Users
-- Password: User123!
INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, organization_id, is_active, email_verified_at)
SELECT 
    gen_random_uuid(),
    'user@acme.com',
    '$2b$10$pT1cksj7AiobdVQjVtgAbOkXNy1vsx2To.g.FPqCFT8OSvnTe4HwO',
    'Carlos',
    'Rodríguez',
    (SELECT id FROM roles WHERE name = 'user'),
    (SELECT id FROM organizations WHERE slug = 'acme-corp'),
    true,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'user@acme.com');

-- Password: Dev123!
INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, organization_id, is_active, email_verified_at)
SELECT 
    gen_random_uuid(),
    'developer@techsolutions.com.ar',
    '$2b$10$Pg9VvIbtYWqqyNreqaKs4udIQp9t2IiQAbZtxoswgEfAXKP/TGuoe',
    'Ana',
    'Martínez',
    (SELECT id FROM roles WHERE name = 'user'),
    (SELECT id FROM organizations WHERE slug = 'techsol-dev'),
    true,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'developer@techsolutions.com.ar');

-- 3.5. Viewer - Password: Viewer123!
INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, organization_id, is_active, email_verified_at)
SELECT 
    gen_random_uuid(),
    'viewer@global.es',
    '$2b$10$VVZVRoJy/g6MLh0X2YnN3.J6VXZUIy//PBb2shS.VNtBGeJtGHJjC',
    'Elena',
    'Fernández',
    (SELECT id FROM roles WHERE name = 'viewer'),
    (SELECT id FROM organizations WHERE slug = 'global-enterprises-sa'),
    true,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'viewer@global.es');

-- 3.6. Guest - Password: Guest123!
INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, organization_id, is_active, email_verified_at)
SELECT 
    gen_random_uuid(),
    'guest@ecdata.com',
    '$2b$10$mCnraM5.NVknzqixHziJI.RfULirHk.NcXVFuXAQdgV.1qnN0JROO',
    'Guest',
    'User',
    (SELECT id FROM roles WHERE name = 'guest'),
    (SELECT id FROM organizations WHERE slug = 'ecdata'),
    true,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'guest@ecdata.com');

-- 3.7. Demo - Password: Demo123!
INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, organization_id, is_active, email_verified_at)
SELECT 
    gen_random_uuid(),
    'demo@ecdata.com',
    '$2b$10$B0FY8xW21bwFXQ8jYUcqYuA7dMMiuCDzX/iBWW8SN8d.dcCvr2DCG',
    'Demo',
    'Account',
    (SELECT id FROM roles WHERE name = 'demo'),
    (SELECT id FROM organizations WHERE slug = 'ecdata'),
    true,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo@ecdata.com');

-- =====================================================
-- 4. USER_ORGANIZATIONS (Último - relación many-to-many)
-- =====================================================

-- 4.1. System Admin - Solo pertenece a EC.DATA (primaria)
INSERT INTO user_organizations (id, user_id, organization_id, is_primary, joined_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'admin@ecdata.com'),
    (SELECT id FROM organizations WHERE slug = 'ecdata'),
    true,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'admin@ecdata.com' AND o.slug = 'ecdata'
);

-- 4.2. ACME Admin - Pertenece a ACME y ACME LATAM
INSERT INTO user_organizations (id, user_id, organization_id, is_primary, joined_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'admin@acme.com'),
    (SELECT id FROM organizations WHERE slug = 'acme-corp'),
    true,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'admin@acme.com' AND o.slug = 'acme-corp'
);

INSERT INTO user_organizations (id, user_id, organization_id, is_primary, joined_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'admin@acme.com'),
    (SELECT id FROM organizations WHERE slug = 'acme-latam'),
    false,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'admin@acme.com' AND o.slug = 'acme-latam'
);

-- 4.3. TechSolutions Admin - Pertenece a Tech Solutions AR y Dev Team
INSERT INTO user_organizations (id, user_id, organization_id, is_primary, joined_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'admin@techsolutions.com.ar'),
    (SELECT id FROM organizations WHERE slug = 'tech-solutions-ar'),
    true,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'admin@techsolutions.com.ar' AND o.slug = 'tech-solutions-ar'
);

INSERT INTO user_organizations (id, user_id, organization_id, is_primary, joined_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'admin@techsolutions.com.ar'),
    (SELECT id FROM organizations WHERE slug = 'techsol-dev'),
    false,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'admin@techsolutions.com.ar' AND o.slug = 'techsol-dev'
);

-- 4.4. ACME Manager - Pertenece a ACME y ACME LATAM
INSERT INTO user_organizations (id, user_id, organization_id, is_primary, joined_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'manager@acme.com'),
    (SELECT id FROM organizations WHERE slug = 'acme-corp'),
    true,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'manager@acme.com' AND o.slug = 'acme-corp'
);

INSERT INTO user_organizations (id, user_id, organization_id, is_primary, joined_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'manager@acme.com'),
    (SELECT id FROM organizations WHERE slug = 'acme-latam'),
    false,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'manager@acme.com' AND o.slug = 'acme-latam'
);

-- 4.5. Regular Users - Solo su organización primaria
INSERT INTO user_organizations (id, user_id, organization_id, is_primary, joined_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'user@acme.com'),
    (SELECT id FROM organizations WHERE slug = 'acme-corp'),
    true,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'user@acme.com' AND o.slug = 'acme-corp'
);

INSERT INTO user_organizations (id, user_id, organization_id, is_primary, joined_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'developer@techsolutions.com.ar'),
    (SELECT id FROM organizations WHERE slug = 'techsol-dev'),
    true,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'developer@techsolutions.com.ar' AND o.slug = 'techsol-dev'
);

INSERT INTO user_organizations (id, user_id, organization_id, is_primary, joined_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'viewer@global.es'),
    (SELECT id FROM organizations WHERE slug = 'global-enterprises-sa'),
    true,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'viewer@global.es' AND o.slug = 'global-enterprises-sa'
);

-- 4.6. Guest y Demo - Pertenecen a EC.DATA
INSERT INTO user_organizations (id, user_id, organization_id, is_primary, joined_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'guest@ecdata.com'),
    (SELECT id FROM organizations WHERE slug = 'ecdata'),
    true,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'guest@ecdata.com' AND o.slug = 'ecdata'
);

INSERT INTO user_organizations (id, user_id, organization_id, is_primary, joined_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'demo@ecdata.com'),
    (SELECT id FROM organizations WHERE slug = 'ecdata'),
    true,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'demo@ecdata.com' AND o.slug = 'ecdata'
);

COMMIT;

-- =====================================================
-- RESUMEN DE DATOS INSERTADOS
-- =====================================================
-- 7 Roles (system-admin, org-admin, org-manager, user, viewer, guest, demo)
-- 6 Organizaciones (EC.DATA + 3 primer nivel + 2 segundo nivel)
-- 9 Usuarios con hashes bcrypt reales ($2b$10$...)
-- 12 Relaciones user_organizations (incluyendo multi-tenancy)
-- =====================================================
