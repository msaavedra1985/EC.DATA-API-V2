// Handler para mensajes EC:DASHBOARD:*
// Maneja: SUBSCRIBE, UNSUBSCRIBE a dashboards con datos de telemetría via MQTT
// Al suscribirse, consulta la DB para resolver automáticamente devices/channels
// Filtrado triple: 1) is_realtime=true, 2) canal por uid hex, 3) variable por mqtt_key
import { addSubscription, removeSubscription } from '../services/sessionService.js';
import { subscribeToDevice, unsubscribeFromDevice, onMessage, removeMessageCallback } from '../mqtt/client.js';
import sequelize from '../../../db/sql/sequelize.js';
import { QueryTypes } from 'sequelize';
import { config } from '../../../config/env.js';
import logger from '../../../utils/logger.js';

const dashboardSubscriptions = new Map();
let idleSweepTimer = null;

// Convierte número de canal (int) a formato hex de 2 bytes como aparece en uid MQTT
// Ej: canal 5 → "00:05", canal 256 → "01:00"
const intToHex = (num) => {
    const hex = (num >>> 0).toString(16);
    const hexFill = '0'.repeat(4 - hex.length) + hex;
    const hexSplit = hexFill.split('');
    return [hexSplit[0] + hexSplit[1], hexSplit[2] + hexSplit[3]].join(':');
};

// Extrae el número de canal desde el uid MQTT
// uid formato: "EC:C3:8A:60:43:CC:00:05" → últimos 2 bytes "00:05" → canal 5
const extractChannelFromUid = (uid) => {
    if (!uid || typeof uid !== 'string') return null;
    const parts = uid.split(':');
    if (parts.length < 2) return null;
    const high = parseInt(parts[parts.length - 2], 16);
    const low = parseInt(parts[parts.length - 1], 16);
    if (isNaN(high) || isNaN(low)) return null;
    return (high << 8) | low;
};

