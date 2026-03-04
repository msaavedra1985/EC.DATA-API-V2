// modules/asset-categories/index.js
// Punto de entrada del módulo AssetCategory (Tags jerárquicos)

import router from './routes.js';
import AssetCategory from './models/AssetCategory.js';
import * as repository from './repository.js';
import * as services from './services.js';

export {
  router,
  AssetCategory,
  repository,
  services
};

export default router;
