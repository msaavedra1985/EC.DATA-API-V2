// Handler para mensajes EC:DEV:*
// Herramientas de desarrollo/testing - solo disponible en entorno development
// Maneja: MQTT:SUBSCRIBE (suscripción directa a device por UUID), MQTT:UNSUBSCRIBE, MQTT:STATUS
// EXCEPCIÓN DE SEGURIDAD: Este servicio expone UUIDs internos intencionalmente
// para debugging. Está protegido por: 1) solo environment=development, 2) solo roles admin+,
// 3) no se registra como handler en producción (wsServer.js)
import { subscribeToDevice, unsubscribeFromDevice, onMessage, removeMessageCallback, getMqttStatus } from '../mqtt/client.js';
import { addSubscription, removeSubscription } from '../services/sessionService.js';
import { config } from '../../../config/env.js';
import logger from '../../../utils/logger.js';

const devSubscriptions = new Map();

const processMqttForDev = (mqttData) => {
    const { topic, deviceUuid, payload, brokerIndex } = mqttData;

    let parsedPayload;
    try {
        parsedPayload = JSON.parse(payload);
    } catch {
        return;
    }

    for (const [subKey, subscription] of devSubscriptions) {
        const { ws, deviceUuid: subscribedUuid, sessionId } = subscription;

        if (ws.readyState !== 1) {
            devSubscriptions.delete(subKey);
            continue;
        }

        if (subscribedUuid !== deviceUuid) continue;

        const outMsg = {
            type: `EC:DEV:MQTT:DATA`,
            payload: {
                deviceUuid,
                topic,
                brokerIndex,
                data: parsedPayload,
                raw: typeof parsedPayload === 'object',
            },
            timestamp: new Date().toISOString(),
        };

        try {
            ws.send(JSON.stringify(outMsg));
            logger.debug({
                sessionId,
                deviceUuid,
                brokerIndex,
                dataKeys: Object.keys(parsedPayload),
            }, 'EC:DEV → Data MQTT enviada al cliente');
        } catch (sendError) {
            logger.error({ err: sendError, sessionId }, 'EC:DEV → Error enviando datos MQTT');
        }
    }
};

let mqttCallbackRegistered = false;

const ensureMqttCallback = () => {
    if (mqttCallbackRegistered) return;
    onMessage('dev-handler', processMqttForDev);
    mqttCallbackRegistered = true;
};

