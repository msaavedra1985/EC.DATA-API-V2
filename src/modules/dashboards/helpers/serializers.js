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
        entityType: dataSource.entityType,
        entityId: dataSource.entityId,
        label: dataSource.label,
        seriesConfig: dataSource.seriesConfig,
        orderIndex: dataSource.orderIndex,
        createdAt: dataSource.createdAt
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
        styleConfig: widget.styleConfig,
        dataConfig: widget.dataConfig,
        orderIndex: widget.orderIndex,
        createdAt: widget.createdAt,
        updatedAt: widget.updatedAt
    };

    // --- Relaciones hijas ---
    if (widget.dataSources) {
        dto.dataSources = widget.dataSources.map(toPublicDataSourceDto);
    }

    return dto;
};

/**
 * Convertir modelo DashboardPage a DTO público
 * Entidad hija: expone UUID directamente (se accede a través del contexto padre)
 * No se expone dashboardId (implícito por contexto)
 * 
 * @param {DashboardPage} page - Modelo Sequelize DashboardPage
 * @returns {Object|null} - DTO público para respuestas API
 */
export const toPublicPageDto = (page) => {
    if (!page) return null;

    const dto = {
        id: page.id,
        name: page.name,
        orderIndex: page.orderIndex,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt
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
        createdAt: collaborator.createdAt
    };

    // --- Usuario asociado ---
    if (collaborator.user) {
        dto.user = {
            id: collaborator.user.publicCode,
            email: collaborator.user.email,
            firstName: collaborator.user.firstName,
            lastName: collaborator.user.lastName
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
        createdAt: collaborator.createdAt
    };

    // --- Usuario asociado ---
    if (collaborator.user) {
        dto.user = {
            id: collaborator.user.publicCode,
            email: collaborator.user.email,
            firstName: collaborator.user.firstName,
            lastName: collaborator.user.lastName
        };
    }

    return dto;
};

/**
 * Convertir modelo Dashboard a DTO público
 * Expone publicCode como 'id', oculta UUID interno
 * 
 * POLÍTICA DE SEGURIDAD:
 * - Nunca exponer el UUID interno en APIs públicas
 * - Siempre usar publicCode como 'id' en respuestas
 * - UUIDs solo para operaciones internas de base de datos
 * 
 * @param {Dashboard} dashboard - Modelo Sequelize Dashboard
 * @returns {Object|null} - DTO público para respuestas API
 */
export const toPublicDashboardDto = (dashboard) => {
    if (!dashboard) return null;

    const dto = {
        id: dashboard.publicCode,
        name: dashboard.name,
        description: dashboard.description,
        icon: dashboard.icon,
        size: dashboard.size,
        positioning: dashboard.positioning,
        customWidth: dashboard.customWidth,
        customHeight: dashboard.customHeight,
        isHome: dashboard.isHome,
        isPublic: dashboard.isPublic,
        isActive: dashboard.isActive,
        settings: dashboard.settings || {},
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt
    };

    // --- Relaciones principales ---
    if (dashboard.owner) {
        dto.owner = {
            id: dashboard.owner.publicCode,
            email: dashboard.owner.email,
            firstName: dashboard.owner.firstName,
            lastName: dashboard.owner.lastName
        };
    }

    if (dashboard.organization) {
        dto.organization = {
            id: dashboard.organization.publicCode,
            slug: dashboard.organization.slug,
            name: dashboard.organization.name,
            logoUrl: dashboard.organization.logoUrl
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
 * Expone publicCode como 'id', oculta UUID interno
 * 
 * POLÍTICA DE SEGURIDAD:
 * - Nunca exponer el UUID interno en APIs públicas
 * - Siempre usar publicCode como 'id' en respuestas
 * - UUIDs solo para operaciones internas de base de datos
 * 
 * @param {DashboardGroup} group - Modelo Sequelize DashboardGroup
 * @returns {Object|null} - DTO público para respuestas API
 */
export const toPublicGroupDto = (group) => {
    if (!group) return null;

    const dto = {
        id: group.publicCode,
        name: group.name,
        description: group.description,
        isActive: group.isActive,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
    };

    // --- Relaciones principales ---
    if (group.owner) {
        dto.owner = {
            id: group.owner.publicCode,
            email: group.owner.email,
            firstName: group.owner.firstName,
            lastName: group.owner.lastName
        };
    }

    if (group.organization) {
        dto.organization = {
            id: group.organization.publicCode,
            slug: group.organization.slug,
            name: group.organization.name
        };
    }

    // --- Dashboards del grupo (a través de DashboardGroupItem) ---
    if (group.dashboards) {
        dto.dashboards = group.dashboards.map((dashboard) => {
            const item = {
                id: dashboard.publicCode,
                name: dashboard.name,
                description: dashboard.description
            };

            // orderIndex viene de la tabla intermedia DashboardGroupItem
            if (dashboard.DashboardGroupItem) {
                item.orderIndex = dashboard.DashboardGroupItem.orderIndex;
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
