// Handler para mensajes EC:CHATBOT:*
// Placeholder - Se implementará en Fase 6 (Asistente IA con streaming)
import logger from '../../../utils/logger.js';

export const handleChatbotMessage = async (ws, message, parsed, session) => {
    if (!session) {
        return {
            type: 'EC:CHATBOT:ERROR',
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
        case 'SEND':
            // TODO: Implementar envío de mensajes al chatbot con streaming
            logger.debug({ action, sessionId: session.sessionId }, 'CHATBOT action pendiente de implementación');
            return {
                type: 'EC:SYSTEM:ERROR',
                payload: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Chatbot service is not yet implemented',
                    fatal: false,
                },
                timestamp: new Date().toISOString(),
                requestId: message.requestId,
            };

        default:
            return {
                type: 'EC:CHATBOT:ERROR',
                payload: {
                    code: 'INVALID_MESSAGE',
                    message: `Unknown CHATBOT action: ${action}`,
                    fatal: false,
                },
                timestamp: new Date().toISOString(),
                requestId: message.requestId,
            };
    }
};
