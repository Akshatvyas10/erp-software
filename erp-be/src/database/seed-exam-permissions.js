import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import db from '../models/index.js';
import logger from '../utils/logger.js';

const { sequelize, Permission, Role } = db;

(async () => {
    try {
        await sequelize.authenticate();
        logger.info('Connected to DB to seed exam permissions.');

        const permissions = [
            { name: 'exams:read', resource: 'exams', action: 'read', description: 'View exam gradebooks' },
            { name: 'exams:manage', resource: 'exams', action: 'manage', description: 'Create and manage exams and grades' }
        ];

        for (const p of permissions) {
            await Permission.findOrCreate({
                where: { name: p.name },
                defaults: p
            });
        }
        logger.info('✓ Exam permissions seeded.');

        const adminRole = await Role.findOne({ where: { name: 'ADMIN' } });
        if (adminRole) {
            const allExamPerms = await Permission.findAll({ where: { resource: 'exams' } });
            await adminRole.addPermissions(allExamPerms);
            logger.info('✓ Attached exam permissions to ADMIN role.');
        }

        const teacherRole = await Role.findOne({ where: { name: 'TEACHER' } });
        if (teacherRole) {
            const teacherPerms = await Permission.findAll({ 
                where: { resource: 'exams' } 
            });
            await teacherRole.addPermissions(teacherPerms);
            logger.info('✓ Attached exam permissions to TEACHER role.');
        }
        
        const superAdminRole = await Role.findOne({ where: { name: 'SUPER_ADMIN' } });
        if (superAdminRole) {
            const superAdminPerms = await Permission.findAll({ 
                where: { resource: 'exams' } 
            });
            await superAdminRole.addPermissions(superAdminPerms);
            logger.info('✓ Attached exam permissions to SUPER_ADMIN role.');
        }

        process.exit(0);
    } catch (err) {
        logger.error('Failed to seed exam permissions:', err);
        process.exit(1);
    }
})();
