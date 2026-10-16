import redisClient, { getRedisStatus } from '../config/redis.js';
import logger from '../utils/logger.js';

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

// In-memory fallback if Redis is temporarily offline (local dev without Redis)
const memorySessions = new Map();
const memoryBlacklist = new Map();

// Throttle Redis fallback warning logs to prevent log flooding (e.g. max once per minute)
let lastFallbackAlertTime = 0;
const FALLBACK_ALERT_THROTTLE_MS = 60 * 1000;

const notifyRedisFallback = (operation) => {
    const now = Date.now();
    if (now - lastFallbackAlertTime > FALLBACK_ALERT_THROTTLE_MS) {
        lastFallbackAlertTime = now;
        logger.warn(
            `[REDIS FALLBACK ALERT] Redis is unavailable at ${new Date().toISOString()} during ${operation}. ` +
            `Operating in IN-MEMORY session fallback mode. ` +
            `CRITICAL: This instance cannot synchronize sessions or token revocations with other cluster/pod instances!`
        );
    }
};

/**
 * Register a session for a user in Redis
 */
export const createSession = async (userId, jti, metadata = {}) => {
    const key = `user:session:${userId}:${jti}`;
    const payload = {
        jti,
        userId,
        ip: metadata.ip || 'unknown',
        userAgent: metadata.userAgent || 'unknown',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
    };

    if (getRedisStatus()) {
        await redisClient.setex(key, SESSION_TTL, JSON.stringify(payload));
    } else {
        notifyRedisFallback('createSession');
        memorySessions.set(key, { payload, expiresAt: Date.now() + SESSION_TTL * 1000 });
    }
    return jti;
};

/**
 * Validate that a session key exists in Redis
 */
export const validateSession = async (userId, jti) => {
    if (!jti) return false;
    const key = `user:session:${userId}:${jti}`;

    if (getRedisStatus()) {
        const data = await redisClient.get(key);
        return Boolean(data);
    } else {
        notifyRedisFallback('validateSession');
        const item = memorySessions.get(key);
        if (!item) return false;
        if (Date.now() > item.expiresAt) {
            memorySessions.delete(key);
            return false;
        }
        return true;
    }
};

/**
 * Revoke a single session by JTI (e.g. single logout)
 */
export const revokeSession = async (userId, jti) => {
    if (!jti) return;
    const key = `user:session:${userId}:${jti}`;

    if (getRedisStatus()) {
        await redisClient.del(key);
    } else {
        notifyRedisFallback('revokeSession');
        memorySessions.delete(key);
    }
};

/**
 * Revoke all active sessions for a user (password change, force logout)
 */
export const revokeAllUserSessions = async (userId) => {
    if (getRedisStatus()) {
        const stream = redisClient.scanStream({ match: `user:session:${userId}:*` });
        stream.on('data', async (keys) => {
            if (keys && keys.length) {
                const pipeline = redisClient.pipeline();
                keys.forEach((k) => pipeline.del(k));
                await pipeline.exec();
            }
        });
    } else {
        notifyRedisFallback('revokeAllUserSessions');
        for (const k of memorySessions.keys()) {
            if (k.startsWith(`user:session:${userId}:`)) {
                memorySessions.delete(k);
            }
        }
    }
};

/**
 * Blacklist an access token JTI until its natural expiry timestamp
 */
export const blacklistAccessToken = async (jti, expTimestamp) => {
    if (!jti || !expTimestamp) return;
    const remainingSeconds = Math.max(0, Math.floor(expTimestamp - Date.now() / 1000));
    if (remainingSeconds <= 0) return;

    const key = `blacklist:jwt:${jti}`;

    if (getRedisStatus()) {
        await redisClient.setex(key, remainingSeconds, 'revoked');
    } else {
        notifyRedisFallback('blacklistAccessToken');
        memoryBlacklist.set(key, Date.now() + remainingSeconds * 1000);
    }
};

/**
 * Check if an access token JTI is blacklisted
 */
export const isAccessTokenBlacklisted = async (jti) => {
    if (!jti) return false;
    const key = `blacklist:jwt:${jti}`;

    if (getRedisStatus()) {
        const exists = await redisClient.exists(key);
        return exists === 1;
    } else {
        const exp = memoryBlacklist.get(key);
        if (!exp) return false;
        if (Date.now() > exp) {
            memoryBlacklist.delete(key);
            return false;
        }
        return true;
    }
};

/**
 * Storage health reporting for monitoring tools / health-checks
 */
export const getSessionStorageMode = () => {
    const isRedisActive = getRedisStatus();
    return {
        mode: isRedisActive ? 'redis' : 'in-memory-fallback',
        isDistributed: isRedisActive,
        memorySessionCount: memorySessions.size,
        memoryBlacklistCount: memoryBlacklist.size,
    };
};
