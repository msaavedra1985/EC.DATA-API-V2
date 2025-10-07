import { getCache, setCache, deleteCache } from '../../db/redis/client.js';
import { dbLogger } from '../../utils/logger.js';

const USER_CACHE_PREFIX = 'user:';
const SESSION_VERSION_PREFIX = 'session_version:';
const USER_CACHE_TTL = 900;

export const getUserFromCache = async (userId) => {
    try {
        const cached = await getCache(`${USER_CACHE_PREFIX}${userId}`);
        if (cached) {
            return JSON.parse(cached);
        }
        return null;
    } catch (error) {
        dbLogger.error({ error, userId }, 'Error al obtener usuario del caché');
        return null;
    }
};

export const setUserCache = async (userId, userData) => {
    try {
        const data = JSON.stringify(userData);
        await setCache(`${USER_CACHE_PREFIX}${userId}`, data, USER_CACHE_TTL);
        return true;
    } catch (error) {
        dbLogger.error({ error, userId }, 'Error al guardar usuario en caché');
        return false;
    }
};

export const deleteUserCache = async (userId) => {
    try {
        await deleteCache(`${USER_CACHE_PREFIX}${userId}`);
        return true;
    } catch (error) {
        dbLogger.error({ error, userId }, 'Error al eliminar usuario del caché');
        return false;
    }
};

export const getSessionVersion = async (userId) => {
    try {
        const version = await getCache(`${SESSION_VERSION_PREFIX}${userId}`);
        return version ? parseInt(version, 10) : 1;
    } catch (error) {
        dbLogger.error({ error, userId }, 'Error al obtener sessionVersion');
        return 1;
    }
};

export const setSessionVersion = async (userId, version) => {
    try {
        await setCache(`${SESSION_VERSION_PREFIX}${userId}`, version.toString());
        return true;
    } catch (error) {
        dbLogger.error({ error, userId }, 'Error al guardar sessionVersion');
        return false;
    }
};

export const incrementSessionVersion = async (userId) => {
    try {
        const currentVersion = await getSessionVersion(userId);
        const newVersion = currentVersion + 1;
        await setSessionVersion(userId, newVersion);
        return newVersion;
    } catch (error) {
        dbLogger.error({ error, userId }, 'Error al incrementar sessionVersion');
        return null;
    }
};

export const invalidateUserSession = async (userId) => {
    try {
        await incrementSessionVersion(userId);
        await deleteUserCache(userId);
        dbLogger.info({ userId }, 'Sesión de usuario invalidada');
        return true;
    } catch (error) {
        dbLogger.error({ error, userId }, 'Error al invalidar sesión de usuario');
        return false;
    }
};
