// Loader central de modelos y asociaciones Sequelize
import sequelize from './sequelize.js';

/**
 * Este archivo centraliza la carga de todos los modelos de Sequelize
 * y define las asociaciones entre ellos.
 * 
 * Cada módulo tiene sus modelos en modules/{module}/models/
 * Por ejemplo: modules/auth/models/User.js
 * 
 * Las asociaciones se definen aquí para evitar dependencias circulares
 */

// Importar modelos (se agregarán en Fase 2)
// import User from '../modules/auth/models/User.js';
// import Tenant from '../modules/tenants/models/Tenant.js';
// import Site from '../modules/sites/models/Site.js';
// import Bill from '../modules/bills/models/Bill.js';

/**
 * Definir asociaciones entre modelos
 */
export const defineAssociations = () => {
    // Ejemplo de asociaciones (se implementarán en fases futuras):
    
    // User <-> Tenant (many-to-many)
    // User.belongsToMany(Tenant, { through: 'user_tenants', foreignKey: 'user_id' });
    // Tenant.belongsToMany(User, { through: 'user_tenants', foreignKey: 'tenant_id' });

    // Tenant <-> Site (one-to-many)
    // Tenant.hasMany(Site, { foreignKey: 'tenant_id', as: 'sites' });
    // Site.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

    // Site <-> Bill (one-to-many)
    // Site.hasMany(Bill, { foreignKey: 'site_id', as: 'bills' });
    // Bill.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
};

/**
 * Exportar todos los modelos
 * Esto permite importarlos desde cualquier parte de la app
 */
export const models = {
    sequelize,
    // User,
    // Tenant,
    // Site,
    // Bill,
};

export default models;
