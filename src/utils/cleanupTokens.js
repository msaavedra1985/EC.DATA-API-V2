// utils/cleanupTokens.js
// Utilidad para limpiar refresh tokens expirados o inactivos

import { cleanupExpiredTokens } from '../modules/auth/refreshTokenRepository.js';
import { schedulerLogger } from './logger.js';

/**
 * Ejecutar limpieza de refresh tokens
 * - Elimina tokens expirados (expires_at < now)
 * - Elimina tokens con idle timeout (last_used_at > 7 días)
 * - Elimina tokens revocados hace más de 30 días (mantener historial limitado)
 */
export const runTokenCleanup = async () => {
    try {
        const deletedCount = await cleanupExpiredTokens();
        schedulerLogger.info(`🧹 Token cleanup: ${deletedCount} tokens eliminados`);
        return deletedCount;
    } catch (error) {
        schedulerLogger.error(error, '❌ Error en cleanup de tokens');
        throw error;
    }
};

/**
 * Iniciar cleanup periódico de tokens
 * Se ejecuta cada 6 horas por defecto
 * @param {number} intervalHours - Intervalo en horas (default: 6)
 */
export const startTokenCleanupScheduler = (intervalHours = 6) => {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    // Ejecutar inmediatamente al iniciar
    runTokenCleanup().catch((error) => schedulerLogger.error(error, 'Error in token cleanup'));
    
    // Programar ejecuciones periódicas
    const interval = setInterval(() => {
        runTokenCleanup().catch((error) => schedulerLogger.error(error, 'Error in token cleanup'));
    }, intervalMs);
    
    schedulerLogger.info(`⏰ Token cleanup scheduler iniciado (cada ${intervalHours} horas)`);
    
    // Retornar función para detener el scheduler
    return () => {
        clearInterval(interval);
        schedulerLogger.info('🛑 Token cleanup scheduler detenido');
    };
};
