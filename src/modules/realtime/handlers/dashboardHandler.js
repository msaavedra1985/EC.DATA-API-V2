// Handler para mensajes EC:DASHBOARD:*
// Maneja: SUBSCRIBE, UNSUBSCRIBE a dashboards con datos de telemetría via MQTT
// Al suscribirse, consulta la DB para resolver automáticamente devices/channels
import { addSubscription, removeSubscription } from '../services/sessionService.js';
import { subscribeToDevice, unsubscribeFromDevice, onMessage, removeMessageCallback } from '../mqtt/client.js';
import sequelize from '../../../db/sql/sequelize.js';
import { QueryTypes } from 'sequelize';
import { config } from '../../../config/env.js';
import logger from '../../../utils/logger.js';

const dashboardSubscriptions = new Map();
let idleSweepTimer = null;

const intToHex = (num) => {
    const hex = (num >>> 0).toString(16);
    const hexFill = '0'.repeat(4 - hex.length) + hex;
    const hexSplit = hexFill.split('');
    return [hexSplit[0] + hexSplit[1], hexSplit[2] + hexSplit[3]].join(':');
};

// Consulta la DB para obtener los devices y channels vinculados a un dashboard
// via: dashboard → pages → widgets → widget_data_sources (entity_type='channel') → channels → devices
const resolveDashboardAssets = async (dashboardPublicCode, organizationId) => {
    const rows = await sequelize.query(`
        SELECT DISTINCT
            c.id AS channel_id,
            c.public_code AS channel_public_code,
            c.ch AS channel_number,
            c.name AS channel_name,
            c.measurement_type_id,
            d.id AS device_internal_id,
            d.uuid AS device_uuid,
            d.public_code AS device_public_code,
            d.name AS device_name,
            wds.series_config,
            wds.label AS datasource_label
        FROM dashboards db
        JOIN dashboard_pages dp ON dp.dashboard_id = db.id AND dp.deleted_at IS NULL
        JOIN widgets w ON w.dashboard_page_id = dp.id AND w.deleted_at IS NULL
        JOIN widget_data_sources wds ON wds.widget_id = w.id AND wds.deleted_at IS NULL
        JOIN channels c ON c.public_code = wds.entity_id AND c.deleted_at IS NULL AND c.is_active = true
        JOIN devices d ON d.id = c.device_id AND d.deleted_at IS NULL AND d.is_active = true
        WHERE db.public_code = :dashboardPublicCode
          AND db.deleted_at IS NULL
          AND wds.entity_type = 'channel'
          AND db.organization_id = :organizationId
    `, {
        replacements: { dashboardPublicCode, organizationId },
        type: QueryTypes.SELECT,
    });

    // Agrupar por device → lista de channels
    const devicesMap = new Map();
    const channelsList = [];

    for (const row of rows) {
        if (!devicesMap.has(row.device_uuid)) {
            devicesMap.set(row.device_uuid, {
                uuid: row.device_uuid,
                publicCode: row.device_public_code,
                name: row.device_name,
            });
        }

        channelsList.push({
            ch: row.channel_number,
            publicCode: row.channel_public_code,
            name: row.channel_name,
            deviceUuid: row.device_uuid,
            devicePublicCode: row.device_public_code,
            measurementTypeId: row.measurement_type_id,
            seriesConfig: row.series_config,
            label: row.datasource_label,
        });
    }

    return {
        devices: Array.from(devicesMap.values()),
        channels: channelsList,
    };
};

