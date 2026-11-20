import 'dotenv/config';
import { validateEnv } from './config/envValidator.js';

// Validate environment variables before initializing any service
validateEnv();

import app from './app.js';
import db from './models/index.js';
const { sequelize } = db;
import logger from './utils/logger.js';

import http from 'http';
import { initSocket } from './config/socket.js';
import { initFeeReminderScheduler, stopFeeReminderScheduler } from './schedulers/feeReminder.scheduler.js';

const PORT = parseInt(process.env.PORT, 10) || 5000;

let httpServer = null;

const start = async () => {
    try {
        // Retry connection logic for cloud database (e.g. Neon DNS / cold wake)
        let retries = 5;
        while (retries > 0) {
            try {
                await sequelize.authenticate();
                logger.info('PostgreSQL connection established.');
                break;
            } catch (authErr) {
                retries -= 1;
                if (retries === 0) throw authErr;
                logger.warn(`PostgreSQL connection failed (${authErr.message}). Retrying in 3s... (${retries} retries left)`);
                await new Promise((resolve) => setTimeout(resolve, 3000));
            }
        }

        // Enforce Redis in production multi-instance environment
        if (process.env.NODE_ENV === 'production') {
            const { default: redisClient, getRedisStatus } = await import('./config/redis.js');
            try {
                await redisClient.ping();
                logger.info('Production Redis ping verified: distributed token store and queues operational.');
            } catch (redisErr) {
                logger.error('FATAL: Production mode requires an active distributed Redis instance.');
                logger.error(`Redis connection failed: ${redisErr.message}`);
                process.exit(1);
            }
        }

        const server = http.createServer(app);
        initSocket(server);

        httpServer = server.listen(PORT, () => {
            logger.info(`ERP server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
            // Initialize automated background schedulers
            initFeeReminderScheduler();
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`Port ${PORT} is already in use. Please ensure no stale node process is holding port ${PORT}.`);
            } else {
                logger.error('HTTP server error:', err);
            }
            process.exit(1);
        });
    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
};

// Graceful shutdown
const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    stopFeeReminderScheduler();
    if (httpServer) {
        httpServer.close();
    }
    await sequelize.close();
    process.exit(0);
};

// Handlers for standard shutdown and nodemon restart
process.once('SIGUSR2', async () => {
    logger.info('SIGUSR2 received (nodemon restart) — closing HTTP server');
    if (httpServer) {
        httpServer.close(() => {
            process.kill(process.pid, 'SIGUSR2');
        });
    } else {
        process.kill(process.pid, 'SIGUSR2');
    }
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection:', err);
    process.exit(1);
});

start();
