import 'dotenv/config';
import db from '../models/index.js';
const { sequelize, Role, Permission, User } = db;
import logger from '../utils/logger.js';

// ─── All permissions ──────────────────────────────────────────────────────────
const PERMISSIONS = [
    { name: 'users:read', resource: 'users', action: 'read', description: 'View users' },
    { name: 'users:create', resource: 'users', action: 'create', description: 'Create users' },
    { name: 'users:update', resource: 'users', action: 'update', description: 'Update users' },
    { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },
    { name: 'users:manage', resource: 'users', action: 'manage', description: 'Full user management' },
    { name: 'students:read', resource: 'students', action: 'read', description: 'View students' },
    { name: 'students:create', resource: 'students', action: 'create', description: 'Create students' },
    { name: 'students:update', resource: 'students', action: 'update', description: 'Update students' },
    { name: 'students:delete', resource: 'students', action: 'delete', description: 'Delete students' },
    { name: 'students:manage', resource: 'students', action: 'manage', description: 'Full student management' },
    { name: 'teachers:read', resource: 'teachers', action: 'read', description: 'View teachers' },
    { name: 'teachers:create', resource: 'teachers', action: 'create', description: 'Create teachers' },
    { name: 'teachers:update', resource: 'teachers', action: 'update', description: 'Update teachers' },
    { name: 'teachers:delete', resource: 'teachers', action: 'delete', description: 'Delete teachers' },
    { name: 'teachers:manage', resource: 'teachers', action: 'manage', description: 'Full teacher management' },
    { name: 'classrooms:read', resource: 'classrooms', action: 'read', description: 'View classrooms' },
    { name: 'classrooms:create', resource: 'classrooms', action: 'create', description: 'Create classrooms' },
    { name: 'classrooms:update', resource: 'classrooms', action: 'update', description: 'Update classrooms' },
    { name: 'classrooms:delete', resource: 'classrooms', action: 'delete', description: 'Delete classrooms' },
    { name: 'classrooms:manage', resource: 'classrooms', action: 'manage', description: 'Full classroom management' },
    { name: 'subjects:read', resource: 'subjects', action: 'read', description: 'View subjects' },
    { name: 'subjects:create', resource: 'subjects', action: 'create', description: 'Create subjects' },
    { name: 'subjects:update', resource: 'subjects', action: 'update', description: 'Update subjects' },
    { name: 'subjects:delete', resource: 'subjects', action: 'delete', description: 'Delete subjects' },
    { name: 'subjects:manage', resource: 'subjects', action: 'manage', description: 'Full subject management' },
    { name: 'departments:read', resource: 'departments', action: 'read', description: 'View departments' },
    { name: 'departments:create', resource: 'departments', action: 'create', description: 'Create departments' },
    { name: 'departments:update', resource: 'departments', action: 'update', description: 'Update departments' },
    { name: 'departments:delete', resource: 'departments', action: 'delete', description: 'Delete departments' },
    { name: 'departments:manage', resource: 'departments', action: 'manage', description: 'Full department management' },
    { name: 'attendance:read', resource: 'attendance', action: 'read', description: 'View attendance' },
    { name: 'attendance:create', resource: 'attendance', action: 'create', description: 'Create attendance' },
    { name: 'attendance:update', resource: 'attendance', action: 'update', description: 'Update attendance' },
    { name: 'attendance:manage', resource: 'attendance', action: 'manage', description: 'Manage attendance' },
    { name: 'homework:read', resource: 'homework', action: 'read', description: 'View homework assignments' },
    { name: 'homework:create', resource: 'homework', action: 'create', description: 'Create homework assignments' },
    { name: 'homework:update', resource: 'homework', action: 'update', description: 'Update homework assignments' },
    { name: 'homework:delete', resource: 'homework', action: 'delete', description: 'Delete homework assignments' },
    { name: 'exams:read', resource: 'exams', action: 'read', description: 'View exams and grades' },
    { name: 'exams:create', resource: 'exams', action: 'create', description: 'Create exams' },
    { name: 'exams:update', resource: 'exams', action: 'update', description: 'Update exams' },
    { name: 'exams:manage', resource: 'exams', action: 'manage', description: 'Manage exams and grades' },
    { name: 'salary:read', resource: 'salary', action: 'read', description: 'View salary' },
    { name: 'salary:manage', resource: 'salary', action: 'manage', description: 'Manage salary' },
    { name: 'roles:read', resource: 'roles', action: 'read', description: 'View roles' },
    { name: 'roles:manage', resource: 'roles', action: 'manage', description: 'Manage roles' },
    { name: 'permissions:read', resource: 'permissions', action: 'read', description: 'View permissions' },
    { name: 'permissions:manage', resource: 'permissions', action: 'manage', description: 'Manage permissions' },
    { name: 'events:read', resource: 'events', action: 'read', description: 'View events' },
    { name: 'events:create', resource: 'events', action: 'create', description: 'Create events' },
    { name: 'events:update', resource: 'events', action: 'update', description: 'Update events' },
    { name: 'events:delete', resource: 'events', action: 'delete', description: 'Delete events' },
    { name: 'events:manage', resource: 'events', action: 'manage', description: 'Full event management' },
    // Leave Management Permissions
    { name: 'teacher_leaves:read', resource: 'teacher_leaves', action: 'read', description: 'View teacher leaves & balances' },
    { name: 'teacher_leaves:create', resource: 'teacher_leaves', action: 'create', description: 'Apply for teacher leave' },
    { name: 'teacher_leaves:update', resource: 'teacher_leaves', action: 'update', description: 'Approve or reject teacher leave' },
    { name: 'teacher_leaves:delete', resource: 'teacher_leaves', action: 'delete', description: 'Cancel own teacher leave' },
    { name: 'teacher_leaves:manage', resource: 'teacher_leaves', action: 'manage', description: 'Full management of teacher leaves' },
    { name: 'leave_types:read', resource: 'leave_types', action: 'read', description: 'View leave types' },
    { name: 'leave_types:manage', resource: 'leave_types', action: 'manage', description: 'Manage leave types' },
    { name: 'leave_rules:read', resource: 'leave_rules', action: 'read', description: 'View leave policy rules' },
    { name: 'leave_rules:create', resource: 'leave_rules', action: 'create', description: 'Create leave policy rules' },
    { name: 'leave_rules:update', resource: 'leave_rules', action: 'update', description: 'Update leave policy rules' },
    { name: 'leave_rules:manage', resource: 'leave_rules', action: 'manage', description: 'Manage leave policy rules' },
    { name: 'student_leaves:read', resource: 'student_leaves', action: 'read', description: 'View student leaves' },
    { name: 'student_leaves:create', resource: 'student_leaves', action: 'create', description: 'Apply for student leave' },
    { name: 'student_leaves:update', resource: 'student_leaves', action: 'update', description: 'Approve or reject student leave' },
    { name: 'student_leaves:manage', resource: 'student_leaves', action: 'manage', description: 'Manage student leaves' },
    // Fee Management Permissions
    { name: 'fees:read', resource: 'fees', action: 'read', description: 'View fees, invoices and ledgers' },
    { name: 'fees:create', resource: 'fees', action: 'create', description: 'Issue fee invoices' },
    { name: 'fees:update', resource: 'fees', action: 'update', description: 'Modify fee invoices or structures' },
    { name: 'fees:delete', resource: 'fees', action: 'delete', description: 'Cancel fee invoices or heads' },
    { name: 'fees:collect', resource: 'fees', action: 'collect', description: 'Collect and record fee payments' },
    { name: 'fees:adjust', resource: 'fees', action: 'adjust', description: 'Payment reversal, fine waiver, and policy exception' },
    { name: 'fees:refund', resource: 'fees', action: 'refund', description: 'Request, approve and disburse fee refunds' },
    { name: 'fees:manage', resource: 'fees', action: 'manage', description: 'Full fee management & masters' },
    { name: 'all:manage', resource: 'all', action: 'manage', description: 'Full system access' },
];

