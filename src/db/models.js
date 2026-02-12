/**
 * Registro de todos los modelos de Sequelize
 * Importar en orden de dependencias para que sync() funcione correctamente
 */

// Modelos sin dependencias primero
import Country from '../modules/countries/models/Country.js';
import CountryTranslation from '../modules/countries/models/CountryTranslation.js';
import Role from '../modules/auth/models/Role.js';

// Modelos con dependencia a Countries
import Organization from '../modules/organizations/models/Organization.js';

// Modelos con dependencia a Organizations y Countries
import Site from '../modules/sites/models/Site.js';

// Modelos con dependencia a Organizations y Roles
import User from '../modules/auth/models/User.js';
import UserOrganization from '../modules/auth/models/UserOrganization.js';

// Modelos con dependencia a Users
import RefreshToken from '../modules/auth/models/RefreshToken.js';

// Modelos del módulo Dashboards (dependencias: Organizations, Users)
import Dashboard from '../modules/dashboards/models/Dashboard.js';
import DashboardPage from '../modules/dashboards/models/DashboardPage.js';
import Widget from '../modules/dashboards/models/Widget.js';
import WidgetDataSource from '../modules/dashboards/models/WidgetDataSource.js';
import DashboardGroup from '../modules/dashboards/models/DashboardGroup.js';
import DashboardGroupItem from '../modules/dashboards/models/DashboardGroupItem.js';
import DashboardCollaborator from '../modules/dashboards/models/DashboardCollaborator.js';
import DashboardGroupCollaborator from '../modules/dashboards/models/DashboardGroupCollaborator.js';

// Definir asociaciones adicionales después de importar todos los modelos
// para evitar dependencias circulares
User.hasMany(UserOrganization, {
    foreignKey: 'user_id',
    as: 'UserOrganizations'
});

// --- Asociaciones del módulo Dashboards ---

// Dashboard
Dashboard.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Dashboard.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
Dashboard.hasMany(DashboardPage, { foreignKey: 'dashboard_id', as: 'pages', onDelete: 'CASCADE' });
Dashboard.hasMany(DashboardCollaborator, { foreignKey: 'dashboard_id', as: 'collaborators', onDelete: 'CASCADE' });
Dashboard.belongsToMany(DashboardGroup, { through: DashboardGroupItem, foreignKey: 'dashboard_id', otherKey: 'dashboard_group_id', as: 'groups' });

// DashboardPage
DashboardPage.belongsTo(Dashboard, { foreignKey: 'dashboard_id', as: 'dashboard' });
DashboardPage.hasMany(Widget, { foreignKey: 'dashboard_page_id', as: 'widgets', onDelete: 'CASCADE' });

// Widget
Widget.belongsTo(DashboardPage, { foreignKey: 'dashboard_page_id', as: 'page' });
Widget.hasMany(WidgetDataSource, { foreignKey: 'widget_id', as: 'dataSources', onDelete: 'CASCADE' });

// WidgetDataSource
WidgetDataSource.belongsTo(Widget, { foreignKey: 'widget_id', as: 'widget' });

// DashboardGroup
DashboardGroup.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
DashboardGroup.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
DashboardGroup.belongsToMany(Dashboard, { through: DashboardGroupItem, foreignKey: 'dashboard_group_id', otherKey: 'dashboard_id', as: 'dashboards' });
DashboardGroup.hasMany(DashboardGroupCollaborator, { foreignKey: 'dashboard_group_id', as: 'collaborators', onDelete: 'CASCADE' });

// DashboardGroupItem
DashboardGroupItem.belongsTo(DashboardGroup, { foreignKey: 'dashboard_group_id', as: 'group' });
DashboardGroupItem.belongsTo(Dashboard, { foreignKey: 'dashboard_id', as: 'dashboard' });

// DashboardCollaborator
DashboardCollaborator.belongsTo(Dashboard, { foreignKey: 'dashboard_id', as: 'dashboard' });
DashboardCollaborator.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// DashboardGroupCollaborator
DashboardGroupCollaborator.belongsTo(DashboardGroup, { foreignKey: 'dashboard_group_id', as: 'group' });
DashboardGroupCollaborator.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

/**
 * Array de modelos en orden de dependencia
 * Sequelize.sync() los crea en este orden
 */
export const models = [
    Country,
    CountryTranslation,
    Role,
    Organization,
    Site,
    User,
    UserOrganization,
    RefreshToken,
    Dashboard,
    DashboardPage,
    Widget,
    WidgetDataSource,
    DashboardGroup,
    DashboardGroupItem,
    DashboardCollaborator,
    DashboardGroupCollaborator
];

export default {
    Country,
    CountryTranslation,
    Role,
    Organization,
    Site,
    User,
    UserOrganization,
    RefreshToken,
    Dashboard,
    DashboardPage,
    Widget,
    WidgetDataSource,
    DashboardGroup,
    DashboardGroupItem,
    DashboardCollaborator,
    DashboardGroupCollaborator
};
