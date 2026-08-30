import Redis from 'ioredis';
import logger from '../utils/logger.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let isConnected = false;

const redisClient = new Redis(redisUrl, {
    retryStrategy(times) {
        if (times > 5) {
            logger.warn('Redis reconnection limit reached. Running without Redis cache.');
            return null; // Stop retrying
        }
        return Math.min(times * 100, 2000);
    },
    maxRetriesPerRequest: 1,
});

redisClient.on('connect', () => {
    isConnected = true;
    logger.info('Connected to Redis successfully');
});

redisClient.on('error', (error) => {
    // Only log error once initially to avoid spam
    if (isConnected) {
        isConnected = false;
        logger.error('Redis connection lost:', error.message);
    }
});

export const getRedisStatus = () => isConnected;
export default redisClient;
