import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import db from '../models/index.js';
const {
    sequelize, Role, Permission, User,
    Student, Teacher, TeacherAttendance, SalarySlip, Department,
    Classroom, ClassroomStudent, ClassroomSubject, Timetable, Subject,
    Homework, HomeworkSubmission,
} = db;
import logger from '../utils/logger.js';

(async () => {
    try {
        await sequelize.authenticate();
        logger.info('Neon DB connection established.');

        await sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
        logger.info('pgcrypto extension ready.');

        // ── Sync in FK-dependency order ──────────────────────────────────────────
        await Role.sync({ force: false, alter: true });
        logger.info('✓ roles');

        await Permission.sync({ force: false, alter: true });
        logger.info('✓ permissions');

        await sequelize.model('role_permissions').sync({ force: false, alter: true });
        logger.info('✓ role_permissions');

        await User.sync({ force: false, alter: true });
        logger.info('✓ users');

        await sequelize.model('user_roles').sync({ force: false, alter: true });
        logger.info('✓ user_roles');

        await Student.sync({ force: false, alter: true });
        logger.info('✓ students');

        await Teacher.sync({ force: false, alter: true });
        logger.info('✓ teachers  (incl. new salary/attendance columns)');

        await TeacherAttendance.sync({ force: false, alter: true });
        logger.info('✓ teacher_attendance');

        await SalarySlip.sync({ force: false, alter: true });
        logger.info('✓ salary_slips');

        await Department.sync({ force: false, alter: true });
        logger.info('✓ departments');

        await Classroom.sync({ force: false, alter: true });
        logger.info('✓ classrooms');

        await ClassroomStudent.sync({ force: false, alter: true });
        logger.info('✓ classroom_students');

        await Subject.sync({ force: false, alter: true });
        logger.info('✓ subjects');

        await ClassroomSubject.sync({ force: false, alter: true });
        logger.info('✓ classroom_subjects');

        await Timetable.sync({ force: false, alter: true });
        logger.info('✓ timetables');

        await Homework.sync({ force: false, alter: true });
        logger.info('✓ homeworks');

        await HomeworkSubmission.sync({ force: false, alter: true });
        logger.info('✓ homework_submissions');

        logger.info('All tables synchronized with Neon DB.');
        process.exit(0);
    } catch (err) {
        logger.error('Migration failed:', err);
        process.exit(1);
    }
})();