// ─── Role → permission mapping ────────────────────────────────────────────────
const ROLES = [
    {
        name: 'super_admin',
        description: 'Full system access',
        permissions: ['all:manage'],
    },
    {
        name: 'admin',
        description: 'Administrative access',
        permissions: [
            'users:manage', 'students:manage', 'teachers:manage',
            'classrooms:manage', 'subjects:manage', 'departments:manage',
            'attendance:manage', 'salary:manage', 'salary:read', 'homework:create', 'homework:read', 'homework:update', 'homework:delete',
            'exams:manage', 'roles:manage', 'permissions:manage', 'events:manage',
            'teacher_leaves:manage', 'teacher_leaves:read', 'teacher_leaves:update',
            'leave_types:manage', 'leave_types:read', 'leave_rules:manage', 'leave_rules:read',
            'student_leaves:manage', 'student_leaves:read', 'student_leaves:update',
            'fees:manage', 'fees:read', 'fees:create', 'fees:update', 'fees:delete', 'fees:collect', 'fees:adjust', 'fees:refund',
        ],
    },
    {
        name: 'teacher',
        description: 'Teacher access',
        permissions: [
            'students:read', 'teachers:read', 'users:read', 'classrooms:read',
            'subjects:read', 'departments:read', 'events:read', 'events:create', 'events:update',
            'homework:read', 'homework:create', 'homework:update', 'homework:delete',
            'exams:read', 'attendance:read', 'attendance:create', 'attendance:update',
            'teacher_leaves:read', 'teacher_leaves:create', 'teacher_leaves:delete',
            'leave_types:read', 'student_leaves:read', 'student_leaves:update',
            'salary:read',
        ],
    },
    {
        name: 'student',
        description: 'Student access',
        permissions: [
            'students:read', 'classrooms:read', 'subjects:read', 'events:read',
            'homework:read', 'exams:read', 'attendance:read',
            'student_leaves:read', 'student_leaves:create',
            'fees:read',
        ],
    },
];

