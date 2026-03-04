// Handler para mensajes EC:NOTIFY:*
// Placeholder - Se implementará en Fase 4 (Notificaciones en navbar con badge)
import logger from '../../../utils/logger.js';

export const handleNotifyMessage = async (ws, message, parsed, session) => {
    if (!session) {
        return {
            type: 'EC:NOTIFY:ERROR',
            payload: {
                code: 'AUTH_REQUIRED',
                message: 'Send EC:SYSTEM:AUTH first',
                fatal: true,
            },
            timestamp: new Date().toISOString(),
        };
    }

    const action = parsed.action;

    switch (action) {
        case 'READ':
        case 'READ_ALL':
            // TODO: Implementar marcado de notificaciones como leídas
            logger.debug({ action, sessionId: session.sessionId }, 'NOTIFY action pendiente de implementación');
            return {
                type: 'EC:SYSTEM:ERROR',
                payload: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Notification service is not yet implemented',
                    fatal: false,
                },
                timestamp: new Date().toISOString(),
                requestId: message.requestId,
            };

        default:
            return {
                type: 'EC:NOTIFY:ERROR',
                payload: {
                    code: 'INVALID_MESSAGE',
                    message: `Unknown NOTIFY action: ${action}`,
                    fatal: false,
                },
                timestamp: new Date().toISOString(),
                requestId: message.requestId,
            };
    }
};
