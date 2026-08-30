import 'dotenv/config';
import db from '../models/index.js';
import seedEventTypes from './seed-event-types.js';
import logger from '../utils/logger.js';

const run = async () => {
    try {
        await db.sequelize.authenticate();
        await db.EventType.sync({ alter: true });
        // CalendarEvent has type ENUM -> STRING change, we need to alter it too.
        await db.CalendarEvent.sync({ alter: true });
        await seedEventTypes();
        process.exit(0);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
};

run();
