// Servicio de tokens efímeros para autenticación WebSocket
// Genera tokens single-use con TTL de 5 minutos almacenados en Redis
import crypto from 'crypto';
import { config } from '../../../config/env.js';
import { setCache, getAndDeleteCache, deleteCache } from '../../../db/redis/client.js';
import logger from '../../../utils/logger.js';

const TOKEN_PREFIX = 'eph_';
const REDIS_KEY_PREFIX = 'ws:ephemeral:';

export const generateEphemeralToken = async (userData) => {
    const { userId, organizationId, role, allowedServices, email } = userData;

    const tokenId = `${TOKEN_PREFIX}${crypto.randomBytes(32).toString('hex')}`;

    const tokenData = {
        tokenId,
        userId,
        organizationId,
        role,
        allowedServices: allowedServices || ['SYSTEM'],
        email,
        createdAt: new Date().toISOString(),
    };

    const redisKey = `${REDIS_KEY_PREFIX}${tokenId}`;
    const ttl = config.realtime.ephemeralTokenTTL;

    await setCache(redisKey, JSON.stringify(tokenData), ttl);

    logger.debug({ userId, tokenId: tokenId.slice(0, 12) + '...' }, 'Token efímero generado');

    return {
        token: tokenId,
        wsUrl: config.realtime.wsUrl,
        expiresIn: ttl,
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
};

export const validateAndConsumeToken = async (tokenId) => {
    if (!tokenId || !tokenId.startsWith(TOKEN_PREFIX)) {
        return { valid: false, reason: 'TOKEN_INVALID_FORMAT' };
    }

    const redisKey = `${REDIS_KEY_PREFIX}${tokenId}`;
    const tokenData = await getAndDeleteCache(redisKey);

    if (!tokenData) {
        return { valid: false, reason: 'TOKEN_NOT_FOUND_OR_EXPIRED' };
    }

    if (typeof tokenData === 'string') {
        try {
            const parsed = JSON.parse(tokenData);
            return buildValidResult(parsed, tokenId);
        } catch {
            return { valid: false, reason: 'TOKEN_CORRUPTED' };
        }
    }

    return buildValidResult(tokenData, tokenId);
};

const buildValidResult = (tokenData, tokenId) => {
    logger.debug({
        userId: tokenData.userId,
        tokenId: tokenId.slice(0, 12) + '...',
    }, 'Token efímero consumido atómicamente (single-use)');

    return {
        valid: true,
        userData: {
            userId: tokenData.userId,
            organizationId: tokenData.organizationId,
            role: tokenData.role,
            allowedServices: tokenData.allowedServices || ['SYSTEM'],
            email: tokenData.email,
        },
    };
};

export const revokeToken = async (tokenId) => {
    if (!tokenId) return;
    const redisKey = `${REDIS_KEY_PREFIX}${tokenId}`;
    await deleteCache(redisKey);
    logger.debug({ tokenId: tokenId.slice(0, 12) + '...' }, 'Token efímero revocado');
};
