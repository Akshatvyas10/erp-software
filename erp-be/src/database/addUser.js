'use strict';

require('dotenv').config();
const { sequelize, User, Role, Permission } = require('../models');
const logger = require('../utils/logger');

(async () => {
    try {
        await sequelize.authenticate();
        logger.info('Connected to Neon DB.');

        // 1. Ensure all permissions exist (upsert)
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
            { name: 'roles:read', resource: 'roles', action: 'read', description: 'View roles' },
            { name: 'roles:manage', resource: 'roles', action: 'manage', description: 'Manage roles' },
            { name: 'permissions:read', resource: 'permissions', action: 'read', description: 'View permissions' },
            { name: 'permissions:manage', resource: 'permissions', action: 'manage', description: 'Manage permissions' },
            { name: 'all:manage', resource: 'all', action: 'manage', description: 'Full system access' },
        ];

        for (const p of PERMISSIONS) {
            await Permission.findOrCreate({ where: { name: p.name }, defaults: p });
        }
        logger.info(`✓ ${PERMISSIONS.length} permissions verified/seeded.`);

        // 2. Ensure super_admin role exists
        const [superAdminRole] = await Role.findOrCreate({
            where: { name: 'super_admin' },
            defaults: { name: 'super_admin', description: 'Full system access', isActive: true },
        });

        // 3. Assign ALL permissions to super_admin role
        const allPermissions = await Permission.findAll();
        await superAdminRole.setPermissions(allPermissions);
        logger.info(`✓ All ${allPermissions.length} permissions assigned to super_admin role.`);

        // 4. Create the user (password will be bcrypt-hashed by the model beforeCreate hook)
        const [akshat, created] = await User.findOrCreate({
            where: { userId: 'AkshatAdmin' },
            defaults: {
                userId: 'AkshatAdmin',
                email: 'akshatmanojvyas@gmail.com',
                password: 'Test@123',       // hashed automatically by User model hook
                firstName: 'Akshat',
                lastName: 'Vyas',
                isActive: true,
            },
        });

        if (created) {
            logger.info(`✓ User created: AkshatAdmin (${akshat.id})`);
        } else {
            logger.info(`  User already exists: AkshatAdmin — skipping create.`);
        }

        // 5. Assign super_admin role to this user
        const existingRoles = await akshat.getRoles();
        const alreadyHasRole = existingRoles.some((r) => r.name === 'super_admin');

        if (!alreadyHasRole) {
            await akshat.addRole(superAdminRole);
            logger.info(`✓ super_admin role assigned to AkshatAdmin.`);
        } else {
            logger.info(`  AkshatAdmin already has super_admin role.`);
        }

        // 6. Print summary
        const finalUser = await User.findOne({
            where: { userId: 'AkshatAdmin' },
            attributes: ['id', 'userId', 'email', 'firstName', 'lastName', 'isActive'],
        });
        const finalRoles = await akshat.getRoles();
        const finalPerms = await superAdminRole.getPermissions();

        logger.info('─────────────────────────────────────────');
        logger.info(`User ID  : ${finalUser.id}`);
        logger.info(`userId   : ${finalUser.userId}`);
        logger.info(`Email    : ${finalUser.email}`);
        logger.info(`Name     : ${finalUser.firstName} ${finalUser.lastName}`);
        logger.info(`Roles    : ${finalRoles.map(r => r.name).join(', ')}`);
        logger.info(`Role perms: ${finalPerms.length} permissions on super_admin`);
        logger.info('Password : [bcrypt hashed in DB]');
        logger.info('─────────────────────────────────────────');
        logger.info('Done.');

        process.exit(0);
    } catch (err) {
        logger.error('Failed:', err);
        process.exit(1);
    }
})();
