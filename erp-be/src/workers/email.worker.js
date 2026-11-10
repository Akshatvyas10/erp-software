'use strict';
import 'dotenv/config';
import { Worker } from 'bullmq';
import logger from '../utils/logger.js';
import db from '../models/index.js';
import { EMAIL_QUEUE_NAME } from '../queues/email.queue.js';
import { emailProcessors } from '../services/email.service.js';
import { EmailJobPayloadSchema } from '../schemas/emailJob.schema.js';

const { sequelize } = db;

// ── Redis Connection for Worker ──────────────────────────────────────────────
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = {
    url: redisUrl,
    maxRetriesPerRequest: null,
};

const concurrency = parseInt(process.env.EMAIL_WORKER_CONCURRENCY, 10) || 5;

let worker = null;
let isShuttingDown = false;

/**
 * Initializes the standalone email worker process
 */
const startWorker = async () => {
    try {
        logger.info('================================================================');
        logger.info(`[Email Worker] Booting Outbound Email Delivery Daemon`);
        logger.info(`[Email Worker] Target Queue: ${EMAIL_QUEUE_NAME}`);
        logger.info(`[Email Worker] Redis Host: ${redisUrl.replace(/\/\/:[^@]+@/, '//:***@')}`);
        logger.info(`[Email Worker] Concurrency: ${concurrency} parallel streams`);
        logger.info(`[Email Worker] Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info('================================================================');

        // Verify DB connectivity for dynamic SMTP configuration & templates
        await sequelize.authenticate();
        logger.info('[Email Worker] PostgreSQL connection verified.');

        worker = new Worker(
            EMAIL_QUEUE_NAME,
            async (job) => {
                if (isShuttingDown) {
                    throw new Error('Worker is shutting down — job deferred');
                }

                const startTime = Date.now();
                const { type, payload } = job.data;

                // 1. Zod Validation Check
                const validation = EmailJobPayloadSchema.safeParse({ type, payload });
                if (!validation.success) {
                    const validationErr = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
                    logger.error(`[Email Worker] Job #${job.id} REJECTED due to schema validation failure: ${validationErr}`);
                    throw new Error(`Job payload validation failed: ${validationErr}`);
                }

                // 2. Dispatch to Corresponding Handler
                const handler = emailProcessors[type];
                if (typeof handler !== 'function') {
                    throw new Error(`Unsupported job type '${type}'. Supported types: ${Object.keys(emailProcessors).join(', ')}`);
                }

                logger.info(`[Email Worker] Job #${job.id} [${type}] - Attempt ${job.attemptsMade + 1}/${job.opts.attempts || 3} starting...`);

                try {
                    const result = await handler(payload);
                    const durationMs = Date.now() - startTime;
                    logger.info(`[Email Worker] Job #${job.id} [${type}] - Dispatched successfully in ${durationMs}ms`);
                    return { success: true, durationMs, messageId: result?.messageId || null };
                } catch (dispatchErr) {
                    // Sanitize any accidental password leaks from logs
                    const sanitizedMessage = (dispatchErr.message || '').replace(/(pass|password|secret|auth)=[^& ]+/gi, '$1=***');
                    logger.error(`[Email Worker] Job #${job.id} [${type}] - Dispatch error: ${sanitizedMessage}`);
                    throw new Error(sanitizedMessage);
                }
            },
            {
                connection,
                concurrency,
                limiter: {
                    max: 20, // Rate limit: maximum 20 emails per 5 seconds
                    duration: 5000,
                },
            }
        );

        // Lifecycle event logging
        worker.on('active', (job) => {
            logger.debug(`[Email Worker] Job #${job.id} [${job.data?.type}] is now ACTIVE`);
        });

        worker.on('completed', (job, result) => {
            logger.info(`[Email Worker] Job #${job.id} [${job.data?.type}] COMPLETED. Message ID: ${result?.messageId || 'N/A'}`);
        });

        worker.on('failed', (job, err) => {
            const currentAttempt = job?.attemptsMade || 1;
            const maxAttempts = job?.opts?.attempts || 3;
            if (currentAttempt < maxAttempts) {
                logger.warn(`[Email Worker] Job #${job?.id} [${job?.data?.type}] FAILED attempt ${currentAttempt}/${maxAttempts}. Retrying with exponential backoff...`);
            } else {
                logger.error(`[Email Worker] Job #${job?.id} [${job?.data?.type}] EXHAUSTED ALL ${maxAttempts} RETRIES. Moved to FAILED state.`);
            }
        });

        worker.on('error', (err) => {
            logger.error(`[Email Worker System Error]: ${err.message}`);
        });

        logger.info(`[Email Worker] Daemon active and listening for outbound jobs.`);
    } catch (bootErr) {
        logger.error(`[Email Worker] Fatal startup failure: ${bootErr.message}`);
        process.exit(1);
    }
};

// ── Graceful Shutdown ────────────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[Email Worker] ${signal} signal received. Initiating graceful shutdown...`);

    try {
        if (worker) {
            logger.info('[Email Worker] Pausing queue consumption & waiting for active jobs to finish...');
            await worker.close();
            logger.info('[Email Worker] BullMQ worker closed successfully.');
        }

        await sequelize.close();
        logger.info('[Email Worker] Database connections closed.');

        logger.info('[Email Worker] Shutdown complete. Exiting cleanly.');
        process.exit(0);
    } catch (shutdownErr) {
        logger.error(`[Email Worker] Error during shutdown: ${shutdownErr.message}`);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// Launch the worker
startWorker();

