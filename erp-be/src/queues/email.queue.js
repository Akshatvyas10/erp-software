import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';
import { getRedisStatus } from '../config/redis.js';

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

const getRedisConnection = () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    return {
        url: redisUrl,
        maxRetriesPerRequest: null, // Mandatory for BullMQ
    };
};

let emailQueue = null;
let activeWorker = null;

/**
 * Returns or initializes the BullMQ Queue instance for producers.
 */
export const getEmailQueue = () => {
    if (emailQueue) return emailQueue;

    try {
        emailQueue = new Queue(EMAIL_QUEUE_NAME, {
            connection: getRedisConnection(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000, // 2s, 4s, 8s
                },
                removeOnComplete: {
                    count: 1000,
                    age: 24 * 3600, // Keep completed for 24h
                },
                removeOnFail: {
                    count: 5000,
                    age: 7 * 24 * 3600, // Keep failed for 7 days
                },
            },
        });

        emailQueue.on('error', (err) => {
            logger.warn(`[Email Queue Connection]: ${err.message}`);
        });

        return emailQueue;
    } catch (err) {
        logger.warn(`[Email Queue] Could not initialize BullMQ queue: ${err.message}`);
        return null;
    }
};

/**
 * Creates and starts a BullMQ Worker instance.
 * Intended to be run by the dedicated worker process (src/workers/email.worker.js)
 * or in development if inline worker is requested.
 */
export const createEmailWorker = (processorMap = {}, options = {}) => {
    const concurrency = options.concurrency || parseInt(process.env.EMAIL_WORKER_CONCURRENCY, 10) || 5;

    const worker = new Worker(
        EMAIL_QUEUE_NAME,
        async (job) => {
            const { type, payload } = job.data;
            const startTime = Date.now();

            logger.info(`[Email Worker] Processing job #${job.id} [${type}] (attempt ${job.attemptsMade + 1}/${job.opts.attempts || 3})`);

            const handler = processorMap[type];
            if (typeof handler !== 'function') {
                throw new Error(`Unrecognized email job type '${type}'. Valid types: ${Object.keys(processorMap).join(', ')}`);
            }

            const result = await handler(payload);
            const durationMs = Date.now() - startTime;
            logger.info(`[Email Worker] Job #${job.id} [${type}] processed in ${durationMs}ms`);
            return result;
        },
        {
            connection: getRedisConnection(),
            concurrency,
            limiter: {
                max: 30, // Limit to 30 emails per 10 seconds to avoid provider rate-limits
                duration: 10000,
            },
        }
    );

    worker.on('completed', (job) => {
        logger.info(`[Email Worker] Job #${job.id} [${job.data?.type}] COMPLETED.`);
    });

    worker.on('failed', (job, err) => {
        const attemptsLeft = (job?.opts?.attempts || 3) - (job?.attemptsMade || 1);
        if (attemptsLeft > 0) {
            logger.warn(`[Email Worker] Job #${job?.id} [${job?.data?.type}] FAILED (retry scheduled in backoff): ${err.message}`);
        } else {
            logger.error(`[Email Worker] Job #${job?.id} [${job?.data?.type}] MOVED TO DEAD-LETTER / FAILED: ${err.message}`);
        }
    });

    worker.on('error', (err) => {
        logger.error(`[Email Worker Error]: ${err.message}`);
    });

    activeWorker = worker;
    return worker;
};

/**
 * Legacy support for inline initialization.
 */
export const initEmailQueue = (processorMap = {}) => {
    getEmailQueue();
    // In production or unless RUN_INLINE_WORKER is set, don't start the worker in the API process
    if (process.env.RUN_INLINE_WORKER === 'true' || (process.env.NODE_ENV !== 'production' && getRedisStatus())) {
        logger.info('[Email Queue] Starting in-process email worker...');
        createEmailWorker(processorMap);
    }
};

/**
 * Enqueue an email job into BullMQ.
 * Falls back to non-blocking setImmediate if Redis is offline in development.
 */
export const enqueueEmailJob = async (type, payload, fallbackHandler = null) => {
    const queue = getEmailQueue();

    if (queue && (getRedisStatus() || process.env.NODE_ENV === 'production')) {
        try {
            const job = await queue.add(
                type,
                {
                    type,
                    payload,
                    metadata: {
                        enqueuedAt: new Date().toISOString(),
                    },
                },
                {
                    jobId: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                }
            );

            logger.info(`[Email Queue] Enqueued job #${job.id} [${type}]`);
            return { queued: true, jobId: job.id };
        } catch (queueErr) {
            logger.error(`[Email Queue] Failed to enqueue job to BullMQ: ${queueErr.message}`);
            if (process.env.NODE_ENV === 'production') {
                throw queueErr; // In production, don't silently swallow queue errors
            }
        }
    }

    // Development non-blocking fallback
    if (typeof fallbackHandler === 'function') {
        setImmediate(async () => {
            try {
                await fallbackHandler(payload);
                logger.info(`[Email Fallback] Dispatched inline email [${type}]`);
            } catch (err) {
                logger.error(`[Email Fallback] Inline email error [${type}]: ${err.message}`);
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
    const queue = getEmailQueue();
    if (!queue) {
        return { initialized: false, waiting: 0, active: 0, failed: 0 };
    }
    try {
        const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        return {
            initialized: true,
            queueName: EMAIL_QUEUE_NAME,
            counts,
        };
    } catch (err) {
        return {
            initialized: false,
            error: err.message,
        };
    }
};

export default {
    EMAIL_QUEUE_NAME,
    getEmailQueue,
    createEmailWorker,
    initEmailQueue,
    enqueueEmailJob,
    getQueueHealth,
};
