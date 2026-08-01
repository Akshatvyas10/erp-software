'use strict';

require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT, 10) || 5000;

const start = async () => {
    try {
        await sequelize.authenticate();
        logger.info('PostgreSQL connection established.');

        app.listen(PORT, () => {
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
