import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import db from '../models/index.js';
const { sequelize, Homework, HomeworkSubmission } = db;
import logger from '../utils/logger.js';

(async () => {
    try {
        await sequelize.authenticate();
        logger.info('Neon DB connection established.');

        await Homework.sync({ force: false, alter: true });
        logger.info('✓ homeworks');

        await HomeworkSubmission.sync({ force: false, alter: true });
        logger.info('✓ homework_submissions');

        logger.info('Homework tables synchronized with Neon DB.');
        process.exit(0);
    } catch (err) {
        logger.error('Migration failed:', err);
        process.exit(1);
    }
})();
