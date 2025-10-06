import Role from '../../modules/auth/models/Role.js';
import { dbLogger } from '../../utils/logger.js';

/**
 * Datos de roles del sistema RBAC
 * 7 roles con sus descripciones en inglés
 */
const rolesData = [
    {
        name: 'system-admin',
        description: 'Full platform control (all organizations). Access to global panel, auditing, plans/quotas, feature flags. Can create/suspend/delete organizations and users. No tenant restrictions.',
        is_active: true
    },
    {
        name: 'org-admin',
        description: 'Administrator of their organization (and sub-organizations if they exist). Creates/manages users in their org, assigns roles, configures org preferences/themes/languages, and can create other org-admins. Rule: an organization cannot exist without at least one org-admin.',
        is_active: true
    },
    {
        name: 'org-manager',
        description: 'Advanced operational management within the org (teams/sections/processes). Can view and manage operational data (e.g., invoices, reports, dashboards) and users in their area, but cannot change global organization settings (billing, branding, SSO, etc.).',
        is_active: true
    },
    {
        name: 'user',
        description: 'Standard internal user. Access to enabled sections; can create/view own content or team content (e.g., upload invoices, view dashboards), without user management or configuration permissions.',
        is_active: true
    },
    {
        name: 'viewer',
        description: 'Read-only access. Ideal for dashboards and reports. Can view information and (if enabled) download files/reports. Cannot edit or execute actions that modify data.',
        is_active: true
    },
    {
        name: 'guest',
        description: 'Temporary or limited access (via token/link with expiration). Normally read-only on a specific subset of resources; designed to share specific data with third parties without full registration.',
        is_active: true
    },
    {
        name: 'demo',
        description: 'Demo environment user. Always read-only and isolated from real data; sees example data (mock) with statistical consistency. Cannot modify anything, even if the UI attempts it.',
        is_active: true
    }
];

/**
 * Seeder de roles del sistema
 * Crea los 7 roles base si no existen
 */
export const seedRoles = async () => {
    try {
        // Verificar si ya existen roles
        const existingRoles = await Role.count();
        
        if (existingRoles > 0) {
            dbLogger.info(`⏭️  Roles already exist (${existingRoles} found), skipping seeder`);
            return {
                rolesCreated: 0,
                rolesSkipped: existingRoles
            };
        }

        // Crear roles
        const roles = await Role.bulkCreate(rolesData);
        
        dbLogger.info(`✅ ${roles.length} roles created successfully`);
        
        return {
            rolesCreated: roles.length,
            rolesSkipped: 0
        };
    } catch (error) {
        dbLogger.error(error, '❌ Error in roles seeder');
        throw error;
    }
};
