// Servidor WebSocket centralizado
// Maneja upgrade HTTP→WS, autenticación por token efímero, routing de mensajes EC:*
import { WebSocketServer } from 'ws';
import { URL } from 'url';
import { validateAndConsumeToken } from './services/tokenService.js';
import { registerHandler, routeMessage } from './helpers/messageRouter.js';
import { handleSystemMessage, cleanupSystemSession } from './handlers/systemHandler.js';
import { handleDashboardMessage, cleanupDashboardSubscriptions } from './handlers/dashboardHandler.js';
import { handleNotifyMessage } from './handlers/notifyHandler.js';
import { handleIotMessage } from './handlers/iotHandler.js';
import { handleChatbotMessage } from './handlers/chatbotHandler.js';
import { handleDevMessage, cleanupDevSubscriptions } from './handlers/devHandler.js';
import { config } from '../../config/env.js';
import logger from '../../utils/logger.js';

let wss = null;
let connectionCount = 0;
let totalMessagesReceived = 0;

const WS_CLOSE_CODES = {
    NORMAL_CLOSURE: 1000,
    GOING_AWAY: 1001,
    POLICY_VIOLATION: 1008,
    INTERNAL_ERROR: 1011,
    UNAUTHORIZED: 4001,
    TOKEN_EXPIRED: 4002,
    FORBIDDEN: 4003,
    SESSION_REPLACED: 4004,
    RATE_LIMITED: 4005,
    ORG_SWITCHED: 4006,
    MAINTENANCE: 4007,
    SESSION_EXPIRED: 4008,
};

const sendMessage = (ws, message) => {
    if (ws.readyState === 1) {
        try {
            ws.send(JSON.stringify(message));
        } catch (error) {
            logger.error({ err: error }, 'Error enviando mensaje WS');
        }
    }
};

const handleUpgrade = async (request, socket, head) => {
    try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
            logger.warn({ ip: request.socket.remoteAddress }, 'WS upgrade sin token');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        const validation = await validateAndConsumeToken(token);

        if (!validation.valid) {
            logger.warn({
                reason: validation.reason,
                ip: request.socket.remoteAddress,
            }, 'WS upgrade con token inválido');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            ws.userData = validation.userData;
            ws.connectedAt = Date.now();
            ws.lastPing = Date.now();
            ws.messageCount = 0;
            ws.messageWindowStart = Date.now();

            wss.emit('connection', ws, request);
        });
    } catch (error) {
        logger.error({ err: error }, 'Error en WS upgrade');
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
    }
};

