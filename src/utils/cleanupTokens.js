// utils/cleanupTokens.js
// Utilidad para limpiar refresh tokens expirados o inactivos

import { cleanupExpiredTokens } from '../modules/auth/refreshTokenRepository.js';

/**
 * Ejecutar limpieza de refresh tokens
 * - Elimina tokens expirados (expires_at < now)
 * - Elimina tokens con idle timeout (last_used_at > 7 días)
 * - Elimina tokens revocados hace más de 30 días (mantener historial limitado)
 */
export const runTokenCleanup = async () => {
    try {
        const deletedCount = await cleanupExpiredTokens();
        console.log(`🧹 Token cleanup: ${deletedCount} tokens eliminados`);
        return deletedCount;
    } catch (error) {
        console.error('❌ Error en cleanup de tokens:', error);
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
    runTokenCleanup().catch(console.error);
    
    // Programar ejecuciones periódicas
    const interval = setInterval(() => {
        runTokenCleanup().catch(console.error);
    }, intervalMs);
    
    console.log(`⏰ Token cleanup scheduler iniciado (cada ${intervalHours} horas)`);
    
    // Retornar función para detener el scheduler
    return () => {
        clearInterval(interval);
        console.log('🛑 Token cleanup scheduler detenido');
    };
};
