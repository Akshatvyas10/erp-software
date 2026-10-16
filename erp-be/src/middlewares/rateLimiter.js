import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient, { getRedisStatus } from '../config/redis.js';

/**
 * Creates Redis store dynamically if Redis is connected
 */
const getStore = (prefix) => {
    if (getRedisStatus()) {
        return new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
            prefix: `rl:${prefix}:`,
        });
    }
    return undefined; // Falls back to express-rate-limit default MemoryStore
};

/** Strict limiter for auth endpoints */
export const authLimiter = rateLimit({
    store: getStore('auth'),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
    skipSuccessfulRequests: true, // only count failed attempts
});

/** General API limiter */
export const apiLimiter = rateLimit({
    store: getStore('api'),
    windowMs: 60 * 1000, // 1 minute
    max: 180,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please slow down.' },
});
