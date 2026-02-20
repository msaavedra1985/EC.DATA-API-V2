// Servicio de gestión de sesiones WebSocket activas
// Almacena sesiones en Redis para tracking, rate limiting y límites de conexión
import crypto from 'crypto';
import { config } from '../../../config/env.js';
import { setCache, getCache, deleteCache } from '../../../db/redis/client.js';
import logger from '../../../utils/logger.js';

const SESSION_PREFIX = 'ws:session:';
const USER_SESSIONS_PREFIX = 'ws:user_sessions:';
const SESSION_TTL = 86_400;

export const createSession = async (userData, allowedServices = []) => {
    const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;

    const sessionData = {
        sessionId,
        userId: userData.userId,
        organizationId: userData.organizationId,
        role: userData.role,
        permissions: userData.permissions || [],
        allowedServices,
        subscriptions: [],
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
    };

    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    await setCache(sessionKey, JSON.stringify(sessionData), SESSION_TTL);

    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userData.userId}`;
    const existingSessions = await getUserSessions(userData.userId);
    existingSessions.push(sessionId);
    await setCache(userSessionsKey, JSON.stringify(existingSessions), SESSION_TTL);

    logger.debug({ sessionId, userId: userData.userId }, 'Sesión WS creada');
    return sessionData;
};

export const getSession = async (sessionId) => {
    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    const cached = await getCache(sessionKey);
    if (!cached) return null;

    try {
        return JSON.parse(cached);
    } catch {
        return null;
    }
};

export const updateSession = async (sessionId, updates) => {
    const session = await getSession(sessionId);
    if (!session) return null;

    const updatedSession = {
        ...session,
        ...updates,
        lastActivity: new Date().toISOString(),
    };

    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    await setCache(sessionKey, JSON.stringify(updatedSession), SESSION_TTL);
    return updatedSession;
};

export const addSubscription = async (sessionId, subscription) => {
    const session = await getSession(sessionId);
    if (!session) return null;

    const maxSubs = config.realtime.maxSubscriptionsPerConnection;
    if (session.subscriptions.length >= maxSubs) {
        return { error: 'SUBSCRIPTION_LIMIT', maxSubscriptions: maxSubs };
    }

    const exists = session.subscriptions.find(s =>
        s.type === subscription.type && s.resourceId === subscription.resourceId
    );
    if (exists) {
        return session;
    }

    session.subscriptions.push({
        ...subscription,
        subscribedAt: new Date().toISOString(),
    });

    return await updateSession(sessionId, { subscriptions: session.subscriptions });
};

export const removeSubscription = async (sessionId, type, resourceId) => {
    const session = await getSession(sessionId);
    if (!session) return null;

    session.subscriptions = session.subscriptions.filter(s =>
        !(s.type === type && s.resourceId === resourceId)
    );

    return await updateSession(sessionId, { subscriptions: session.subscriptions });
};

export const getUserSessions = async (userId) => {
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;
    const cached = await getCache(userSessionsKey);
    if (!cached) return [];

    try {
        return JSON.parse(cached);
    } catch {
        return [];
    }
};

export const getUserConnectionCount = async (userId) => {
    const sessions = await getUserSessions(userId);
    let activeCount = 0;

    for (const sessionId of sessions) {
        const session = await getSession(sessionId);
        if (session) activeCount++;
    }

    return activeCount;
};

export const destroySession = async (sessionId) => {
    const session = await getSession(sessionId);
    if (!session) return;

    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    await deleteCache(sessionKey);

    const userSessionsKey = `${USER_SESSIONS_PREFIX}${session.userId}`;
    const sessions = await getUserSessions(session.userId);
    const filtered = sessions.filter(id => id !== sessionId);
    if (filtered.length > 0) {
        await setCache(userSessionsKey, JSON.stringify(filtered), SESSION_TTL);
    } else {
        await deleteCache(userSessionsKey);
    }

    logger.debug({ sessionId, userId: session.userId }, 'Sesión WS destruida');
    return session;
};