const processMqttForDashboards = (mqttData) => {
    const { deviceUuid, payload } = mqttData;

    logger.debug({
        deviceUuid,
        subscriptionCount: dashboardSubscriptions.size,
        payloadLength: payload?.length,
    }, 'MQTT→Dashboard: Mensaje recibido para procesamiento');

    let parsedPayload;
    try {
        parsedPayload = JSON.parse(payload);
    } catch {
        logger.warn({ deviceUuid }, 'MQTT→Dashboard: Payload no es JSON válido');
        return;
    }

    for (const [subKey, subscription] of dashboardSubscriptions) {
        const { ws, dashboardId, devices, channels } = subscription;

        if (ws.readyState !== 1) {
            for (const device of devices) {
                if (device.uuid) unsubscribeFromDevice(device.uuid);
            }
            removeSubscription(subscription.sessionId, 'DASHBOARD', dashboardId);
            dashboardSubscriptions.delete(subKey);
            logger.debug({ sessionId: subscription.sessionId, dashboardId }, 'Dashboard → Suscripción limpiada (WS cerrado durante procesamiento MQTT)');
            continue;
        }

        const matchingDevice = devices.find(d => d.uuid === deviceUuid);
        if (!matchingDevice) {
            logger.debug({
                deviceUuid,
                dashboardId,
                registeredDevices: devices.map(d => d.uuid),
            }, 'MQTT→Dashboard: Device no matchea con suscripción');
            continue;
        }

        let dataPoints = [];
        const rawData = parsedPayload.rtdata || (Array.isArray(parsedPayload) ? parsedPayload : [parsedPayload]);

        // Filtrar channels que pertenecen a este device
        const deviceChannels = channels.filter(ch => ch.deviceUuid === deviceUuid);

        for (const dataItem of rawData) {
            if (!deviceChannels || deviceChannels.length === 0) {
                dataPoints.push(dataItem);
                continue;
            }

            for (const channel of deviceChannels) {
                const channelHex = typeof channel.ch === 'number' ? intToHex(channel.ch) : null;
                const isMatch = channelHex
                    ? (dataItem.uid?.endsWith(channelHex) || dataItem.canal === channel.ch)
                    : true;

                if (isMatch) {
                    const point = {
                        channelId: channel.publicCode,
                        channelName: channel.name || channel.label,
                        deviceId: matchingDevice.publicCode,
                        ts: dataItem.ts,
                    };

                    // Extraer variables desde series_config si existe
                    const variables = channel.seriesConfig?.variables;
                    if (variables && Array.isArray(variables)) {
                        for (const variable of variables) {
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

        subscription.lastDataAt = Date.now();

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

    // Resolver devices y channels desde la DB usando el public_code del dashboard
    const { devices, channels } = await resolveDashboardAssets(dashboardId, session.organizationId);

    if (devices.length === 0) {
        return {
            type: 'EC:DASHBOARD:ERROR',
            payload: {
                code: 'NO_ASSETS',
                message: 'No active devices/channels found for this dashboard. Verify the dashboard has widgets with channel data sources.',
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
        lastDataAt: Date.now(),
    });

    ensureMqttCallback();
    ensureIdleSweep();

    // Suscribir a MQTT solo los devices únicos
    for (const device of devices) {
        subscribeToDevice(device.uuid);
    }

    logger.info({
        sessionId: session.sessionId,
        dashboardId,
        deviceCount: devices.length,
        channelCount: channels.length,
    }, 'Dashboard suscrito a datos realtime (auto-resolved desde DB)');

    return {
        type: `EC:DASHBOARD:${dashboardId}:SUBSCRIBED`,
        payload: {
            dashboardId,
            subscribedDevices: devices.map(d => d.publicCode),
            subscribedChannels: channels.map(c => ({
                id: c.publicCode,
                name: c.name || c.label,
                ch: c.ch,
                deviceId: c.devicePublicCode,
            })),
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

const sweepIdleDashboardSubscriptions = () => {
    const now = Date.now();
    const idleTimeout = config.realtime.subscriptionIdleTimeout;
    let cleaned = 0;

    for (const [subKey, subscription] of dashboardSubscriptions) {
        const { ws, sessionId, dashboardId, devices, lastDataAt } = subscription;

        if (ws.readyState !== 1) {
            for (const device of devices) {
                if (device.uuid) unsubscribeFromDevice(device.uuid);
            }
            dashboardSubscriptions.delete(subKey);
            cleaned++;
            continue;
        }

        const idleMs = now - (lastDataAt || 0);
        if (idleMs > idleTimeout) {
            try {
                ws.send(JSON.stringify({
                    type: `EC:DASHBOARD:${dashboardId}:IDLE_TIMEOUT`,
                    payload: {
                        dashboardId,
                        idleSeconds: Math.round(idleMs / 1000),
                        message: `Subscription auto-removed: no data received for ${Math.round(idleMs / 1000)}s`,
                    },
                    timestamp: new Date().toISOString(),
                }));
            } catch { /* ws puede estar cerrándose */ }

            for (const device of devices) {
                if (device.uuid) unsubscribeFromDevice(device.uuid);
            }
            removeSubscription(sessionId, 'DASHBOARD', dashboardId);
            dashboardSubscriptions.delete(subKey);
            cleaned++;

            logger.info({
                sessionId,
                dashboardId,
                idleSeconds: Math.round(idleMs / 1000),
            }, 'Dashboard → Suscripción removida por idle timeout');
        }
    }

    if (dashboardSubscriptions.size === 0 && idleSweepTimer) {
        clearInterval(idleSweepTimer);
        idleSweepTimer = null;
        logger.debug('Dashboard → Idle sweep detenido (sin suscripciones activas)');
    }

    if (cleaned > 0) {
        logger.info({ cleaned, remaining: dashboardSubscriptions.size }, 'Dashboard → Idle sweep completado');
    }
};

const ensureIdleSweep = () => {
    if (idleSweepTimer) return;
    const interval = config.realtime.subscriptionIdleSweepInterval;
    idleSweepTimer = setInterval(sweepIdleDashboardSubscriptions, interval);
    logger.debug({ intervalMs: interval }, 'Dashboard → Idle sweep iniciado');
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
