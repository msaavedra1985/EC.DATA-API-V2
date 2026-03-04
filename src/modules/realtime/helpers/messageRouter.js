// Router de mensajes EC:* - Despacha mensajes entrantes al handler correcto
// Parsea el tipo de mensaje y lo enruta al servicio correspondiente
import logger from '../../../utils/logger.js';

const handlers = new Map();

export const registerHandler = (servicePrefix, handler) => {
    handlers.set(servicePrefix, handler);
    logger.debug({ service: servicePrefix }, 'Handler registrado para servicio EC:*');
};

export const parseMessageType = (type) => {
    if (!type || typeof type !== 'string' || !type.startsWith('EC:')) {
        return null;
    }

    const parts = type.split(':');
    if (parts.length < 3) return null;

    return {
        protocol: parts[0],
        service: parts[1],
        action: parts.slice(2).join(':'),
        resourceId: parts.length >= 4 ? parts[2] : null,
        fullType: type,
    };
};

export const routeMessage = async (ws, message, session) => {
    const parsed = parseMessageType(message.type);

    if (!parsed) {
        return {
            type: 'EC:SYSTEM:ERROR',
            payload: {
                code: 'INVALID_MESSAGE',
                message: 'Invalid message type format. Expected EC:{SERVICE}:{ACTION}',
                fatal: false,
            },
            timestamp: new Date().toISOString(),
        };
    }

    if (session && session.allowedServices) {
        if (!session.allowedServices.includes(parsed.service)) {
            return {
                type: 'EC:SYSTEM:ERROR',
                payload: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: `Service ${parsed.service} not available for this session`,
                    fatal: false,
                },
                timestamp: new Date().toISOString(),
                requestId: message.requestId,
            };
        }
    }

    const handler = handlers.get(parsed.service);
    if (!handler) {
        return {
            type: 'EC:SYSTEM:ERROR',
            payload: {
                code: 'SERVICE_UNAVAILABLE',
                message: `Service ${parsed.service} is not implemented`,
                fatal: false,
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }

    try {
        return await handler(ws, message, parsed, session);
    } catch (error) {
        logger.error({ err: error, type: message.type }, 'Error en handler de mensaje');
        return {
            type: 'EC:SYSTEM:ERROR',
            payload: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error processing message',
                fatal: false,
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }
};
