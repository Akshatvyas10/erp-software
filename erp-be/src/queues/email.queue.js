import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';
import { getRedisStatus } from '../config/redis.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Connection details for BullMQ
const connection = {
    url: redisUrl,
    maxRetriesPerRequest: null, // Required by BullMQ
};

let emailQueue = null;
let emailWorker = null;

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

/**
 * Initializes the BullMQ Queue and Worker if Redis is active.
 * Gracefully operates inline if Redis is unavailable in local dev.
 */
export const initEmailQueue = (processorMap = {}) => {
    // If Redis is offline in development, log once and fall back gracefully to inline dispatch
    if (process.env.NODE_ENV !== 'production' && !getRedisStatus()) {
        logger.warn('[Email Queue] Redis is offline. Email dispatch will operate in graceful inline fallback mode.');
        return;
    }

    try {
        emailQueue = new Queue(EMAIL_QUEUE_NAME, {
            connection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: 100,
                removeOnFail: 500,
            },
        });

        // Catch connection error events on the Queue Redis client to prevent uncaught AggregateError dumps
        emailQueue.on('error', (err) => {
            if (process.env.NODE_ENV === 'production') {
                logger.error(`[Email Queue Error]: ${err.message}`);
            }
        });

        emailWorker = new Worker(
            EMAIL_QUEUE_NAME,
            async (job) => {
                const { type, payload } = job.data;
                logger.info(`[Email Worker] Processing email job ID ${job.id} (type: ${type})`);
                
                const handler = processorMap[type];
                if (typeof handler === 'function') {
                    return await handler(payload);
                }
                throw new Error(`Unknown email job type: ${type}`);
            },
            {
                connection,
                concurrency: 5,
            }
        );

        // Catch connection error events on the Worker Redis client to prevent uncaught AggregateError dumps
        emailWorker.on('error', (err) => {
            if (process.env.NODE_ENV === 'production') {
                logger.error(`[Email Worker Error]: ${err.message}`);
            }
        });

        emailWorker.on('completed', (job) => {
            logger.info(`[Email Worker] Job ${job.id} (type: ${job.data?.type}) completed successfully.`);
        });

        emailWorker.on('failed', (job, err) => {
            logger.error(`[Email Worker] Job ${job?.id} failed with error: ${err.message}`);
        });

        logger.info('[Email Queue] BullMQ Email Queue & Worker initialized.');
    } catch (err) {
        logger.warn(`[Email Queue] Failed to initialize BullMQ (Redis might be offline): ${err.message}`);
    }
};

/**
 * Enqueue an email job.
 * If Redis/BullMQ is active, adds to persistent queue with retries.
 * If Redis is offline (e.g. local dev without Redis), dispatches asynchronously inline so mail is not lost.
 */
export const enqueueEmailJob = async (type, payload, fallbackHandler) => {
    if (emailQueue && getRedisStatus()) {
        try {
            const job = await emailQueue.add(type, { type, payload });
            logger.info(`[Email Queue] Enqueued email job ${job.id} (type: ${type})`);
            return { queued: true, jobId: job.id };
        } catch (queueErr) {
            logger.warn(`[Email Queue] Failed to push to Redis queue: ${queueErr.message}. Executing fallback.`);
        }
    }

    // Direct async fallback (non-blocking)
    if (typeof fallbackHandler === 'function') {
        setImmediate(async () => {
            try {
                await fallbackHandler(payload);
                logger.info(`[Email Dispatcher] Dispatched email inline (type: ${type})`);
            } catch (err) {
                logger.error(`[Email Dispatcher] Inline email dispatch error: ${err.message}`);
            }
        });
        return { queued: false, inline: true };
    }

    return { queued: false };
};

/**
 * Health statistics for BullMQ queue
 */
export const getQueueHealth = async () => {
    if (!emailQueue) {
        return { initialized: false, waiting: 0, active: 0, failed: 0 };
    }
    try {
        const counts = await emailQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        return {
            initialized: true,
            counts,
        };
    } catch (err) {
        return {
            initialized: false,
            error: err.message,
        };
    }
};
