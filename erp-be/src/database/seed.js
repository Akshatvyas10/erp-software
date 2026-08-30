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
    { name: 'attendance:manage', resource: 'attendance', action: 'manage', description: 'Manage attendance' },
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
            'attendance:manage', 'salary:manage',
            'roles:manage', 'permissions:manage', 'events:manage',
        ],
    },
    {
        name: 'teacher',
        description: 'Teacher access',
        permissions: ['students:read', 'teachers:read', 'users:read', 'classrooms:read', 'subjects:read', 'departments:read', 'events:read', 'events:create', 'events:update'],
    },
    {
        name: 'student',
        description: 'Student access',
        permissions: ['students:read', 'classrooms:read', 'subjects:read', 'events:read'],
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

        logger.info('Seeding complete.');
        process.exit(0);
    } catch (err) {
        logger.error('Seed failed:', err);
        process.exit(1);
    }
})();
