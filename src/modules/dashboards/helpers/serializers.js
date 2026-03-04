// modules/dashboards/helpers/serializers.js
// Serializadores para convertir modelos internos de dashboards a DTOs públicos

/**
 * Convertir modelo WidgetDataSource a DTO público
 * Usa orderNumber como ID público (no expone UUID)
 */
export const toPublicDataSourceDto = (dataSource) => {
    if (!dataSource) return null;

    return {
        id: dataSource.orderNumber,
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
 * Usa orderNumber como ID público (no expone UUID)
 */
export const toPublicWidgetDto = (widget) => {
    if (!widget) return null;

    const dto = {
        id: widget.orderNumber,
        type: widget.type,
        title: widget.title,
        layout: widget.layout,
        styleConfig: widget.styleConfig,
        dataConfig: widget.dataConfig,
        orderIndex: widget.orderIndex,
        createdAt: widget.createdAt,
        updatedAt: widget.updatedAt
    };

    if (widget.dataSources) {
        dto.dataSources = widget.dataSources.map(toPublicDataSourceDto);
    }

    return dto;
};

/**
 * Convertir modelo DashboardPage a DTO público
 * Usa orderNumber como ID público (no expone UUID)
 */
export const toPublicPageDto = (page) => {
    if (!page) return null;

    const dto = {
        id: page.orderNumber,
        name: page.name,
        orderIndex: page.orderIndex,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt
    };

    if (page.widgets) {
        dto.widgets = page.widgets.map(toPublicWidgetDto);
    }

    return dto;
};

/**
 * Convertir modelo DashboardCollaborator a DTO público
 * Entidad hija: expone UUID directamente (accedida vía contexto padre)
 */
export const toPublicCollaboratorDto = (collaborator) => {
    if (!collaborator) return null;

    const dto = {
        id: collaborator.id,
        role: collaborator.role,
        createdAt: collaborator.createdAt
    };

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
 */
export const toPublicGroupCollaboratorDto = (collaborator) => {
    if (!collaborator) return null;

    const dto = {
        id: collaborator.id,
        role: collaborator.role,
        createdAt: collaborator.createdAt
    };

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
 * Convertir modelo Dashboard a DTO público (listado ligero)
 * No incluye pages/widgets/collaborators
 * Incluye pageCount y widgetCount como contadores
 */
export const toPublicDashboardListDto = (dashboard) => {
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
        pageCount: dashboard.pageCount,
        widgetCount: dashboard.widgetCount,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt
    };

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

    return dto;
};

/**
 * Convertir modelo Dashboard a DTO público (detalle completo)
 * Incluye pages, widgets, dataSources y collaborators
 */
export const toPublicDashboardDto = (dashboard) => {
    if (!dashboard) return null;

    const dto = toPublicDashboardListDto(dashboard);

    if (dashboard.pages) {
        dto.pages = dashboard.pages.map(toPublicPageDto);
    }

    if (dashboard.collaborators) {
        dto.collaborators = dashboard.collaborators.map(toPublicCollaboratorDto);
    }

    return dto;
};

/**
 * Convertir modelo DashboardGroup a DTO público
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

    if (group.dashboards) {
        dto.dashboards = group.dashboards.map((dashboard) => {
            const item = {
                id: dashboard.publicCode,
                name: dashboard.name,
                description: dashboard.description
            };

            if (dashboard.DashboardGroupItem) {
                item.orderIndex = dashboard.DashboardGroupItem.orderIndex;
            }

            return item;
        });
    }

    if (group.collaborators) {
        dto.collaborators = group.collaborators.map(toPublicGroupCollaboratorDto);
    }

    return dto;
};

/**
 * Convertir array de grupos de dashboards a DTOs públicos
 */
export const toPublicGroupDtoList = (groups) => {
    if (!Array.isArray(groups)) return [];
    return groups.map(toPublicGroupDto);
};