// Consulta la DB para obtener los devices y channels vinculados a un dashboard
// Solo incluye variables con is_realtime=true y mqtt_key definido
// via: dashboard → pages → widgets → widget_data_sources → channels → devices → variables
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
            dp.order_number AS page_number,
            w.order_number AS widget_number,
            wds.order_number AS datasource_number,
            wds.label AS datasource_label,
            wds.series_config,
            v.id AS variable_id,
            v.mqtt_key,
            v.column_name AS variable_column_name,
            v.is_realtime AS variable_is_realtime
        FROM dashboards db
        JOIN dashboard_pages dp ON dp.dashboard_id = db.id AND dp.deleted_at IS NULL
        JOIN widgets w ON w.dashboard_page_id = dp.id AND w.deleted_at IS NULL
        JOIN widget_data_sources wds ON wds.widget_id = w.id AND wds.deleted_at IS NULL
        JOIN channels c ON c.public_code = wds.entity_id AND c.deleted_at IS NULL AND c.is_active = true
        JOIN devices d ON d.id = c.device_id AND d.deleted_at IS NULL AND d.is_active = true
        LEFT JOIN variables v ON v.id = CASE
                WHEN wds.series_config->>'variableId' ~ '^\d+$'
                THEN (wds.series_config->>'variableId')::int
                ELSE NULL
            END
            AND v.is_realtime = true
            AND v.is_active = true
            AND v.measurement_type_id = c.measurement_type_id
        WHERE db.public_code = :dashboardPublicCode
          AND db.deleted_at IS NULL
          AND wds.entity_type = 'channel'
          AND db.organization_id = :organizationId
          AND v.id IS NOT NULL
    `, {
        replacements: { dashboardPublicCode, organizationId },
        type: QueryTypes.SELECT,
    });

    // Agrupar por device → lista de channels con metadata de widgets
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

        // Resolver mqtt_key: usar campo mqtt_key de la DB, fallback a UPPER(column_name)
        const mqttKey = row.mqtt_key || (row.variable_column_name ? row.variable_column_name.toUpperCase() : null);

        channelsList.push({
            ch: row.channel_number,
            publicCode: row.channel_public_code,
            name: row.channel_name,
            deviceUuid: row.device_uuid,
            devicePublicCode: row.device_public_code,
            measurementTypeId: row.measurement_type_id,
            variableId: row.variable_id,
            mqttKey,
            label: row.datasource_label,
            pageNumber: row.page_number,
            widgetNumber: row.widget_number,
            datasourceNumber: row.datasource_number,
        });
    }

    return {
        devices: Array.from(devicesMap.values()),
        channels: channelsList,
    };
};

// Procesa mensajes MQTT y los reenvía a los clientes WS suscritos
// Filtrado estricto: solo rtdata, solo canales del dashboard, solo variables con mqtt_key
const processMqttForDashboards = (mqttData) => {
    const { deviceUuid, payload } = mqttData;

    let parsedPayload;
    try {
        parsedPayload = JSON.parse(payload);
    } catch {
        logger.warn({ deviceUuid }, 'MQTT→Dashboard: Payload no es JSON válido');
        return;
    }

    // Solo procesar rtdata — ignorar todo lo demás del payload
    const rtdata = parsedPayload.rtdata;
    if (!rtdata || !Array.isArray(rtdata) || rtdata.length === 0) {
        return;
    }

    for (const [subKey, subscription] of dashboardSubscriptions) {
        const { ws, dashboardId, devices, channels } = subscription;

        // Limpiar suscripciones con WS cerrado
        if (ws.readyState !== 1) {
            for (const device of devices) {
                if (device.uuid) unsubscribeFromDevice(device.uuid);
            }
            removeSubscription(subscription.sessionId, 'DASHBOARD', dashboardId);
            dashboardSubscriptions.delete(subKey);
            logger.debug({ sessionId: subscription.sessionId, dashboardId }, 'Dashboard → Suscripción limpiada (WS cerrado)');
            continue;
        }

        // Verificar que el device que envió el MQTT está en esta suscripción
        const matchingDevice = devices.find(d => d.uuid === deviceUuid);
        if (!matchingDevice) continue;

        // Filtrar channels que pertenecen a este device
        const deviceChannels = channels.filter(ch => ch.deviceUuid === deviceUuid);
        if (deviceChannels.length === 0) continue;

        // Construir mapa de ch → [{channel info}] para lookup rápido por canal
        const channelsByNumber = new Map();
        for (const ch of deviceChannels) {
            if (typeof ch.ch !== 'number' || !ch.mqttKey) continue;
            if (!channelsByNumber.has(ch.ch)) {
                channelsByNumber.set(ch.ch, []);
            }
            channelsByNumber.get(ch.ch).push(ch);
        }

        if (channelsByNumber.size === 0) continue;

        // Procesar cada item de rtdata
        const channelsData = {};

        for (const dataItem of rtdata) {
            // Extraer número de canal del uid
            const channelNumber = extractChannelFromUid(dataItem.uid) ?? dataItem.canal;
            if (channelNumber == null) continue;

            // Buscar channels del dashboard que matchean este número de canal
            const matchingChannels = channelsByNumber.get(channelNumber);
            if (!matchingChannels) continue;

            // Extraer solo las variables solicitadas por cada channel/datasource
            for (const channel of matchingChannels) {
                const mqttValue = dataItem[channel.mqttKey];
                if (mqttValue === undefined) continue;

                if (!channelsData[channel.publicCode]) {
                    channelsData[channel.publicCode] = {
                        ts: dataItem.ts,
                        values: {},
                    };
                }

                // Key es variableId (consistente con endpoint REST getWidgetData)
                channelsData[channel.publicCode].values[String(channel.variableId)] = mqttValue;
            }
        }

        // Si no hay data relevante para este dashboard, no enviar mensaje
        if (Object.keys(channelsData).length === 0) continue;

        subscription.lastDataAt = Date.now();

        const outMsg = {
            type: `EC:DASHBOARD:${dashboardId}:DATA`,
            payload: {
                deviceId: matchingDevice.publicCode,
                channels: channelsData,
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

    // Resolver devices y channels desde la DB (solo variables con is_realtime=true)
    const { devices, channels } = await resolveDashboardAssets(dashboardId, session.organizationId);

    if (devices.length === 0) {
        return {
            type: 'EC:DASHBOARD:ERROR',
            payload: {
                code: 'NO_ASSETS',
                message: 'No active devices/channels with realtime variables found for this dashboard.',
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
                name: c.name,
                deviceId: c.devicePublicCode,
                variableId: c.variableId,
                measurementTypeId: c.measurementTypeId,
                label: c.label,
                pageNumber: c.pageNumber,
                widgetNumber: c.widgetNumber,
                datasourceNumber: c.datasourceNumber,
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