const handleMqttSubscribe = (ws, message, parsed, session) => {
    const deviceUuid = message.payload?.deviceUuid;

    if (!deviceUuid) {
        return {
            type: 'EC:DEV:MQTT:ERROR',
            payload: {
                code: 'INVALID_PAYLOAD',
                message: 'deviceUuid is required in payload',
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(deviceUuid)) {
        return {
            type: 'EC:DEV:MQTT:ERROR',
            payload: {
                code: 'INVALID_UUID',
                message: 'deviceUuid must be a valid UUID format',
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }

    const subKey = `${session.sessionId}:dev:${deviceUuid}`;

    if (devSubscriptions.has(subKey)) {
        return {
            type: 'EC:DEV:MQTT:ALREADY_SUBSCRIBED',
            payload: {
                deviceUuid,
                message: 'Already subscribed to this device',
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }

    ensureMqttCallback();

    subscribeToDevice(deviceUuid);

    devSubscriptions.set(subKey, {
        ws,
        sessionId: session.sessionId,
        deviceUuid,
        subscribedAt: new Date().toISOString(),
    });

    addSubscription(session.sessionId, {
        type: 'dev-mqtt',
        resourceId: deviceUuid,
    });

    logger.info({
        sessionId: session.sessionId,
        deviceUuid,
        activeDevSubs: devSubscriptions.size,
    }, 'EC:DEV → Suscrito a device MQTT (raw data)');

    return {
        type: 'EC:DEV:MQTT:SUBSCRIBED',
        payload: {
            deviceUuid,
            message: `Subscribed to MQTT data for device ${deviceUuid}. Real-time data will arrive as EC:DEV:MQTT:DATA messages.`,
            brokers: getMqttStatus().brokers.map(b => ({
                index: b.index,
                connected: b.connected,
            })),
        },
        timestamp: new Date().toISOString(),
        requestId: message.requestId,
    };
};

const handleMqttUnsubscribe = (ws, message, parsed, session) => {
    const deviceUuid = message.payload?.deviceUuid;

    if (!deviceUuid) {
        return {
            type: 'EC:DEV:MQTT:ERROR',
            payload: {
                code: 'INVALID_PAYLOAD',
                message: 'deviceUuid is required in payload',
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }

    const subKey = `${session.sessionId}:dev:${deviceUuid}`;

    if (!devSubscriptions.has(subKey)) {
        return {
            type: 'EC:DEV:MQTT:ERROR',
            payload: {
                code: 'NOT_SUBSCRIBED',
                message: 'Not subscribed to this device',
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }

    unsubscribeFromDevice(deviceUuid);
    devSubscriptions.delete(subKey);
    removeSubscription(session.sessionId, 'dev-mqtt', deviceUuid);

    logger.info({
        sessionId: session.sessionId,
        deviceUuid,
        activeDevSubs: devSubscriptions.size,
    }, 'EC:DEV → Desuscrito de device MQTT');

    return {
        type: 'EC:DEV:MQTT:UNSUBSCRIBED',
        payload: {
            deviceUuid,
            message: `Unsubscribed from MQTT data for device ${deviceUuid}`,
        },
        timestamp: new Date().toISOString(),
        requestId: message.requestId,
    };
};

const handleMqttStatus = () => {
    const mqttStatus = getMqttStatus();

    const activeSubs = [];
    for (const [subKey, sub] of devSubscriptions) {
        activeSubs.push({
            deviceUuid: sub.deviceUuid,
            sessionId: sub.sessionId,
            subscribedAt: sub.subscribedAt,
        });
    }

    return {
        type: 'EC:DEV:MQTT:STATUS',
        payload: {
            mqtt: mqttStatus,
            devSubscriptions: activeSubs,
        },
        timestamp: new Date().toISOString(),
    };
};

export const handleDevMessage = (ws, message, parsed, session) => {
    if (config.env !== 'development') {
        return {
            type: 'EC:DEV:ERROR',
            payload: {
                code: 'DEV_ONLY',
                message: 'DEV service is only available in development environment',
                fatal: false,
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }

    const role = session?.role;
    if (!['superadmin', 'admin', 'system-admin'].includes(role)) {
        return {
            type: 'EC:DEV:ERROR',
            payload: {
                code: 'FORBIDDEN',
                message: 'DEV service requires admin or superadmin role',
                fatal: false,
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }

    const action = parsed.action;

    switch (action) {
        case 'MQTT:SUBSCRIBE':
            return handleMqttSubscribe(ws, message, parsed, session);
        case 'MQTT:UNSUBSCRIBE':
            return handleMqttUnsubscribe(ws, message, parsed, session);
        case 'MQTT:STATUS':
            return handleMqttStatus();
        default:
            return {
                type: 'EC:DEV:ERROR',
                payload: {
                    code: 'UNKNOWN_ACTION',
                    message: `Unknown DEV action: ${action}. Available: MQTT:SUBSCRIBE, MQTT:UNSUBSCRIBE, MQTT:STATUS`,
                    fatal: false,
                },
                timestamp: new Date().toISOString(),
                requestId: message.requestId,
            };
    }
};

export const cleanupDevSubscriptions = (sessionId) => {
    for (const [subKey, subscription] of devSubscriptions) {
        if (subKey.startsWith(`${sessionId}:`)) {
            unsubscribeFromDevice(subscription.deviceUuid);
            devSubscriptions.delete(subKey);
            logger.debug({ sessionId, deviceUuid: subscription.deviceUuid }, 'EC:DEV → Suscripción limpiada en cleanup');
        }
    }
};
