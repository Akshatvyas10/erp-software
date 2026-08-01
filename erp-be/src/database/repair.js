'use strict';

require('dotenv').config();
const { sequelize } = require('../models');

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected.');

        // 1. Restore any soft-deleted permissions
        const [restored] = await sequelize.query(
            "UPDATE permissions SET deleted_at = NULL, updated_at = NOW() WHERE deleted_at IS NOT NULL RETURNING id, name"
        );
        if (restored.length) {
            console.log('Restored permissions:', restored.map((r) => r.name).join(', '));
        } else {
            console.log('No soft-deleted permissions found.');
        }

        // 2. Get all live permissions and super_admin role
        const [perms] = await sequelize.query(
            "SELECT id FROM permissions WHERE deleted_at IS NULL"
        );
        const [roles] = await sequelize.query(
            "SELECT id FROM roles WHERE name = 'super_admin'"
        );

        if (!roles.length) {
            console.error('super_admin role not found!');
            process.exit(1);
        }

        const roleId = roles[0].id;

        // 3. Wipe and re-assign ALL permissions to super_admin
        await sequelize.query(
            `DELETE FROM role_permissions WHERE role_id = ${roleId}`
        );
        for (const p of perms) {
            await sequelize.query(
                `INSERT INTO role_permissions (role_id, permission_id) VALUES (${roleId}, ${p.id}) ON CONFLICT DO NOTHING`
            );
        }

        console.log(`All ${perms.length} permissions assigned to super_admin (role_id: ${roleId}).`);

        // 4. Show final state
        const [final] = await sequelize.query(
            "SELECT id, name, deleted_at FROM permissions ORDER BY id"
        );
        console.log('\nFinal permissions table:');
        final.forEach((r) =>
            console.log(`  ${r.id.toString().padStart(2)} | ${r.name.padEnd(25)} | ${r.deleted_at ? 'DELETED' : 'OK'}`)
        );

        process.exit(0);
    } catch (err) {
        console.error('Repair failed:', err.message);
        process.exit(1);
    }
})();
