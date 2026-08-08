import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import db from '../models/index.js';
const { sequelize, Permission, Role } = db;
import logger from '../utils/logger.js';

(async () => {
    try {
        await sequelize.authenticate();
        logger.info('Connected to DB to seed homework permissions.');

        const permissions = [
            { name: 'homework:read', resource: 'homework', action: 'read', description: 'Can view homework' },
            { name: 'homework:create', resource: 'homework', action: 'create', description: 'Can create homework' },
            { name: 'homework:update', resource: 'homework', action: 'update', description: 'Can update homework' },
            { name: 'homework:delete', resource: 'homework', action: 'delete', description: 'Can delete homework' },
            { name: 'homework:manage', resource: 'homework', action: 'manage', description: 'Full access to homework' }
        ];

        for (const p of permissions) {
            await Permission.findOrCreate({
                where: { resource: p.resource, action: p.action },
                defaults: p
            });
        }
        logger.info('✓ Homework permissions seeded.');

        // Optionally attach manage to ADMIN
        const adminRole = await Role.findOne({ where: { name: 'ADMIN' } });
        if (adminRole) {
            const allHomeworkPerms = await Permission.findAll({ where: { resource: 'homework' } });
            await adminRole.addPermissions(allHomeworkPerms);
            logger.info('✓ Attached homework permissions to ADMIN role.');
        }

        const teacherRole = await Role.findOne({ where: { name: 'TEACHER' } });
        if (teacherRole) {
            const teacherPerms = await Permission.findAll({ 
                where: { 
                    resource: 'homework',
                    action: ['read', 'create', 'update', 'delete']
                } 
            });
            await teacherRole.addPermissions(teacherPerms);
            logger.info('✓ Attached homework permissions to TEACHER role.');
        }

        const studentRole = await Role.findOne({ where: { name: 'STUDENT' } });
        if (studentRole) {
            const studentPerms = await Permission.findAll({ 
                where: { 
                    resource: 'homework',
                    action: ['read']
                } 
            });
            await studentRole.addPermissions(studentPerms);
            logger.info('✓ Attached homework permissions to STUDENT role.');
        }

        process.exit(0);
    } catch (err) {
        logger.error('Failed to seed homework permissions:', err);
        process.exit(1);
    }
})();
