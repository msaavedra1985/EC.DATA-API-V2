// Handler para mensajes EC:DASHBOARD:*
// Maneja: SUBSCRIBE, UNSUBSCRIBE a dashboards con datos de telemetría via MQTT
import { addSubscription, removeSubscription } from '../services/sessionService.js';
import { subscribeToDevice, unsubscribeFromDevice, onMessage, removeMessageCallback } from '../mqtt/client.js';
import logger from '../../../utils/logger.js';

const dashboardSubscriptions = new Map();

const intToHex = (num) => {
    const hex = (num >>> 0).toString(16);
    const hexFill = '0'.repeat(4 - hex.length) + hex;
    const hexSplit = hexFill.split('');
    return [hexSplit[0] + hexSplit[1], hexSplit[2] + hexSplit[3]].join(':');
};

const processMqttForDashboards = (mqttData) => {
    const { deviceUuid, payload } = mqttData;

    let parsedPayload;
    try {
        parsedPayload = JSON.parse(payload);
    } catch {
        return;
    }

    for (const [subKey, subscription] of dashboardSubscriptions) {
        const { ws, dashboardId, devices, channels } = subscription;

        if (ws.readyState !== 1) {
            dashboardSubscriptions.delete(subKey);
            continue;
        }

        const matchingDevice = devices.find(d => d.uuid === deviceUuid);
        if (!matchingDevice) continue;

        let dataPoints = [];
        const rawData = parsedPayload.rtdata || (Array.isArray(parsedPayload) ? parsedPayload : [parsedPayload]);

        for (const dataItem of rawData) {
            if (!channels || channels.length === 0) {
                dataPoints.push(dataItem);
                continue;
            }

            for (const channel of channels) {
                const channelHex = typeof channel.ch === 'number' ? intToHex(channel.ch) : null;
                const isMatch = channelHex
                    ? (dataItem.uid?.endsWith(channelHex) || dataItem.canal === channel.ch)
                    : true;

                if (isMatch) {
                    const point = {
                        channel: channel,
                        deviceId: matchingDevice.publicCode,
                        ts: dataItem.ts,
                    };

                    if (channel.variables) {
                        for (const variable of channel.variables) {
                            const key = variable.definition?.toUpperCase() || variable.definition;
                            if (key && dataItem[key] !== undefined) {
                                point[variable.name || key] = dataItem[key];
                            }
                        }
                    } else {
                        Object.assign(point, dataItem);
                    }

                    dataPoints.push(point);
                }
            }
        }

        if (dataPoints.length === 0) continue;

        const outMsg = {
            type: `EC:DASHBOARD:${dashboardId}:DATA:${matchingDevice.publicCode}`,
            payload: {
                deviceId: matchingDevice.publicCode,
                metrics: dataPoints,
                status: 'online',
            },
            timestamp: new Date().toISOString(),
        };

        try {
            ws.send(JSON.stringify(outMsg));
        } catch (sendError) {
            logger.error({ err: sendError, dashboardId }, 'Error enviando datos de dashboard');
        }
    }
};

let mqttCallbackRegistered = false;

const ensureMqttCallback = () => {
    if (mqttCallbackRegistered) return;
    onMessage('dashboard-handler', processMqttForDashboards);
    mqttCallbackRegistered = true;
};

