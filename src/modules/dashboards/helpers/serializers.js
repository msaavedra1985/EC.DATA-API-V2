// modules/dashboards/helpers/serializers.js
// Serializadores para convertir modelos internos de dashboards a DTOs públicos

/**
 * Convertir modelo WidgetDataSource a DTO público
 * Entidad hija: expone UUID directamente (se accede a través del contexto padre)
 * 
 * @param {WidgetDataSource} dataSource - Modelo Sequelize WidgetDataSource
 * @returns {Object|null} - DTO público para respuestas API
 */
export const toPublicDataSourceDto = (dataSource) => {
    if (!dataSource) return null;

    return {
        id: dataSource.id,
        entity_type: dataSource.entity_type,
        entity_id: dataSource.entity_id,
        label: dataSource.label,
        series_config: dataSource.series_config,
        order_index: dataSource.order_index,
        created_at: dataSource.created_at
    };
};

/**
 * Convertir modelo Widget a DTO público
 * Entidad hija: expone UUID directamente (se accede a través del contexto padre)
 * 
 * @param {Widget} widget - Modelo Sequelize Widget
 * @returns {Object|null} - DTO público para respuestas API
 */
export const toPublicWidgetDto = (widget) => {
    if (!widget) return null;

    const dto = {
        id: widget.id,
        type: widget.type,
        title: widget.title,
        layout: widget.layout,
        style_config: widget.style_config,
        data_config: widget.data_config,
        order_index: widget.order_index,
        created_at: widget.created_at,
        updated_at: widget.updated_at
    };

    // --- Relaciones hijas ---
    if (widget.dataSources) {
        dto.data_sources = widget.dataSources.map(toPublicDataSourceDto);
    }

    return dto;
};

/**
 * Convertir modelo DashboardPage a DTO público
 * Entidad hija: expone UUID directamente (se accede a través del contexto padre)
 * No se expone dashboard_id (implícito por contexto)
 * 
 * @param {DashboardPage} page - Modelo Sequelize DashboardPage
 * @returns {Object|null} - DTO público para respuestas API
 */
export const toPublicPageDto = (page) => {
    if (!page) return null;

    const dto = {
        id: page.id,
        name: page.name,
        order_index: page.order_index,
        created_at: page.created_at,
        updated_at: page.updated_at
    };

    // --- Relaciones hijas ---
    if (page.widgets) {
        dto.widgets = page.widgets.map(toPublicWidgetDto);
    }

    return dto;
};

/**
 * Convertir modelo DashboardCollaborator a DTO público
 * Entidad hija: expone UUID directamente (se accede a través del contexto padre)
 * 
 * @param {DashboardCollaborator} collaborator - Modelo Sequelize DashboardCollaborator
 * @returns {Object|null} - DTO público para respuestas API
 */
export const toPublicCollaboratorDto = (collaborator) => {
    if (!collaborator) return null;

    const dto = {
        id: collaborator.id,
        role: collaborator.role,
        created_at: collaborator.created_at
    };

    // --- Usuario asociado ---
    if (collaborator.user) {
        dto.user = {
            id: collaborator.user.public_code,
            email: collaborator.user.email,
            first_name: collaborator.user.first_name,
            last_name: collaborator.user.last_name
        };
    }

    return dto;
};

/**
 * Convertir modelo DashboardGroupCollaborator a DTO público
 * Misma estructura que colaboradores de dashboard
 * 
 * @param {DashboardGroupCollaborator} collaborator - Modelo Sequelize DashboardGroupCollaborator
 * @returns {Object|null} - DTO público para respuestas API
 */
export const toPublicGroupCollaboratorDto = (collaborator) => {
    if (!collaborator) return null;

    const dto = {
        id: collaborator.id,
        role: collaborator.role,
        created_at: collaborator.created_at
    };

    // --- Usuario asociado ---
    if (collaborator.user) {
        dto.user = {
            id: collaborator.user.public_code,
            email: collaborator.user.email,
            first_name: collaborator.user.first_name,
            last_name: collaborator.user.last_name
        };
    }

    return dto;
};

