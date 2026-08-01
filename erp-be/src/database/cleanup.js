'use strict';
require('dotenv').config();
const { sequelize } = require('../models');

(async () => {
    try {
        await sequelize.authenticate();

        // Drop the tables that had broken ENUM columns — they'll be recreated clean
        await sequelize.query('DROP TABLE IF EXISTS teacher_attendance CASCADE;');
        console.log('Dropped teacher_attendance');

        await sequelize.query('DROP TABLE IF EXISTS salary_slips CASCADE;');
        console.log('Dropped salary_slips');

        // Drop stale ENUM types if they exist
        const staleTypes = [
            'enum_teacher_attendance_status',
            'enum_teacher_attendance_leave_type',
            'enum_teacher_attendance_source',
            'enum_salary_slips_salary_type',
            'enum_salary_slips_payment_status',
        ];
        for (const t of staleTypes) {
            await sequelize.query(`DROP TYPE IF EXISTS "public"."${t}" CASCADE;`);
        }
        console.log('Stale ENUM types cleaned.');

        process.exit(0);
    } catch (err) {
        console.error('Cleanup error:', err.message);
        process.exit(1);
    }
})();
