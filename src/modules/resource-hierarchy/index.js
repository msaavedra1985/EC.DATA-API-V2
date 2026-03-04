// modules/resource-hierarchy/index.js
// Módulo de Jerarquía de Recursos - Punto de entrada

import routes from './routes.js';
import * as services from './services.js';
import * as repository from './repository.js';
import ResourceHierarchy from './models/ResourceHierarchy.js';
import UserResourceAccess from './models/UserResourceAccess.js';

export {
    routes,
    services,
    repository,
    ResourceHierarchy,
    UserResourceAccess
};

export default routes;
