import 'dotenv/config';
import db from '../models/index.js';
const { sequelize, Permission, Role, StudentLeaveRequest } = db;
import logger from '../utils/logger.js';

(async () => {
    try {
        await sequelize.authenticate();
        logger.info('Connected to PostgreSQL for student leave seeding.');

        // 1. Sync student_leave_requests table
        await StudentLeaveRequest.sync({ force: false, alter: true });
        logger.info('✓ student_leave_requests table synchronized.');

        // 2. Seed student_leaves permissions (action must be in 'create', 'read', 'update', 'delete', 'manage')
        const perms = [
            { name: 'student_leaves:read', resource: 'student_leaves', action: 'read', description: 'Can view student leave applications' },
            { name: 'student_leaves:create', resource: 'student_leaves', action: 'create', description: 'Can apply for student leave' },
            { name: 'student_leaves:action', resource: 'student_leaves', action: 'update', description: 'Can approve or reject student leaves (Class Teacher / Incharge)' },
            { name: 'student_leaves:manage', resource: 'student_leaves', action: 'manage', description: 'Full institutional management of student leaves' },
        ];

        for (const p of perms) {
            await Permission.findOrCreate({
                where: { name: p.name },
                defaults: p,
            });
        }
        logger.info('✓ student_leaves permissions created.');

        // 3. Attach permissions to Roles
        // Students & Parents get read + create
        const studentRole = await Role.findOne({ where: { name: 'student' } });
        if (studentRole) {
            const studentPerms = await Permission.findAll({
                where: { name: ['student_leaves:read', 'student_leaves:create'] },
            });
            await studentRole.addPermissions(studentPerms);
            logger.info('✓ Student role granted student_leaves:read and create.');
        }

        // Teachers & HOD get read + action
        const teacherRole = await Role.findOne({ where: { name: 'teacher' } });
        if (teacherRole) {
            const teacherPerms = await Permission.findAll({
                where: { name: ['student_leaves:read', 'student_leaves:action'] },
            });
            await teacherRole.addPermissions(teacherPerms);
            logger.info('✓ Teacher role granted student_leaves:read and action.');
        }

        // Admins get manage + read + action + create
        const adminRoles = await Role.findAll({
            where: { name: ['admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN', 'principal', 'PRINCIPAL'] },
        });
        const allStudentLeavePerms = await Permission.findAll({
            where: { resource: 'student_leaves' },
        });
        for (const ar of adminRoles) {
            await ar.addPermissions(allStudentLeavePerms);
        }
        logger.info('✓ Admin roles granted all student_leaves permissions.');

        process.exit(0);
    } catch (err) {
        logger.error('Failed to seed student leave system:', err);
        process.exit(1);
    }
})();
