// Handler para mensajes EC:IOT:*
// Placeholder - Se implementará en Fase 5 (Control y alertas de dispositivos)
import logger from '../../../utils/logger.js';

export const handleIotMessage = async (ws, message, parsed, session) => {
    if (!session) {
        return {
            type: 'EC:IOT:ERROR',
            payload: {
                code: 'AUTH_REQUIRED',
                message: 'Send EC:SYSTEM:AUTH first',
                fatal: true,
            },
            timestamp: new Date().toISOString(),
        };
    }

    const actionParts = parsed.action.split(':');
    const action = actionParts[actionParts.length - 1];

    switch (action) {
        case 'CMD':
            // TODO: Implementar envío de comandos a dispositivos
            logger.debug({ action, sessionId: session.sessionId }, 'IOT action pendiente de implementación');
            return {
                type: 'EC:SYSTEM:ERROR',
                payload: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'IoT control service is not yet implemented',
                    fatal: false,
                },
                timestamp: new Date().toISOString(),
                requestId: message.requestId,
            };

        default:
            return {
                type: 'EC:IOT:ERROR',
                payload: {
                    code: 'INVALID_MESSAGE',
                    message: `Unknown IOT action: ${action}`,
                    fatal: false,
                },
                timestamp: new Date().toISOString(),
                requestId: message.requestId,
            };
    }
};