// ─── Default super-admin account ─────────────────────────────────────────────
const ADMIN_USER = {
    userId: 'ERP-00001',
    email: 'admin@erp.local',
    password: 'Admin@1234!',
    firstName: 'System',
    lastName: 'Admin',
    isActive: true,
};

// ─── Runner ───────────────────────────────────────────────────────────────────
(async () => {
    try {
        await sequelize.authenticate();
        logger.info('Connected to Neon DB.');

        // 1. Upsert permissions
        for (const p of PERMISSIONS) {
            await Permission.findOrCreate({ where: { name: p.name }, defaults: p });
        }
        logger.info(`✓ ${PERMISSIONS.length} permissions seeded.`);

        // 2. Upsert roles and assign permissions
        for (const roleDef of ROLES) {
            const [role] = await Role.findOrCreate({
                where: { name: roleDef.name },
                defaults: { name: roleDef.name, description: roleDef.description },
            });

            const perms = await Permission.findAll({ where: { name: roleDef.permissions } });
            await role.setPermissions(perms);
            logger.info(`  role "${roleDef.name}" → ${perms.length} permissions`);
        }
        logger.info(`✓ ${ROLES.length} roles seeded.`);

        // 3. Upsert super-admin user
        const [adminUser, created] = await User.findOrCreate({
            where: { userId: ADMIN_USER.userId },
            defaults: ADMIN_USER,
        });

        if (created) {
            const superAdminRole = await Role.findOne({ where: { name: 'super_admin' } });
            if (superAdminRole) await adminUser.addRole(superAdminRole);
            logger.info(`✓ Admin user created — login: ${ADMIN_USER.userId} / ${ADMIN_USER.password}`);
        } else {
            // Ensure role is still attached even if user was created manually
            const superAdminRole = await Role.findOne({ where: { name: 'super_admin' } });
            if (superAdminRole) {
                const roles = await adminUser.getRoles();
                if (!roles.find((r) => r.name === 'super_admin')) {
                    await adminUser.addRole(superAdminRole);
                    logger.info('  super_admin role re-attached to existing admin user.');
                }
            }
            logger.info(`✓ Admin user already exists: ${ADMIN_USER.userId}`);
        }

        // 4. Seed Default Leave Types
        if (db.LeaveType) {
            const defaultLeaveTypes = [
                { code: 'CL', name: 'Casual Leave', description: 'Paid casual leave for personal or routine matters', isPaid: true, defaultDaysPerYear: 12.0, maxConsecutiveDays: 3, requiresAttachment: false, isActive: true },
                { code: 'SL', name: 'Sick Leave', description: 'Paid medical leave for illness or healthcare', isPaid: true, defaultDaysPerYear: 10.0, maxConsecutiveDays: 7, requiresAttachment: true, isActive: true },
                { code: 'EL', name: 'Earned Leave', description: 'Privilege / earned leave accrued on academic service', isPaid: true, defaultDaysPerYear: 15.0, maxConsecutiveDays: 14, requiresAttachment: false, isActive: true },
                { code: 'ML', name: 'Maternity Leave', description: 'Paid maternity leave for female faculty', isPaid: true, defaultDaysPerYear: 90.0, maxConsecutiveDays: 90, requiresAttachment: true, isActive: true },
                { code: 'LWP', name: 'Leave Without Pay', description: 'Unpaid leave impacting monthly payroll deductions', isPaid: false, defaultDaysPerYear: 30.0, maxConsecutiveDays: 30, requiresAttachment: false, isActive: true },
            ];
            for (const lt of defaultLeaveTypes) {
                await db.LeaveType.findOrCreate({ where: { code: lt.code }, defaults: lt });
            }
            logger.info('✓ Default leave types seeded.');
        }

        // 5. Seed Event Types
        if (db.EventType) {
            const eventTypes = [
                { name: 'Academic', code: 'ACADEMIC', is_leave_day: false },
                { name: 'Exam', code: 'EXAM', is_leave_day: false },
                { name: 'Assessment', code: 'ASSESSMENT', is_leave_day: false },
                { name: 'Event', code: 'EVENT', is_leave_day: false },
                { name: 'Holiday', code: 'HOLIDAY', is_leave_day: true },
                { name: 'Sports', code: 'SPORTS', is_leave_day: false },
                { name: 'Cultural', code: 'CULTURAL', is_leave_day: false },
                { name: 'Festival / National', code: 'FESTIVAL', is_leave_day: true },
                { name: 'Parent Meeting', code: 'PARENT_MEETING', is_leave_day: false },
                { name: 'Staff Meeting', code: 'STAFF_MEETING', is_leave_day: false },
                { name: 'Other', code: 'OTHER', is_leave_day: false },
            ];
            for (const et of eventTypes) {
                await db.EventType.findOrCreate({ where: { code: et.code }, defaults: et });
            }
            logger.info('✓ Event types seeded.');
        }

        // 6. Seed Default Fee Heads
        if (db.FeeHead) {
            const defaultFeeHeads = [
                { code: 'TUITION', name: 'Tuition Fee', description: 'Core academic and instructional tuition', category: 'TUITION', isOptional: false, isRefundable: false, isActive: true },
                { code: 'ADMISSION', name: 'Admission & Registration', description: 'One-time admission and registration charge', category: 'ADMISSION', isOptional: false, isRefundable: false, isActive: true },
                { code: 'EXAM', name: 'Examination & Assessment', description: 'Term/semester assessments, question papers and gradecards', category: 'EXAM', isOptional: false, isRefundable: false, isActive: true },
                { code: 'LAB', name: 'Laboratory & Practical', description: 'Science, robotics and computer lab consumable fees', category: 'LAB', isOptional: false, isRefundable: false, isActive: true },
                { code: 'TRANSPORT', name: 'Bus & Transport Fee', description: 'Optional school bus/van transit service fee', category: 'TRANSPORT', isOptional: true, isRefundable: false, isActive: true },
                { code: 'ACTIVITY', name: 'Sports & Co-Curricular', description: 'Annual sports day, arts, cultural clubs and field activities', category: 'ACTIVITY', isOptional: false, isRefundable: false, isActive: true },
                { code: 'LIBRARY', name: 'Library & E-Resources', description: 'Library deposit, access and digital resource access', category: 'LIBRARY', isOptional: false, isRefundable: false, isActive: true },
            ];
            for (const fh of defaultFeeHeads) {
                await db.FeeHead.findOrCreate({ where: { code: fh.code }, defaults: fh });
            }
            logger.info('✓ Default fee heads seeded.');
        }

        logger.info('Seeding complete.');
        process.exit(0);
    } catch (err) {
        logger.error('Seed failed:', err);
        process.exit(1);
    }
})();
