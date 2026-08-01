'use strict';
require('dotenv').config();
const { sequelize, Subject, ClassroomSubject } = require('../models');
const logger = require('../utils/logger');

(async () => {
    try {
        await sequelize.authenticate();
        logger.info('DB connection established.');
        
        // Wait, for classroomSubject, if we are dropping the column subject_name and adding subject_id,
        // it might fail if there's existing data or constraint issues.
        // I will use alter: true.
        
        await Subject.sync({ force: false, alter: true });
        logger.info('✓ subjects table created');
        
        await ClassroomSubject.sync({ force: false, alter: true });
        logger.info('✓ classroom_subjects table updated');
        
        logger.info('Migration complete.');
        process.exit(0);
    } catch (err) {
        logger.error('Migration failed:', err);
        process.exit(1);
    }
})();
