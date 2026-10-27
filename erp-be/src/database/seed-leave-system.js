import 'dotenv/config';

import db from '../models/index.js';
const { sequelize, Permission, Role, LeaveType } = db;
import logger from '../utils/logger.js';

(async () => {
    try {
        await sequelize.authenticate();
        logger.info('Connected to DB to seed leave tables & permissions.');

        // Sync leave tables if they don't exist
        await db.LeaveType.sync();
        await db.TeacherLeaveBalance.sync();
        await db.TeacherLeaveRequest.sync();
        await db.LeaveRule.sync();
        logger.info('✓ Leave tables and rules synchronized successfully.');

        // 1. Seed Default Leave Types
        const defaultLeaveTypes = [
            {
                code: 'CL',
                name: 'Casual Leave',
                description: 'Paid casual leave for personal or routine matters',
                isPaid: true,
                defaultDaysPerYear: 12.0,
                maxConsecutiveDays: 3,
                requiresAttachment: false,
                isActive: true,
            },
            {
                code: 'SL',
                name: 'Sick Leave',
                description: 'Paid medical leave for illness or healthcare',
                isPaid: true,
                defaultDaysPerYear: 10.0,
                maxConsecutiveDays: 7,
                requiresAttachment: true,
                isActive: true,
            },
            {
                code: 'EL',
                name: 'Earned Leave',
                description: 'Privilege / earned leave accrued on academic service',
                isPaid: true,
                defaultDaysPerYear: 15.0,
                maxConsecutiveDays: 14,
                requiresAttachment: false,
                isActive: true,
            },
            {
                code: 'ML',
                name: 'Maternity Leave',
                description: 'Paid maternity leave for female faculty as per statutory norms',
                isPaid: true,
                defaultDaysPerYear: 90.0,
                maxConsecutiveDays: 90,
                requiresAttachment: true,
                isActive: true,
            },
            {
                code: 'LWP',
                name: 'Leave Without Pay',
                description: 'Unpaid leave impacting monthly payroll deductions',
                isPaid: false,
                defaultDaysPerYear: 30.0,
                maxConsecutiveDays: 30,
                requiresAttachment: false,
                isActive: true,
            },
        ];

        for (const lt of defaultLeaveTypes) {
            await LeaveType.findOrCreate({
                where: { code: lt.code },
                defaults: lt,
            });
        }
        logger.info('✓ Default leave types seeded.');

        // Seed default LeaveRule for current academic year if none exists
        const currentYear = await db.AcademicYear.findOne({ where: { isCurrent: true } }) || await db.AcademicYear.findOne();
        if (currentYear) {
            const adminUser = await db.User.findOne();
            await db.LeaveRule.findOrCreate({
                where: { academicYearId: currentYear.id, isActive: true },
                defaults: {
                    academicYearId: currentYear.id,
                    ruleName: 'Default Teacher Leave Policy',
                    casualLeaveCount: 12.0,
                    sickLeaveCount: 10.0,
                    earnedLeaveCount: 15.0,
                    maternityLeaveCount: 90.0,
                    leaveWithoutPayCount: 30.0,
                    isActive: true,
                    createdBy: adminUser?.id || null,
                    createdByName: adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'System Admin',
                },
            });
            logger.info('✓ Default LeaveRule initialized.');
        }

        // 2. Seed Leave Permissions & Rule Permissions
        const permissions = [
            { name: 'teacher_leaves:read', resource: 'teacher_leaves', action: 'read', description: 'Can view teacher leave requests and balances' },
            { name: 'teacher_leaves:create', resource: 'teacher_leaves', action: 'create', description: 'Can submit leave applications (Apply)' },
            { name: 'teacher_leaves:update', resource: 'teacher_leaves', action: 'update', description: 'Can approve or reject leave applications (Action)' },
            { name: 'teacher_leaves:delete', resource: 'teacher_leaves', action: 'delete', description: 'Can cancel leave applications' },
            { name: 'teacher_leaves:manage', resource: 'teacher_leaves', action: 'manage', description: 'Full access to teacher leaves and balance manipulation' },
            { name: 'leave_types:read', resource: 'leave_types', action: 'read', description: 'Can view leave types' },
            { name: 'leave_types:manage', resource: 'leave_types', action: 'manage', description: 'Can configure leave types' },
            { name: 'leave_rules:read', resource: 'leave_rules', action: 'read', description: 'Can view leave policy rules' },
            { name: 'leave_rules:create', resource: 'leave_rules', action: 'create', description: 'Can create leave policy rules' },
            { name: 'leave_rules:update', resource: 'leave_rules', action: 'update', description: 'Can update leave policy rules' },
            { name: 'leave_rules:manage', resource: 'leave_rules', action: 'manage', description: 'Full access to leave rules policy' },
        ];

        for (const p of permissions) {
            await Permission.findOrCreate({
                where: { name: p.name },
                defaults: p,
            });
        }
        logger.info('✓ Leave permissions seeded.');

        // 3. Attach Permissions to Roles
        // ADMIN / SUPER_ADMIN get all
        const adminRoles = await Role.findAll({
            where: {
                name: ['admin', 'super_admin', 'hr', 'principal', 'ADMIN', 'SUPER_ADMIN', 'HR', 'PRINCIPAL']
            }
        });

        const allLeavePerms = await Permission.findAll({
            where: {
                resource: ['teacher_leaves', 'leave_types', 'leave_rules']
            }
        });

        for (const r of adminRoles) {
            await r.addPermissions(allLeavePerms);
            logger.info(`✓ Attached full leave and rule permissions to ${r.name} role.`);
        }

        // TEACHER gets read, apply (create), delete (cancel own) & leave_types:read
        const teacherRoles = await Role.findAll({ where: { name: ['teacher', 'TEACHER'] } });
        for (const teacherRole of teacherRoles) {
            const teacherPerms = await Permission.findAll({
                where: {
                    resource: ['teacher_leaves', 'leave_types'],
                    action: ['read', 'create', 'delete']
                }
            });
            await teacherRole.addPermissions(teacherPerms);
            logger.info(`✓ Attached teacher leave permissions to ${teacherRole.name} role.`);
        }

        logger.info('🎉 All leave tables, rules, types, and permissions ready!');
        process.exit(0);
    } catch (err) {
        logger.error('Error seeding leave system:', err);
        process.exit(1);
    }
})();