/**
 * Convertir modelo Dashboard a DTO público
 * Expone public_code como 'id', oculta UUID interno
 * 
 * POLÍTICA DE SEGURIDAD:
 * - Nunca exponer el UUID interno en APIs públicas
 * - Siempre usar public_code como 'id' en respuestas
 * - UUIDs solo para operaciones internas de base de datos
 * 
 * @param {Dashboard} dashboard - Modelo Sequelize Dashboard
 * @returns {Object|null} - DTO público para respuestas API
 */
export const toPublicDashboardDto = (dashboard) => {
    if (!dashboard) return null;

    const dto = {
        id: dashboard.public_code,
        name: dashboard.name,
        description: dashboard.description,
        icon: dashboard.icon,
        size: dashboard.size,
        positioning: dashboard.positioning,
        custom_width: dashboard.custom_width,
        custom_height: dashboard.custom_height,
        is_home: dashboard.is_home,
        is_public: dashboard.is_public,
        is_active: dashboard.is_active,
        settings: dashboard.settings || {},
        created_at: dashboard.created_at,
        updated_at: dashboard.updated_at
    };

    // --- Relaciones principales ---
    if (dashboard.owner) {
        dto.owner = {
            id: dashboard.owner.public_code,
            email: dashboard.owner.email,
            first_name: dashboard.owner.first_name,
            last_name: dashboard.owner.last_name
        };
    }

    if (dashboard.organization) {
        dto.organization = {
            id: dashboard.organization.public_code,
            slug: dashboard.organization.slug,
            name: dashboard.organization.name,
            logo_url: dashboard.organization.logo_url
        };
    }

    // --- Relaciones hijas ---
    if (dashboard.pages) {
        dto.pages = dashboard.pages.map(toPublicPageDto);
    }

    if (dashboard.collaborators) {
        dto.collaborators = dashboard.collaborators.map(toPublicCollaboratorDto);
    }

    return dto;
};

/**
 * Convertir array de dashboards a DTOs públicos
 * 
 * @param {Dashboard[]} dashboards - Array de modelos Sequelize Dashboard
 * @returns {Object[]} - Array de DTOs públicos
 */
export const toPublicDashboardDtoList = (dashboards) => {
    if (!Array.isArray(dashboards)) return [];
    return dashboards.map(toPublicDashboardDto);
};

/**
 * Convertir modelo DashboardGroup a DTO público
 * Expone public_code como 'id', oculta UUID interno
 * 
 * POLÍTICA DE SEGURIDAD:
 * - Nunca exponer el UUID interno en APIs públicas
 * - Siempre usar public_code como 'id' en respuestas
 * - UUIDs solo para operaciones internas de base de datos
 * 
 * @param {DashboardGroup} group - Modelo Sequelize DashboardGroup
 * @returns {Object|null} - DTO público para respuestas API
 */
export const toPublicGroupDto = (group) => {
    if (!group) return null;

    const dto = {
        id: group.public_code,
        name: group.name,
        description: group.description,
        is_active: group.is_active,
        created_at: group.created_at,
        updated_at: group.updated_at
    };

    // --- Relaciones principales ---
    if (group.owner) {
        dto.owner = {
            id: group.owner.public_code,
            email: group.owner.email,
            first_name: group.owner.first_name,
            last_name: group.owner.last_name
        };
    }

    if (group.organization) {
        dto.organization = {
            id: group.organization.public_code,
            slug: group.organization.slug,
            name: group.organization.name
        };
    }

    // --- Dashboards del grupo (a través de DashboardGroupItem) ---
    if (group.dashboards) {
        dto.dashboards = group.dashboards.map((dashboard) => {
            const item = {
                id: dashboard.public_code,
                name: dashboard.name,
                description: dashboard.description
            };

            // order_index viene de la tabla intermedia DashboardGroupItem
            if (dashboard.DashboardGroupItem) {
                item.order_index = dashboard.DashboardGroupItem.order_index;
            }

            return item;
        });
    }

    // --- Colaboradores del grupo ---
    if (group.collaborators) {
        dto.collaborators = group.collaborators.map(toPublicGroupCollaboratorDto);
    }

    return dto;
};

/**
 * Convertir array de grupos de dashboards a DTOs públicos
 * 
 * @param {DashboardGroup[]} groups - Array de modelos Sequelize DashboardGroup
 * @returns {Object[]} - Array de DTOs públicos
 */
export const toPublicGroupDtoList = (groups) => {
    if (!Array.isArray(groups)) return [];
    return groups.map(toPublicGroupDto);
};