const handleSubscribe = async (ws, message, parsed, session) => {
    const dashboardId = parsed.resourceId;

    if (!dashboardId) {
        return {
            type: 'EC:DASHBOARD:ERROR',
            payload: {
                code: 'INVALID_MESSAGE',
                message: 'Dashboard ID is required in message type: EC:DASHBOARD:{dashboardId}:SUBSCRIBE',
                fatal: false,
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }

    // TODO: Validar RBAC - el dashboard pertenece a la org del usuario
    // const dashboard = await dashboardRepository.findByPublicCode(dashboardId);
    // if (!dashboard || dashboard.organization_id !== session.organizationId) { ... }

    const devices = message.payload?.devices || [];
    const channels = message.payload?.channels || [];

    if (devices.length === 0) {
        return {
            type: 'EC:DASHBOARD:ERROR',
            payload: {
                code: 'INVALID_MESSAGE',
                message: 'At least one device is required in payload.devices',
                fatal: false,
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }

    const subResult = await addSubscription(session.sessionId, {
        type: 'DASHBOARD',
        resourceId: dashboardId,
    });

    if (subResult?.error === 'SUBSCRIPTION_LIMIT') {
        return {
            type: 'EC:DASHBOARD:ERROR',
            payload: {
                code: 'SUBSCRIPTION_LIMIT',
                message: `Maximum ${subResult.maxSubscriptions} subscriptions reached`,
                fatal: false,
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }

    const subKey = `${session.sessionId}:${dashboardId}`;
    dashboardSubscriptions.set(subKey, {
        ws,
        dashboardId,
        sessionId: session.sessionId,
        devices,
        channels,
    });

    ensureMqttCallback();

    for (const device of devices) {
        if (device.uuid) {
            subscribeToDevice(device.uuid);
        }
    }

    logger.info({
        sessionId: session.sessionId,
        dashboardId,
        deviceCount: devices.length,
    }, 'Dashboard suscrito a datos realtime');

    return {
        type: `EC:DASHBOARD:${dashboardId}:SUBSCRIBED`,
        payload: {
            dashboardId,
            subscribedDevices: devices.map(d => d.publicCode || d.uuid),
            subscribedChannels: channels,
        },
        timestamp: new Date().toISOString(),
        requestId: message.requestId,
    };
};

const handleUnsubscribe = async (ws, message, parsed, session) => {
    const dashboardId = parsed.resourceId;

    if (!dashboardId) {
        return {
            type: 'EC:DASHBOARD:ERROR',
            payload: {
                code: 'INVALID_MESSAGE',
                message: 'Dashboard ID is required',
                fatal: false,
            },
            timestamp: new Date().toISOString(),
            requestId: message.requestId,
        };
    }

    const subKey = `${session.sessionId}:${dashboardId}`;
    const subscription = dashboardSubscriptions.get(subKey);

    if (subscription) {
        for (const device of subscription.devices) {
            if (device.uuid) {
                unsubscribeFromDevice(device.uuid);
            }
        }
        dashboardSubscriptions.delete(subKey);
    }

    await removeSubscription(session.sessionId, 'DASHBOARD', dashboardId);

    logger.info({ sessionId: session.sessionId, dashboardId }, 'Dashboard desuscrito');

    return {
        type: `EC:DASHBOARD:${dashboardId}:UNSUBSCRIBED`,
        payload: { dashboardId },
        timestamp: new Date().toISOString(),
        requestId: message.requestId,
    };
};

export const handleDashboardMessage = async (ws, message, parsed, session) => {
    if (!session) {
        return {
            type: 'EC:DASHBOARD:ERROR',
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
        case 'SUBSCRIBE':
            return await handleSubscribe(ws, message, parsed, session);

        case 'UNSUBSCRIBE':
            return await handleUnsubscribe(ws, message, parsed, session);

        default:
            return {
                type: 'EC:DASHBOARD:ERROR',
                payload: {
                    code: 'INVALID_MESSAGE',
                    message: `Unknown DASHBOARD action: ${action}`,
                    fatal: false,
                },
                timestamp: new Date().toISOString(),
                requestId: message.requestId,
            };
    }
};

export const cleanupDashboardSubscriptions = (sessionId) => {
    for (const [subKey, subscription] of dashboardSubscriptions) {
        if (subscription.sessionId === sessionId) {
            for (const device of subscription.devices) {
                if (device.uuid) {
                    unsubscribeFromDevice(device.uuid);
                }
            }
            dashboardSubscriptions.delete(subKey);
        }
    }
};

export const getDashboardSubscriptionCount = () => dashboardSubscriptions.size;
