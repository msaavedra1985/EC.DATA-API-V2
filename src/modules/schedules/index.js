// modules/schedules/index.js
// Entry point del módulo Schedules

import router from './routes.js';

// Inicializar asociaciones de modelos
import './models/index.js';

export { router as schedulesRouter };
export default router;
