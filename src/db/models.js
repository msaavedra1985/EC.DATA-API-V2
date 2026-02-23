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
    foreignKey: 'userId',
    as: 'UserOrganizations'
});

// --- Asociaciones del módulo Dashboards ---

// Dashboard
Dashboard.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Dashboard.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Dashboard.hasMany(DashboardPage, { foreignKey: 'dashboardId', as: 'pages', onDelete: 'CASCADE' });
Dashboard.hasMany(DashboardCollaborator, { foreignKey: 'dashboardId', as: 'collaborators', onDelete: 'CASCADE' });
Dashboard.belongsToMany(DashboardGroup, { through: DashboardGroupItem, foreignKey: 'dashboardId', otherKey: 'dashboardGroupId', as: 'groups' });

// DashboardPage
DashboardPage.belongsTo(Dashboard, { foreignKey: 'dashboardId', as: 'dashboard' });
DashboardPage.hasMany(Widget, { foreignKey: 'dashboardPageId', as: 'widgets', onDelete: 'CASCADE' });

// Widget
Widget.belongsTo(DashboardPage, { foreignKey: 'dashboardPageId', as: 'page' });
Widget.hasMany(WidgetDataSource, { foreignKey: 'widgetId', as: 'dataSources', onDelete: 'CASCADE' });

// WidgetDataSource
WidgetDataSource.belongsTo(Widget, { foreignKey: 'widgetId', as: 'widget' });

// DashboardGroup
DashboardGroup.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
DashboardGroup.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
DashboardGroup.belongsToMany(Dashboard, { through: DashboardGroupItem, foreignKey: 'dashboardGroupId', otherKey: 'dashboardId', as: 'dashboards' });
DashboardGroup.hasMany(DashboardGroupCollaborator, { foreignKey: 'dashboardGroupId', as: 'collaborators', onDelete: 'CASCADE' });

// DashboardGroupItem
DashboardGroupItem.belongsTo(DashboardGroup, { foreignKey: 'dashboardGroupId', as: 'group' });
DashboardGroupItem.belongsTo(Dashboard, { foreignKey: 'dashboardId', as: 'dashboard' });

// DashboardCollaborator
DashboardCollaborator.belongsTo(Dashboard, { foreignKey: 'dashboardId', as: 'dashboard' });
DashboardCollaborator.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// DashboardGroupCollaborator
DashboardGroupCollaborator.belongsTo(DashboardGroup, { foreignKey: 'dashboardGroupId', as: 'group' });
DashboardGroupCollaborator.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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
