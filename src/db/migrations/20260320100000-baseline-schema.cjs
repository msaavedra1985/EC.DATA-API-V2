'use strict';

/**
 * Migración baseline única
 * 
 * Reemplaza las 48 migraciones acumuladas por una sola que crea el esquema completo.
 * Incluye:
 *   - Extensión ltree
 *   - ENUMs
 *   - Todas las tablas en orden correcto (FK-safe)
 *   - Función generate_resource_path y trigger resource_hierarchy_path_trigger
 *   - Índices
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const q = queryInterface.sequelize;

        // ============================================================
        // 1. EXTENSIÓN LTREE
        // ============================================================
        await q.query(`CREATE EXTENSION IF NOT EXISTS ltree;`);

        // ============================================================
        // 2. ENUMs
        // ============================================================
        await q.query(`
            DO $$ BEGIN
                CREATE TYPE resource_node_type AS ENUM ('folder', 'site', 'channel');
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                CREATE TYPE enum_sites_building_type AS ENUM (
                    'office', 'warehouse', 'factory', 'retail',
                    'hospital', 'school', 'datacenter', 'hotel',
                    'restaurant', 'residential', 'mixed', 'other'
                );
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                CREATE TYPE enum_devices_status AS ENUM (
                    'active', 'inactive', 'maintenance', 'decommissioned'
                );
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                CREATE TYPE channel_status AS ENUM ('active', 'inactive', 'error', 'disabled');
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                CREATE TYPE enum_file_uploads_status AS ENUM ('pending', 'uploaded', 'linked', 'deleted');
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                CREATE TYPE enum_file_uploads_category AS ENUM (
                    'logo', 'image', 'document', 'firmware', 'backup', 'export', 'import', 'attachment', 'other'
                );
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                CREATE TYPE asset_category_scope AS ENUM ('organization', 'user');
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                CREATE TYPE enum_states_type AS ENUM (
                    'state', 'province', 'department', 'region', 'territory', 'district', 'other'
                );
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                CREATE TYPE enum_schedule_exceptions_type AS ENUM ('closed', 'special');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);

        // ============================================================
        // 3. ROLES
        // ============================================================
        await queryInterface.createTable('roles', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            name: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            description: { type: Sequelize.TEXT, allowNull: false },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`CREATE UNIQUE INDEX roles_name_unique ON roles (name)`);

        // ============================================================
        // 4. ORGANIZATIONS
        // ============================================================
        await queryInterface.createTable('organizations', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            human_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, autoIncrement: true },
            public_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            slug: { type: Sequelize.STRING(100), allowNull: false, unique: true },
            name: { type: Sequelize.STRING(200), allowNull: false },
            parent_id: {
                type: Sequelize.UUID, allowNull: true,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            logo_url: { type: Sequelize.STRING(500), allowNull: true },
            description: { type: Sequelize.TEXT, allowNull: true },
            tax_id: { type: Sequelize.STRING(50), allowNull: true },
            email: { type: Sequelize.STRING(255), allowNull: true },
            phone: { type: Sequelize.STRING(50), allowNull: true },
            address: { type: Sequelize.TEXT, allowNull: true },
            config: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX organizations_public_code_idx ON organizations (public_code);
            CREATE INDEX organizations_human_id_idx ON organizations (human_id);
            CREATE UNIQUE INDEX organizations_slug_unique ON organizations (slug);
            CREATE INDEX organizations_parent_id_idx ON organizations (parent_id);
            CREATE INDEX organizations_is_active_idx ON organizations (is_active);
            CREATE INDEX organizations_email_idx ON organizations (email);
        `);

        // ============================================================
        // 5. USERS
        // ============================================================
        await queryInterface.createTable('users', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            human_id: { type: Sequelize.INTEGER, allowNull: false },
            public_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
            username: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            password_hash: { type: Sequelize.STRING(255), allowNull: false },
            first_name: { type: Sequelize.STRING(100), allowNull: false },
            last_name: { type: Sequelize.STRING(100), allowNull: false },
            role_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'roles', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            organization_id: {
                type: Sequelize.UUID, allowNull: true,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            last_login_at: { type: Sequelize.DATE, allowNull: true },
            email_verified_at: { type: Sequelize.DATE, allowNull: true },
            phone: { type: Sequelize.STRING(50), allowNull: true },
            language: { type: Sequelize.STRING(5), allowNull: true, defaultValue: 'es' },
            timezone: { type: Sequelize.STRING(100), allowNull: true, defaultValue: 'America/Argentina/Buenos_Aires' },
            avatar_url: { type: Sequelize.TEXT, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE UNIQUE INDEX users_email_unique ON users (email);
            CREATE UNIQUE INDEX users_public_code_unique ON users (public_code);
            CREATE UNIQUE INDEX users_org_human_id_unique ON users (organization_id, human_id);
            CREATE INDEX users_organization_id_idx ON users (organization_id);
            CREATE INDEX users_role_id_idx ON users (role_id);
            CREATE INDEX users_is_active_idx ON users (is_active);
        `);

        // ============================================================
        // 6. REFRESH_TOKENS
        // ============================================================
        await queryInterface.createTable('refresh_tokens', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            user_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
            expires_at: { type: Sequelize.DATE, allowNull: false },
            last_used_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            is_revoked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            revoked_at: { type: Sequelize.DATE, allowNull: true },
            revoked_reason: {
                type: Sequelize.ENUM('logout', 'logout_all', 'password_change', 'suspicious_activity', 'expired', 'idle_timeout', 'rotated'),
                allowNull: true
            },
            user_agent: { type: Sequelize.TEXT, allowNull: true },
            ip_address: { type: Sequelize.STRING(45), allowNull: true },
            remember_me: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
            CREATE UNIQUE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
            CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
            CREATE INDEX idx_refresh_tokens_is_revoked ON refresh_tokens (is_revoked);
            CREATE INDEX idx_refresh_tokens_cleanup ON refresh_tokens (is_revoked, expires_at);
        `);

        // ============================================================
        // 7. USER_ORGANIZATIONS
        // ============================================================
        await queryInterface.createTable('user_organizations', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            user_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            organization_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            joined_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            role_in_org: {
                type: Sequelize.ENUM('admin', 'member', 'viewer'),
                allowNull: false, defaultValue: 'member'
            },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE UNIQUE INDEX user_org_unique ON user_organizations (user_id, organization_id) WHERE deleted_at IS NULL;
            CREATE INDEX user_organizations_user_id_idx ON user_organizations (user_id);
            CREATE INDEX user_organizations_organization_id_idx ON user_organizations (organization_id);
            CREATE INDEX user_organizations_is_primary_idx ON user_organizations (is_primary);
            CREATE INDEX user_organizations_joined_at_idx ON user_organizations (joined_at);
            CREATE INDEX user_organizations_role_in_org_idx ON user_organizations (role_in_org);
        `);

        // ============================================================
        // 8. COUNTRIES
        // ============================================================
        await queryInterface.createTable('countries', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            iso_alpha2: { type: Sequelize.STRING(2), allowNull: false, unique: true },
            iso_alpha3: { type: Sequelize.STRING(3), allowNull: false, unique: true },
            iso_numeric: { type: Sequelize.STRING(3), allowNull: false, unique: true },
            phone_code: { type: Sequelize.STRING(10), allowNull: true },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`
            CREATE INDEX countries_iso_alpha2_idx ON countries (iso_alpha2);
            CREATE INDEX countries_iso_alpha3_idx ON countries (iso_alpha3);
            CREATE INDEX countries_is_active_idx ON countries (is_active);
        `);

        // ============================================================
        // 9. COUNTRY_TRANSLATIONS
        // ============================================================
        await queryInterface.createTable('country_translations', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            country_code: {
                type: Sequelize.STRING(2), allowNull: false,
                references: { model: 'countries', key: 'iso_alpha2' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            lang: { type: Sequelize.STRING(5), allowNull: false },
            name: { type: Sequelize.STRING(100), allowNull: false },
            official_name: { type: Sequelize.STRING(200), allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`
            CREATE UNIQUE INDEX unique_country_code_lang ON country_translations (country_code, lang);
            CREATE INDEX country_translations_lang_idx ON country_translations (lang);
        `);

        // ============================================================
        // 10. STATES
        // ============================================================
        await queryInterface.createTable('states', {
            code: { type: Sequelize.STRING(10), primaryKey: true, allowNull: false },
            country_code: {
                type: Sequelize.STRING(2), allowNull: false,
                references: { model: 'countries', key: 'iso_alpha2' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            state_code: { type: Sequelize.STRING(10), allowNull: false },
            type: { type: 'enum_states_type', allowNull: true },
            latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
            longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`
            CREATE INDEX states_country_code_idx ON states (country_code);
            CREATE INDEX states_is_active_idx ON states (is_active);
        `);

        // ============================================================
        // 11. STATE_TRANSLATIONS
        // ============================================================
        await queryInterface.createTable('state_translations', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            state_code: {
                type: Sequelize.STRING(10), allowNull: false,
                references: { model: 'states', key: 'code' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            lang: { type: Sequelize.STRING(5), allowNull: false },
            name: { type: Sequelize.STRING(200), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`
            CREATE UNIQUE INDEX unique_state_code_lang ON state_translations (state_code, lang);
            CREATE INDEX state_translations_lang_idx ON state_translations (lang);
        `);

        // ============================================================
        // 12. ORGANIZATION_COUNTRIES
        // ============================================================
        await queryInterface.createTable('organization_countries', {
            id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
            organization_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            country_code: {
                type: Sequelize.STRING(2), allowNull: false,
                references: { model: 'countries', key: 'iso_alpha2' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`
            CREATE UNIQUE INDEX organization_countries_org_country_unique ON organization_countries (organization_id, country_code);
            CREATE INDEX organization_countries_organization_id_idx ON organization_countries (organization_id);
            CREATE INDEX organization_countries_country_code_idx ON organization_countries (country_code);
        `);

        // ============================================================
        // 13. SITES
        // ============================================================
        await queryInterface.createTable('sites', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            human_id: { type: Sequelize.INTEGER, allowNull: false, unique: true },
            public_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            organization_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            name: { type: Sequelize.STRING(200), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true },
            latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
            longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
            address: { type: Sequelize.STRING(500), allowNull: true },
            street_number: { type: Sequelize.STRING(20), allowNull: true },
            city: { type: Sequelize.STRING(100), allowNull: true },
            state_province: { type: Sequelize.STRING(100), allowNull: true },
            postal_code: { type: Sequelize.STRING(20), allowNull: true },
            country_code: {
                type: Sequelize.STRING(2), allowNull: false,
                references: { model: 'countries', key: 'iso_alpha2' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            timezone: { type: Sequelize.STRING(100), allowNull: true },
            building_type: { type: 'enum_sites_building_type', allowNull: true },
            area_m2: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
            floors: { type: Sequelize.INTEGER, allowNull: true },
            operating_hours: { type: Sequelize.STRING(200), allowNull: true },
            image_url: { type: Sequelize.STRING(500), allowNull: true },
            contact_name: { type: Sequelize.STRING(100), allowNull: true },
            contact_phone: { type: Sequelize.STRING(50), allowNull: true },
            contact_email: { type: Sequelize.STRING(100), allowNull: true },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX sites_organization_id_idx ON sites (organization_id);
            CREATE INDEX sites_country_code_idx ON sites (country_code);
            CREATE INDEX sites_is_active_idx ON sites (is_active);
        `);

        // ============================================================
        // 14. ASSET_CATEGORIES
        // ============================================================
        await queryInterface.createTable('asset_categories', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: Sequelize.STRING(100), allowNull: false },
            color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: '#6B7280' },
            level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
            parent_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: 'asset_categories', key: 'id' }
            },
            path: { type: Sequelize.STRING(500), allowNull: true },
            scope: { type: 'asset_category_scope', allowNull: false },
            organization_id: {
                type: Sequelize.UUID, allowNull: true,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            user_id: {
                type: Sequelize.UUID, allowNull: true,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX asset_categories_path_idx ON asset_categories (path);
            CREATE INDEX asset_categories_scope_org_idx ON asset_categories (scope, organization_id) WHERE scope = 'organization';
            CREATE INDEX asset_categories_scope_user_idx ON asset_categories (scope, user_id) WHERE scope = 'user';
            CREATE INDEX asset_categories_parent_id_idx ON asset_categories (parent_id);
            CREATE INDEX asset_categories_level_idx ON asset_categories (level);
            CREATE INDEX asset_categories_is_active_idx ON asset_categories (is_active);
            ALTER TABLE asset_categories
                ADD CONSTRAINT asset_categories_org_scope_check
                CHECK (
                    (scope = 'organization' AND organization_id IS NOT NULL AND user_id IS NULL) OR
                    (scope = 'user' AND user_id IS NOT NULL)
                );
        `);

        // ============================================================
        // 15. MEASUREMENT_TYPES
        // ============================================================
        await queryInterface.createTable('measurement_types', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            table_prefix: { type: Sequelize.STRING(20), allowNull: false, defaultValue: '' },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`
            CREATE INDEX measurement_types_table_prefix_idx ON measurement_types (table_prefix);
            CREATE INDEX measurement_types_is_active_idx ON measurement_types (is_active);
        `);

        // ============================================================
        // 16. MEASUREMENT_TYPE_TRANSLATIONS
        // ============================================================
        await queryInterface.createTable('measurement_type_translations', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            measurement_type_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'measurement_types', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            lang: { type: Sequelize.STRING(5), allowNull: false },
            name: { type: Sequelize.STRING(100), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`
            CREATE UNIQUE INDEX measurement_type_translations_type_lang ON measurement_type_translations (measurement_type_id, lang);
        `);

        // ============================================================
        // 17. VARIABLES
        // ============================================================
        await queryInterface.createTable('variables', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            measurement_type_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'measurement_types', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            column_name: { type: Sequelize.STRING(50), allowNull: false },
            unit: { type: Sequelize.STRING(20), allowNull: true },
            chart_type: {
                type: Sequelize.ENUM('column', 'spline', 'line', 'area', 'bar', 'pie', 'scatter', 'gauge', 'none'),
                allowNull: true, defaultValue: 'spline'
            },
            axis_name: { type: Sequelize.STRING(50), allowNull: true },
            axis_id: { type: Sequelize.STRING(30), allowNull: true },
            axis_min: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
            axis_function: { type: Sequelize.STRING(20), allowNull: true },
            aggregation_type: {
                type: Sequelize.ENUM('sum', 'avg', 'min', 'max', 'count', 'last', 'first', 'none'),
                allowNull: true, defaultValue: 'none'
            },
            display_order: { type: Sequelize.INTEGER, allowNull: true },
            show_in_billing: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            show_in_analysis: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            is_realtime: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            mqtt_key: { type: Sequelize.STRING(50), allowNull: true, defaultValue: null },
            decimal_places: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 2 },
            icon: { type: Sequelize.STRING(50), allowNull: true, defaultValue: null },
            color: { type: Sequelize.STRING(7), allowNull: true, defaultValue: null },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`
            CREATE INDEX variables_measurement_type_id_idx ON variables (measurement_type_id);
            CREATE INDEX variables_is_realtime_idx ON variables (is_realtime);
            CREATE INDEX variables_is_active_idx ON variables (is_active);
        `);

        // ============================================================
        // 18. VARIABLE_TRANSLATIONS
        // ============================================================
        await queryInterface.createTable('variable_translations', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            variable_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'variables', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            lang: { type: Sequelize.STRING(5), allowNull: false },
            name: { type: Sequelize.STRING(100), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`
            CREATE UNIQUE INDEX variable_translations_variable_lang ON variable_translations (variable_id, lang);
        `);

        // ============================================================
        // 19. DEVICE CATALOG TABLES
        // ============================================================
        // device_types
        await queryInterface.createTable('device_types', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            icon: { type: Sequelize.STRING(100), allowNull: true },
            display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await queryInterface.createTable('device_type_translations', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            device_type_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'device_types', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            lang: { type: Sequelize.STRING(5), allowNull: false },
            name: { type: Sequelize.STRING(100), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true }
        });
        await q.query(`CREATE UNIQUE INDEX device_type_translations_type_lang_idx ON device_type_translations (device_type_id, lang)`);

        // device_brands
        await queryInterface.createTable('device_brands', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            logo_url: { type: Sequelize.STRING(500), allowNull: true },
            website_url: { type: Sequelize.STRING(500), allowNull: true },
            display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await queryInterface.createTable('device_brand_translations', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            device_brand_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'device_brands', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            lang: { type: Sequelize.STRING(5), allowNull: false },
            name: { type: Sequelize.STRING(100), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true }
        });
        await q.query(`CREATE UNIQUE INDEX device_brand_translations_brand_lang_idx ON device_brand_translations (device_brand_id, lang)`);

        // device_models
        await queryInterface.createTable('device_models', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            code: { type: Sequelize.STRING(50), allowNull: false },
            device_brand_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'device_brands', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            specs: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
            display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`CREATE UNIQUE INDEX device_models_brand_code_unique ON device_models (device_brand_id, code)`);
        await queryInterface.createTable('device_model_translations', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            device_model_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'device_models', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            lang: { type: Sequelize.STRING(5), allowNull: false },
            name: { type: Sequelize.STRING(100), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true }
        });
        await q.query(`CREATE UNIQUE INDEX device_model_translations_model_lang_idx ON device_model_translations (device_model_id, lang)`);

        // device_networks
        await queryInterface.createTable('device_networks', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            icon: { type: Sequelize.STRING(100), allowNull: true },
            display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await queryInterface.createTable('device_network_translations', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            device_network_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'device_networks', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            lang: { type: Sequelize.STRING(5), allowNull: false },
            name: { type: Sequelize.STRING(100), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true }
        });
        await q.query(`CREATE UNIQUE INDEX device_network_translations_network_lang_idx ON device_network_translations (device_network_id, lang)`);

        // device_servers
        await queryInterface.createTable('device_servers', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            server_type: { type: Sequelize.STRING(50), allowNull: true },
            host: { type: Sequelize.STRING(255), allowNull: true },
            port: { type: Sequelize.INTEGER, allowNull: true },
            use_ssl: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await queryInterface.createTable('device_server_translations', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            device_server_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'device_servers', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            lang: { type: Sequelize.STRING(5), allowNull: false },
            name: { type: Sequelize.STRING(100), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true }
        });
        await q.query(`CREATE UNIQUE INDEX device_server_translations_server_lang_idx ON device_server_translations (device_server_id, lang)`);

        // device_licenses
        await queryInterface.createTable('device_licenses', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            icon: { type: Sequelize.STRING(100), allowNull: true },
            color: { type: Sequelize.STRING(20), allowNull: true },
            display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await queryInterface.createTable('device_license_translations', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            device_license_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'device_licenses', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            lang: { type: Sequelize.STRING(5), allowNull: false },
            name: { type: Sequelize.STRING(100), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true }
        });
        await q.query(`CREATE UNIQUE INDEX device_license_translations_license_lang_idx ON device_license_translations (device_license_id, lang)`);

        // device_validity_periods
        await queryInterface.createTable('device_validity_periods', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            months: { type: Sequelize.INTEGER, allowNull: true },
            display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await queryInterface.createTable('device_validity_period_translations', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            device_validity_period_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'device_validity_periods', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            lang: { type: Sequelize.STRING(5), allowNull: false },
            name: { type: Sequelize.STRING(100), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true }
        });
        await q.query(`CREATE UNIQUE INDEX device_validity_translations_period_lang_idx ON device_validity_period_translations (device_validity_period_id, lang)`);

        // ============================================================
        // 20. DEVICES
        // ============================================================
        await queryInterface.createTable('devices', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            human_id: { type: Sequelize.INTEGER, allowNull: false, unique: true },
            public_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            uuid: { type: Sequelize.STRING(36), allowNull: true, unique: true },
            organization_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            site_id: {
                type: Sequelize.UUID, allowNull: true,
                references: { model: 'sites', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            device_type_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: 'device_types', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            brand_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: 'device_brands', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            model_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: 'device_models', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            server_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: 'device_servers', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            network_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: 'device_networks', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            license_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: 'device_licenses', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            validity_period_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: 'device_validity_periods', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            name: { type: Sequelize.STRING(200), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true },
            topic: { type: Sequelize.STRING(500), allowNull: true },
            status: { type: 'enum_devices_status', allowNull: false, defaultValue: 'active' },
            firmware_version: { type: Sequelize.STRING(50), allowNull: true },
            serial_number: { type: Sequelize.STRING(100), allowNull: true },
            ip_address: { type: Sequelize.STRING(45), allowNull: true },
            mac_address: { type: Sequelize.STRING(17), allowNull: true },
            location_name: { type: Sequelize.STRING(200), allowNull: true },
            physical_location: { type: Sequelize.STRING(200), allowNull: true },
            electrical_location: { type: Sequelize.STRING(200), allowNull: true },
            latitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
            longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
            city: { type: Sequelize.STRING(100), allowNull: true },
            timezone: { type: Sequelize.STRING(100), allowNull: true },
            installation_date: { type: Sequelize.DATEONLY, allowNull: true },
            warranty_months: { type: Sequelize.INTEGER, allowNull: true },
            expiration_date: { type: Sequelize.DATEONLY, allowNull: true },
            last_seen_at: { type: Sequelize.DATE, allowNull: true },
            metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX devices_organization_id_idx ON devices (organization_id);
            CREATE INDEX devices_site_id_idx ON devices (site_id);
            CREATE INDEX devices_status_idx ON devices (status);
            CREATE UNIQUE INDEX devices_serial_number_idx ON devices (serial_number) WHERE serial_number IS NOT NULL AND deleted_at IS NULL;
            CREATE UNIQUE INDEX devices_org_name_unique ON devices (organization_id, name) WHERE deleted_at IS NULL;
            CREATE UNIQUE INDEX devices_id_organization_id_idx ON devices (id, organization_id);
            CREATE INDEX devices_deleted_at_idx ON devices (deleted_at);
            CREATE UNIQUE INDEX devices_uuid_unique_idx ON devices (uuid) WHERE uuid IS NOT NULL;
            CREATE INDEX devices_device_type_id_idx ON devices (device_type_id);
            CREATE INDEX devices_brand_id_idx ON devices (brand_id);
            CREATE INDEX devices_model_id_idx ON devices (model_id);
            CREATE INDEX devices_server_id_idx ON devices (server_id);
            CREATE INDEX devices_network_id_idx ON devices (network_id);
            CREATE INDEX devices_license_id_idx ON devices (license_id);
            CREATE INDEX devices_validity_period_id_idx ON devices (validity_period_id);
        `);

        // ============================================================
        // 21. CHANNELS
        // ============================================================
        await queryInterface.createTable('channels', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            human_id: { type: Sequelize.INTEGER, allowNull: false, unique: true },
            public_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            device_id: { type: Sequelize.UUID, allowNull: false },
            organization_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            name: { type: Sequelize.STRING(200), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true },
            ch: { type: Sequelize.INTEGER, allowNull: true },
            measurement_type_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: 'measurement_types', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            phase_system: { type: Sequelize.INTEGER, allowNull: true },
            phase: { type: Sequelize.INTEGER, allowNull: true },
            process: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            status: { type: 'channel_status', allowNull: false, defaultValue: 'active' },
            last_sync_at: { type: Sequelize.DATE, allowNull: true },
            metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX channels_device_id_idx ON channels (device_id);
            CREATE INDEX channels_organization_id_idx ON channels (organization_id);
            CREATE INDEX channels_status_idx ON channels (status);
            CREATE INDEX channels_measurement_type_id_idx ON channels (measurement_type_id);
            CREATE UNIQUE INDEX channels_device_name_unique ON channels (device_id, name) WHERE deleted_at IS NULL;
            ALTER TABLE channels
                ADD CONSTRAINT channels_device_org_fk
                FOREIGN KEY (device_id, organization_id)
                REFERENCES devices(id, organization_id)
                ON UPDATE CASCADE ON DELETE RESTRICT;
        `);

        // ============================================================
        // 22. CHANNEL_VARIABLES
        // ============================================================
        await queryInterface.createTable('channel_variables', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            channel_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'channels', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            variable_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'variables', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            display_order: { type: Sequelize.INTEGER, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`
            CREATE UNIQUE INDEX channel_variables_channel_variable_unique ON channel_variables (channel_id, variable_id);
            CREATE INDEX channel_variables_channel_id_idx ON channel_variables (channel_id);
            CREATE INDEX channel_variables_variable_id_idx ON channel_variables (variable_id);
            CREATE INDEX channel_variables_is_active_idx ON channel_variables (is_active);
        `);

        // ============================================================
        // 23. RESOURCE_HIERARCHY (with ltree path as real ltree type)
        // ============================================================
        await q.query(`
            CREATE TABLE resource_hierarchy (
                id UUID PRIMARY KEY,
                human_id SERIAL UNIQUE,
                public_code VARCHAR(50) NOT NULL UNIQUE,
                organization_id UUID NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                parent_id UUID REFERENCES resource_hierarchy(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                node_type resource_node_type NOT NULL,
                reference_id VARCHAR(100),
                name VARCHAR(200) NOT NULL,
                description TEXT,
                icon VARCHAR(50),
                display_order INTEGER DEFAULT 0,
                asset_category_id INTEGER REFERENCES asset_categories(id) ON UPDATE CASCADE ON DELETE SET NULL,
                path ltree,
                depth INTEGER NOT NULL DEFAULT 0,
                metadata JSONB DEFAULT '{}',
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMPTZ
            );

            CREATE INDEX resource_hierarchy_path_gist_idx ON resource_hierarchy USING GIST (path);
            CREATE INDEX resource_hierarchy_org_path_idx ON resource_hierarchy (organization_id, path);
            CREATE INDEX resource_hierarchy_parent_id_idx ON resource_hierarchy (parent_id);
            CREATE INDEX resource_hierarchy_organization_id_idx ON resource_hierarchy (organization_id);
            CREATE INDEX resource_hierarchy_node_type_idx ON resource_hierarchy (node_type);
            CREATE INDEX resource_hierarchy_reference_id_idx ON resource_hierarchy (reference_id) WHERE reference_id IS NOT NULL;
            CREATE INDEX resource_hierarchy_org_name_idx ON resource_hierarchy (organization_id, name);
            CREATE INDEX resource_hierarchy_is_active_idx ON resource_hierarchy (is_active);
            CREATE INDEX resource_hierarchy_parent_order_idx ON resource_hierarchy (parent_id, display_order);
            CREATE UNIQUE INDEX resource_hierarchy_unique_name_per_parent_idx ON resource_hierarchy (organization_id, parent_id, name) WHERE deleted_at IS NULL;
            CREATE INDEX resource_hierarchy_children_count_idx ON resource_hierarchy (parent_id) WHERE is_active = true AND deleted_at IS NULL;
            CREATE INDEX resource_hierarchy_org_root_order_idx ON resource_hierarchy (organization_id, display_order) WHERE parent_id IS NULL AND is_active = true AND deleted_at IS NULL;
            CREATE INDEX resource_hierarchy_active_not_deleted_idx ON resource_hierarchy (organization_id, parent_id) WHERE is_active = true AND deleted_at IS NULL;
            CREATE INDEX resource_hierarchy_node_type_category_idx ON resource_hierarchy (node_type, asset_category_id);
            CREATE INDEX resource_hierarchy_asset_category_idx ON resource_hierarchy (asset_category_id);
        `);

        // Función generate_resource_path
        await q.query(`
            CREATE OR REPLACE FUNCTION generate_resource_path(node_id UUID)
            RETURNS ltree AS $$
            DECLARE
                result ltree;
                current_id UUID;
                current_path TEXT;
                node_label TEXT;
            BEGIN
                current_path := '';
                current_id := node_id;
                WHILE current_id IS NOT NULL LOOP
                    node_label := 'n' || replace(current_id::text, '-', '');
                    current_path := node_label ||
                                    CASE WHEN current_path = '' THEN '' ELSE '.' || current_path END;
                    SELECT parent_id INTO current_id
                    FROM resource_hierarchy
                    WHERE id = current_id;
                END LOOP;
                RETURN current_path::ltree;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Función trigger y trigger
        await q.query(`
            CREATE OR REPLACE FUNCTION update_resource_hierarchy_path()
            RETURNS TRIGGER AS $$
            DECLARE
                old_path ltree;
                new_path ltree;
            BEGIN
                NEW.path := generate_resource_path(NEW.id);
                IF NEW.parent_id IS NULL THEN
                    NEW.depth := 0;
                ELSE
                    SELECT depth + 1 INTO NEW.depth
                    FROM resource_hierarchy
                    WHERE id = NEW.parent_id;
                END IF;
                IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
                    old_path := OLD.path;
                    new_path := NEW.path;
                    UPDATE resource_hierarchy
                    SET path = new_path || subpath(path, nlevel(old_path)),
                        depth = nlevel(new_path || subpath(path, nlevel(old_path))) - 1
                    WHERE path <@ old_path AND id != NEW.id;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER resource_hierarchy_path_trigger
            BEFORE INSERT OR UPDATE ON resource_hierarchy
            FOR EACH ROW
            EXECUTE FUNCTION update_resource_hierarchy_path();
        `);

        // ============================================================
        // 24. USER_RESOURCE_ACCESS
        // ============================================================
        await queryInterface.createTable('user_resource_access', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            user_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            resource_node_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'resource_hierarchy', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            organization_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            access_type: {
                type: Sequelize.ENUM('view', 'edit', 'admin'),
                allowNull: false, defaultValue: 'view'
            },
            include_descendants: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            granted_by: {
                type: Sequelize.UUID, allowNull: true,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            granted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            expires_at: { type: Sequelize.DATE, allowNull: true },
            notes: { type: Sequelize.TEXT, allowNull: true },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE UNIQUE INDEX user_resource_access_user_node_unique ON user_resource_access (user_id, resource_node_id);
            CREATE INDEX user_resource_access_user_id_idx ON user_resource_access (user_id);
            CREATE INDEX user_resource_access_resource_node_id_idx ON user_resource_access (resource_node_id);
            CREATE INDEX user_resource_access_organization_id_idx ON user_resource_access (organization_id);
        `);

        // ============================================================
        // 25. ORGANIZATION_RESOURCE_COUNTERS
        // ============================================================
        await queryInterface.createTable('organization_resource_counters', {
            organization_id: {
                type: Sequelize.UUID, primaryKey: true, allowNull: false,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            last_value: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        // Unique index for resource_hierarchy org+reference
        await q.query(`
            CREATE UNIQUE INDEX resource_hierarchy_org_reference_unique_idx
            ON resource_hierarchy (organization_id, reference_id)
            WHERE reference_id IS NOT NULL AND deleted_at IS NULL;
        `);

        // ============================================================
        // 26. FILE_UPLOADS
        // ============================================================
        await queryInterface.createTable('file_uploads', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            human_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, autoIncrement: true },
            public_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            organization_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            blob_path: { type: Sequelize.STRING(500), allowNull: false },
            blob_url: { type: Sequelize.STRING(1000), allowNull: true },
            original_name: { type: Sequelize.STRING(255), allowNull: false },
            file_name: { type: Sequelize.STRING(255), allowNull: false },
            mime_type: { type: Sequelize.STRING(100), allowNull: false },
            extension: { type: Sequelize.STRING(20), allowNull: false },
            size_bytes: { type: Sequelize.BIGINT, allowNull: false },
            checksum_sha256: { type: Sequelize.STRING(64), allowNull: true },
            category: { type: 'enum_file_uploads_category', allowNull: false, defaultValue: 'other' },
            owner_type: { type: Sequelize.STRING(50), allowNull: true },
            owner_id: { type: Sequelize.STRING(100), allowNull: true },
            status: { type: 'enum_file_uploads_status', allowNull: false, defaultValue: 'pending' },
            uploaded_by: {
                type: Sequelize.UUID, allowNull: true,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            uploaded_at: { type: Sequelize.DATE, allowNull: true },
            expires_at: { type: Sequelize.DATE, allowNull: true },
            metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
            is_public: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX file_uploads_organization_id_idx ON file_uploads (organization_id);
            CREATE INDEX file_uploads_owner_type_owner_id_idx ON file_uploads (owner_type, owner_id);
            CREATE INDEX file_uploads_status_idx ON file_uploads (status);
            CREATE INDEX file_uploads_category_idx ON file_uploads (category);
            CREATE INDEX file_uploads_uploaded_by_idx ON file_uploads (uploaded_by);
            CREATE INDEX file_uploads_mime_type_idx ON file_uploads (mime_type);
            CREATE INDEX file_uploads_expires_at_idx ON file_uploads (expires_at);
            CREATE INDEX file_uploads_checksum_sha256_idx ON file_uploads (checksum_sha256);
        `);

        // ============================================================
        // 27. AUDIT_LOGS
        // ============================================================
        await queryInterface.createTable('audit_logs', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            entity_type: { type: Sequelize.STRING(50), allowNull: false },
            entity_id: { type: Sequelize.STRING(100), allowNull: false },
            action: { type: Sequelize.STRING(50), allowNull: false },
            performed_by: {
                type: Sequelize.UUID, allowNull: true,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            performed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            ip_address: { type: Sequelize.INET, allowNull: true },
            user_agent: { type: Sequelize.TEXT, allowNull: true },
            changes: { type: Sequelize.JSONB, allowNull: true },
            metadata: { type: Sequelize.JSONB, allowNull: true },
            correlation_id: { type: Sequelize.STRING(100), allowNull: true },
            impersonated_org_id: {
                type: Sequelize.UUID, allowNull: true,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            }
        });
        await q.query(`
            CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
            CREATE INDEX idx_audit_user ON audit_logs (performed_by, performed_at DESC);
            CREATE INDEX idx_audit_date ON audit_logs (performed_at DESC);
            CREATE INDEX idx_audit_action ON audit_logs (entity_type, action);
            CREATE INDEX idx_audit_correlation_id ON audit_logs (correlation_id);
            CREATE INDEX idx_audit_logs_impersonated_org_id ON audit_logs (impersonated_org_id) WHERE impersonated_org_id IS NOT NULL;
        `);

        // ============================================================
        // 28. ERROR_LOGS
        // ============================================================
        await queryInterface.createTable('error_logs', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            source: {
                type: Sequelize.ENUM('frontend', 'backend'), allowNull: false
            },
            level: {
                type: Sequelize.ENUM('error', 'warning', 'critical'),
                allowNull: false, defaultValue: 'error'
            },
            error_code: { type: Sequelize.STRING(100), allowNull: false },
            error_message: { type: Sequelize.TEXT, allowNull: false },
            stack_trace: { type: Sequelize.TEXT, allowNull: true },
            endpoint: { type: Sequelize.STRING(500), allowNull: true },
            method: { type: Sequelize.STRING(10), allowNull: true },
            status_code: { type: Sequelize.INTEGER, allowNull: true },
            user_id: {
                type: Sequelize.UUID, allowNull: true,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            organization_id: {
                type: Sequelize.UUID, allowNull: true,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            session_id: { type: Sequelize.STRING(100), allowNull: true },
            ip_address: { type: Sequelize.INET, allowNull: true },
            user_agent: { type: Sequelize.TEXT, allowNull: true },
            request_id: { type: Sequelize.STRING(100), allowNull: true },
            correlation_id: { type: Sequelize.STRING(100), allowNull: true },
            context: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
            metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await q.query(`
            CREATE INDEX error_logs_source_idx ON error_logs (source);
            CREATE INDEX error_logs_level_idx ON error_logs (level);
            CREATE INDEX error_logs_error_code_idx ON error_logs (error_code);
            CREATE INDEX error_logs_user_id_idx ON error_logs (user_id);
            CREATE INDEX error_logs_organization_id_idx ON error_logs (organization_id);
            CREATE INDEX error_logs_created_at_idx ON error_logs (created_at DESC);
            CREATE INDEX error_logs_status_code_idx ON error_logs (status_code);
            CREATE INDEX error_logs_endpoint_idx ON error_logs (endpoint);
            CREATE INDEX error_logs_correlation_id_idx ON error_logs (correlation_id);
        `);

        // ============================================================
        // 29. DASHBOARDS MODULE
        // ============================================================
        await queryInterface.createTable('dashboards', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            public_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            organization_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            owner_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            name: { type: Sequelize.STRING(200), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true },
            icon: { type: Sequelize.STRING(50), allowNull: true },
            size: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'FREE' },
            positioning: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'AUTO' },
            custom_width: { type: Sequelize.INTEGER, allowNull: true },
            custom_height: { type: Sequelize.INTEGER, allowNull: true },
            is_home: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            is_public: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            settings: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
            template_id: { type: Sequelize.UUID, allowNull: true },
            page_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            widget_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX dashboards_organization_id_idx ON dashboards (organization_id);
            CREATE INDEX dashboards_owner_id_idx ON dashboards (owner_id);
            CREATE INDEX dashboards_is_public_idx ON dashboards (is_public);
            CREATE INDEX dashboards_is_active_idx ON dashboards (is_active);
            CREATE INDEX dashboards_size_idx ON dashboards (size);
            CREATE UNIQUE INDEX dashboards_owner_org_is_home_idx ON dashboards (owner_id, organization_id, is_home) WHERE is_home = true AND deleted_at IS NULL;
        `);

        await queryInterface.createTable('dashboard_pages', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            dashboard_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'dashboards', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            name: { type: Sequelize.STRING(200), allowNull: true },
            order_index: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            order_number: { type: Sequelize.INTEGER, allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX dashboard_pages_dashboard_id_idx ON dashboard_pages (dashboard_id);
            CREATE UNIQUE INDEX dashboard_pages_dashboard_order_number_uk ON dashboard_pages (dashboard_id, order_number) WHERE deleted_at IS NULL;
        `);

        await queryInterface.createTable('dashboard_groups', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            public_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            organization_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            owner_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            name: { type: Sequelize.STRING(200), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX dashboard_groups_organization_id_idx ON dashboard_groups (organization_id);
            CREATE INDEX dashboard_groups_owner_id_idx ON dashboard_groups (owner_id);
            CREATE INDEX dashboard_groups_is_active_idx ON dashboard_groups (is_active);
        `);

        await queryInterface.createTable('widgets', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            dashboard_page_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'dashboard_pages', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            type: { type: Sequelize.STRING(50), allowNull: false },
            title: { type: Sequelize.STRING(200), allowNull: true },
            layout: { type: Sequelize.JSONB, allowNull: false, defaultValue: { x: 0, y: 0, w: 4, h: 2 } },
            style_config: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
            data_config: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
            order_index: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            order_number: { type: Sequelize.INTEGER, allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX widgets_dashboard_page_id_idx ON widgets (dashboard_page_id);
            CREATE INDEX widgets_type_idx ON widgets (type);
        `);

        await queryInterface.createTable('widget_data_sources', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            widget_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'widgets', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            entity_type: { type: Sequelize.STRING(30), allowNull: false },
            entity_id: { type: Sequelize.STRING(100), allowNull: false },
            label: { type: Sequelize.STRING(200), allowNull: true },
            series_config: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
            order_index: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            order_number: { type: Sequelize.INTEGER, allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
        });
        await q.query(`
            CREATE INDEX widget_data_sources_widget_id_idx ON widget_data_sources (widget_id);
            CREATE INDEX widget_data_sources_entity_idx ON widget_data_sources (entity_type, entity_id);
        `);

        await queryInterface.createTable('dashboard_group_items', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            dashboard_group_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'dashboard_groups', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            dashboard_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'dashboards', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            order_index: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
        });
        await q.query(`
            CREATE INDEX dashboard_group_items_group_id_idx ON dashboard_group_items (dashboard_group_id);
            CREATE INDEX dashboard_group_items_dashboard_id_idx ON dashboard_group_items (dashboard_id);
            CREATE UNIQUE INDEX dashboard_group_items_unique_pair ON dashboard_group_items (dashboard_group_id, dashboard_id);
        `);

        await queryInterface.createTable('dashboard_collaborators', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            dashboard_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'dashboards', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            user_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            role: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'viewer' },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX dashboard_collaborators_dashboard_id_idx ON dashboard_collaborators (dashboard_id);
            CREATE INDEX dashboard_collaborators_user_id_idx ON dashboard_collaborators (user_id);
            CREATE UNIQUE INDEX dashboard_collaborators_unique_pair ON dashboard_collaborators (dashboard_id, user_id);
        `);

        await queryInterface.createTable('dashboard_group_collaborators', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            dashboard_group_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'dashboard_groups', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            user_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            role: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'viewer' },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE INDEX dg_collaborators_group_id_idx ON dashboard_group_collaborators (dashboard_group_id);
            CREATE INDEX dg_collaborators_user_id_idx ON dashboard_group_collaborators (user_id);
            CREATE UNIQUE INDEX dg_collaborators_unique_pair ON dashboard_group_collaborators (dashboard_group_id, user_id);
        `);

        // ============================================================
        // 30. UNIT_SCALES
        // ============================================================
        await queryInterface.createTable('unit_scales', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            base_unit: { type: Sequelize.STRING(50), allowNull: false },
            symbol: { type: Sequelize.STRING(50), allowNull: false },
            label: { type: Sequelize.STRING(100), allowNull: false },
            factor: { type: Sequelize.DECIMAL(20, 10), allowNull: false, defaultValue: 1 },
            min_value: { type: Sequelize.DECIMAL(20, 10), allowNull: false, defaultValue: 0 },
            display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });
        await q.query(`
            CREATE UNIQUE INDEX unit_scales_base_unit_symbol_idx ON unit_scales (base_unit, symbol);
            CREATE INDEX unit_scales_base_unit_idx ON unit_scales (base_unit);
        `);

        // ============================================================
        // 31. SCHEDULES TABLES
        // ============================================================
        await queryInterface.createTable('schedules', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            public_code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
            organization_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'organizations', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            name: { type: Sequelize.STRING(200), allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true },
            validities_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            deleted_at: { type: Sequelize.DATE, allowNull: true }
        });
        await q.query(`
            CREATE UNIQUE INDEX schedules_public_code_idx ON schedules (public_code);
            CREATE INDEX schedules_organization_id_idx ON schedules (organization_id);
        `);

        await queryInterface.createTable('schedule_validities', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            schedule_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'schedules', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            valid_from: { type: Sequelize.DATEONLY, allowNull: true },
            valid_to: { type: Sequelize.DATEONLY, allowNull: true },
            ranges_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            week_coverage_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
            exceptions_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });
        await q.query(`CREATE INDEX schedule_validities_schedule_id_idx ON schedule_validities (schedule_id)`);

        await queryInterface.createTable('schedule_time_profiles', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            validity_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'schedule_validities', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            name: { type: Sequelize.STRING(200), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });
        await q.query(`CREATE INDEX schedule_time_profiles_validity_id_idx ON schedule_time_profiles (validity_id)`);

        await queryInterface.createTable('schedule_time_ranges', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            time_profile_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'schedule_time_profiles', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            day_of_week: { type: Sequelize.INTEGER, allowNull: false },
            start_time: { type: Sequelize.STRING(5), allowNull: false },
            end_time: { type: Sequelize.STRING(5), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });
        await q.query(`
            CREATE INDEX schedule_time_ranges_profile_id_idx ON schedule_time_ranges (time_profile_id);
            CREATE INDEX schedule_time_ranges_day_idx ON schedule_time_ranges (day_of_week);
        `);

        await q.query(`
            CREATE TABLE schedule_exceptions (
                id SERIAL PRIMARY KEY,
                validity_id INTEGER NOT NULL REFERENCES schedule_validities(id) ON UPDATE CASCADE ON DELETE CASCADE,
                name VARCHAR(200) NOT NULL,
                type enum_schedule_exceptions_type NOT NULL DEFAULT 'closed',
                date DATE NOT NULL,
                repeat_yearly BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX schedule_exceptions_date_idx ON schedule_exceptions (date);
            CREATE INDEX schedule_exceptions_validity_id_idx ON schedule_exceptions (validity_id);
        `);

        console.log('✅ Migración baseline completada exitosamente');
    },

    async down(queryInterface) {
        const q = queryInterface.sequelize;

        // Eliminar en orden inverso respetando FK
        await q.query(`DROP TABLE IF EXISTS schedule_exceptions CASCADE`);
        await queryInterface.dropTable('schedule_time_ranges');
        await queryInterface.dropTable('schedule_time_profiles');
        await queryInterface.dropTable('schedule_validities');
        await queryInterface.dropTable('schedules');
        await queryInterface.dropTable('unit_scales');
        await queryInterface.dropTable('dashboard_group_collaborators');
        await queryInterface.dropTable('dashboard_collaborators');
        await queryInterface.dropTable('dashboard_group_items');
        await queryInterface.dropTable('dashboard_groups');
        await queryInterface.dropTable('widget_data_sources');
        await queryInterface.dropTable('widgets');
        await queryInterface.dropTable('dashboard_pages');
        await queryInterface.dropTable('dashboards');
        await queryInterface.dropTable('error_logs');
        await queryInterface.dropTable('audit_logs');
        await queryInterface.dropTable('file_uploads');
        await queryInterface.dropTable('organization_resource_counters');
        await queryInterface.dropTable('user_resource_access');
        await q.query(`
            DROP TRIGGER IF EXISTS resource_hierarchy_path_trigger ON resource_hierarchy;
            DROP FUNCTION IF EXISTS update_resource_hierarchy_path();
            DROP FUNCTION IF EXISTS generate_resource_path(UUID);
        `);
        await queryInterface.dropTable('resource_hierarchy');
        await queryInterface.dropTable('channel_variables');
        await queryInterface.dropTable('channels');
        await queryInterface.dropTable('devices');
        await queryInterface.dropTable('device_validity_period_translations');
        await queryInterface.dropTable('device_validity_periods');
        await queryInterface.dropTable('device_license_translations');
        await queryInterface.dropTable('device_licenses');
        await queryInterface.dropTable('device_server_translations');
        await queryInterface.dropTable('device_servers');
        await queryInterface.dropTable('device_network_translations');
        await queryInterface.dropTable('device_networks');
        await queryInterface.dropTable('device_model_translations');
        await queryInterface.dropTable('device_models');
        await queryInterface.dropTable('device_brand_translations');
        await queryInterface.dropTable('device_brands');
        await queryInterface.dropTable('device_type_translations');
        await queryInterface.dropTable('device_types');
        await queryInterface.dropTable('variable_translations');
        await queryInterface.dropTable('variables');
        await queryInterface.dropTable('measurement_type_translations');
        await queryInterface.dropTable('measurement_types');
        await queryInterface.dropTable('asset_categories');
        await queryInterface.dropTable('sites');
        await queryInterface.dropTable('organization_countries');
        await queryInterface.dropTable('state_translations');
        await queryInterface.dropTable('states');
        await queryInterface.dropTable('country_translations');
        await queryInterface.dropTable('countries');
        await queryInterface.dropTable('user_organizations');
        await queryInterface.dropTable('refresh_tokens');
        await queryInterface.dropTable('users');
        await queryInterface.dropTable('organizations');
        await queryInterface.dropTable('roles');

        // Eliminar ENUMs
        await q.query(`
            DROP TYPE IF EXISTS enum_schedule_exceptions_type;
            DROP TYPE IF EXISTS enum_states_type;
            DROP TYPE IF EXISTS asset_category_scope;
            DROP TYPE IF EXISTS enum_file_uploads_category;
            DROP TYPE IF EXISTS enum_file_uploads_status;
            DROP TYPE IF EXISTS channel_status;
            DROP TYPE IF EXISTS enum_devices_status;
            DROP TYPE IF EXISTS enum_sites_building_type;
            DROP TYPE IF EXISTS resource_node_type;
        `);

        console.log('✅ Migración baseline revertida');
    }
};