const handleConnection = (ws, request) => {
    connectionCount++;
    const ip = request.socket.remoteAddress;

    logger.info({
        userId: ws.userData.userId,
        ip,
        connections: connectionCount,
    }, '🔌 WS: Nueva conexión');

    ws.on('message', async (rawData) => {
        try {
            const now = Date.now();

            // Rate limiting por conexión
            if (now - ws.messageWindowStart > 60_000) {
                ws.messageCount = 0;
                ws.messageWindowStart = now;
            }
            ws.messageCount++;

            if (ws.messageCount > config.realtime.maxMessagesPerMinute) {
                sendMessage(ws, {
                    type: 'EC:SYSTEM:ERROR',
                    payload: {
                        code: 'RATE_LIMITED',
                        message: 'Too many messages per minute',
                        fatal: false,
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }

            // Validar tamaño del payload
            if (rawData.length > config.realtime.maxPayloadSize) {
                sendMessage(ws, {
                    type: 'EC:SYSTEM:ERROR',
                    payload: {
                        code: 'PAYLOAD_TOO_LARGE',
                        message: `Maximum payload size is ${config.realtime.maxPayloadSize} bytes`,
                        fatal: false,
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }

            let message;
            try {
                message = JSON.parse(rawData.toString());
            } catch {
                sendMessage(ws, {
                    type: 'EC:SYSTEM:ERROR',
                    payload: {
                        code: 'INVALID_MESSAGE',
                        message: 'Message must be valid JSON',
                        fatal: false,
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }

            if (!message.type) {
                sendMessage(ws, {
                    type: 'EC:SYSTEM:ERROR',
                    payload: {
                        code: 'INVALID_MESSAGE',
                        message: 'Message must include "type" field',
                        fatal: false,
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }

            totalMessagesReceived++;

            // Verificar autenticación para todo excepto EC:SYSTEM:AUTH y EC:SYSTEM:PING
            if (!ws.session && message.type !== 'EC:SYSTEM:AUTH' && message.type !== 'EC:SYSTEM:PING') {
                sendMessage(ws, {
                    type: 'EC:SYSTEM:ERROR',
                    payload: {
                        code: 'AUTH_REQUIRED',
                        message: 'Send EC:SYSTEM:AUTH first to establish session',
                        fatal: true,
                    },
                    timestamp: new Date().toISOString(),
                    requestId: message.requestId,
                });
                return;
            }

            const response = await routeMessage(ws, message, ws.session);

            if (response) {
                sendMessage(ws, response);
            }
        } catch (error) {
            logger.error({ err: error }, 'Error procesando mensaje WS');
            sendMessage(ws, {
                type: 'EC:SYSTEM:ERROR',
                payload: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error',
                    fatal: false,
                },
                timestamp: new Date().toISOString(),
            });
        }
    });

    ws.on('close', async (code, reason) => {
        connectionCount--;
        const reasonStr = reason?.toString() || 'unknown';

        logger.info({
            userId: ws.userData?.userId,
            sessionId: ws.sessionId,
            code,
            reason: reasonStr,
            connections: connectionCount,
        }, '🔌 WS: Conexión cerrada');

        if (ws.sessionId) {
            cleanupDashboardSubscriptions(ws.sessionId);
            cleanupDevSubscriptions(ws.sessionId);
        }
        await cleanupSystemSession(ws);
    });

    ws.on('error', (error) => {
        logger.error({
            err: error,
            userId: ws.userData?.userId,
            sessionId: ws.sessionId,
        }, 'WS: Error en conexión');
    });
};

export const initializeWebSocket = (httpServer) => {
    wss = new WebSocketServer({
        noServer: true,
        maxPayload: config.realtime.maxPayloadSize,
    });

    registerHandler('SYSTEM', handleSystemMessage);
    registerHandler('DASHBOARD', handleDashboardMessage);
    registerHandler('NOTIFY', handleNotifyMessage);
    registerHandler('IOT', handleIotMessage);
    registerHandler('CHATBOT', handleChatbotMessage);

    if (config.env === 'development') {
        registerHandler('DEV', handleDevMessage);
        logger.info('🔧 Servicio EC:DEV registrado (solo development)');
    }

    httpServer.on('upgrade', (request, socket, head) => {
        const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

        if (pathname === '/ws') {
            handleUpgrade(request, socket, head);
        } else {
            socket.destroy();
        }
    });

    wss.on('connection', handleConnection);

    logger.info('✅ WebSocket server inicializado en /ws');
    return wss;
};

export const getWsStatus = () => {
    return {
        initialized: wss !== null,
        activeConnections: connectionCount,
        totalMessagesReceived,
        clients: wss ? wss.clients.size : 0,
    };
};

export const broadcastToUser = (userId, message) => {
    if (!wss) return 0;

    let sent = 0;
    for (const client of wss.clients) {
        if (client.readyState === 1 && client.userData?.userId === userId) {
            sendMessage(client, message);
            sent++;
        }
    }
    return sent;
};

export const broadcastToOrganization = (organizationId, message) => {
    if (!wss) return 0;

    let sent = 0;
    for (const client of wss.clients) {
        if (client.readyState === 1 && client.userData?.organizationId === organizationId) {
            sendMessage(client, message);
            sent++;
        }
    }
    return sent;
};

export const closeWebSocket = () => {
    if (wss) {
        for (const client of wss.clients) {
            client.close(WS_CLOSE_CODES.GOING_AWAY, 'Server shutting down');
        }
        wss.close();
        wss = null;
        logger.info('WebSocket server cerrado');
    }
};

export { WS_CLOSE_CODES };
