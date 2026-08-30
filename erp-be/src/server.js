import 'dotenv/config';
import app from './app.js';
import db from './models/index.js';
const { sequelize } = db;
import logger from './utils/logger.js';

import http from 'http';
import { initSocket } from './config/socket.js';

const PORT = parseInt(process.env.PORT, 10) || 5000;

const start = async () => {
    try {
        await sequelize.authenticate();
        logger.info('PostgreSQL connection established.');

        const server = http.createServer(app);
        initSocket(server);

        server.listen(PORT, () => {
            logger.info(`ERP server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
        });
    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
};

// Graceful shutdown
const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    await sequelize.close();
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection:', err);
    process.exit(1);
});

start();
