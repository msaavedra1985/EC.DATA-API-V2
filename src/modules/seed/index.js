// Router para endpoints de seeding de datos de prueba
import { Router } from 'express';
import { seedTestData } from './services.js';
import { successResponse, errorResponse } from '../../utils/response.js';

const router = Router();


// 📄 Swagger: src/docs/swagger/seed.yaml -> POST /test-data
router.post('/test-data', async (req, res) => {
    try {
        // Obtener query param fresh (default: false)
        const fresh = req.query.fresh === 'true';
        
        // Ejecutar seeding
        const summary = await seedTestData(fresh);
        
        return successResponse(res, summary);
    } catch (error) {
        return errorResponse(res, {
            status: 400,
            code: 'SEEDING_ERROR',
            message: error.message,
        });
    }
});

export default router;
