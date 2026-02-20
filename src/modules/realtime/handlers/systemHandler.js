// Handler para mensajes EC:SYSTEM:*
// Maneja: AUTH, PING/PONG, ERROR, DISCONNECT
import { createSession, getSession, updateSession, destroySession } from '../services/sessionService.js';
import { config } from '../../../config/env.js';
import logger from '../../../utils/logger.js';

const API_VERSION = '1.0.0';

const handleAuth = async (ws, message, parsed) => {
    if (ws.session) {
        return {
            type: 'EC:SYSTEM:ERROR',
            payload: {
                code: 'ALREADY_AUTHENTICATED',
                message: 'Session already established',
                fatal: false,
            },
            timestamp: new Date().toISOString(),
        };
    }

    if (!ws.userData) {
        return {
            type: 'EC:SYSTEM:ERROR',
            payload: {
                code: 'AUTH_INVALID',
                message: 'No valid authentication found for this connection',
                fatal: true,
            },
            timestamp: new Date().toISOString(),
        };
    }

    const requestedServices = message.payload?.services || [];
    const tokenServices = ws.userData.allowedServices || ['SYSTEM'];

    let allowedServices = [...new Set(tokenServices)];
    if (requestedServices.length > 0) {
        allowedServices = allowedServices.filter(s =>
            s === 'SYSTEM' || requestedServices.includes(s)
        );
    }

    const session = await createSession(ws.userData, allowedServices);

    ws.session = session;
    ws.sessionId = session.sessionId;

    ws.heartbeatTimer = setInterval(() => {
        const now = Date.now();
        const lastPing = ws.lastPing || ws.connectedAt;
        if (now - lastPing > config.realtime.heartbeatTimeout) {
            logger.warn({ sessionId: session.sessionId }, 'Heartbeat timeout - cerrando conexión');
            ws.close(4008, 'Session expired by inactivity');
        }
    }, config.realtime.heartbeatInterval);

    logger.info({
        sessionId: session.sessionId,
        userId: ws.userData.userId,
        services: allowedServices,
    }, 'Sesión WS autenticada');

    return {
        type: 'EC:SYSTEM:CONNECTED',
        payload: {
            sessionId: session.sessionId,
            serverVersion: API_VERSION,
            allowedServices,
            heartbeatInterval: config.realtime.heartbeatInterval,
        },
        timestamp: new Date().toISOString(),
    };
};

const handlePing = async (ws) => {
    ws.lastPing = Date.now();

    if (ws.session) {
        await updateSession(ws.sessionId, { lastActivity: new Date().toISOString() });
    }

    return {
        type: 'EC:SYSTEM:PONG',
        payload: {
            timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
    };
};

export const handleSystemMessage = async (ws, message, parsed, session) => {
    const action = parsed.action;

    switch (action) {
        case 'AUTH':
            return await handleAuth(ws, message, parsed);

        case 'PING':
            return await handlePing(ws);

        default:
            return {
                type: 'EC:SYSTEM:ERROR',
                payload: {
                    code: 'INVALID_MESSAGE',
                    message: `Unknown SYSTEM action: ${action}`,
                    fatal: false,
                },
                timestamp: new Date().toISOString(),
                requestId: message.requestId,
            };
    }
};

export const cleanupSystemSession = async (ws) => {
    if (ws.heartbeatTimer) {
        clearInterval(ws.heartbeatTimer);
        ws.heartbeatTimer = null;
    }

    if (ws.sessionId) {
        await destroySession(ws.sessionId);
        logger.debug({ sessionId: ws.sessionId }, 'Sesión WS limpiada en close');
    }
};
