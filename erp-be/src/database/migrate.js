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
    Classroom, ClassroomStudent, ClassroomPeriod, ClassroomSubject, Timetable, Subject,
    Homework, HomeworkSubmission, CalendarEvent, EventType, StudentAttendance, PermissionAuditLog, ExamSchedule, Exam, ExamResult,
    AdmissionForm, AdmissionApplication
} = db;
import logger from '../utils/logger.js';

(async () => {
    try {
        await sequelize.authenticate();
        logger.info('Neon DB connection established.');

        await sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
        logger.info('pgcrypto extension ready.');

        await sequelize.query('CREATE SEQUENCE IF NOT EXISTS student_adm_seq START 1;');
        await sequelize.query('CREATE SEQUENCE IF NOT EXISTS erp_student_id_seq START 1;');
        await sequelize.query('CREATE SEQUENCE IF NOT EXISTS erp_user_id_seq START 2;');
        logger.info('Global ID sequences ready.');

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

        await CalendarEvent.sync({ force: false, alter: true });
        logger.info('✓ calendar_events');

        await StudentAttendance.sync({ force: false, alter: true });
        logger.info('✓ student_attendance');

        await ClassroomPeriod.sync({ force: false, alter: true });
        logger.info('✓ classroom_periods');

        await EventType.sync({ force: false, alter: true });
        logger.info('✓ event_types');

        await PermissionAuditLog.sync({ force: false, alter: true });
        logger.info('✓ permission_audit_log');

        await ExamSchedule.sync({ force: false, alter: true });
        logger.info('✓ exam_schedules');

        await Exam.sync({ force: false, alter: true });
        logger.info('✓ exams');

        await ExamResult.sync({ force: false, alter: true });
        logger.info('✓ exam_results');

        await AdmissionForm.sync({ force: false, alter: true });
        logger.info('✓ admission_forms');

        await AdmissionApplication.sync({ force: false, alter: true });
        logger.info('✓ admission_applications');

        logger.info('All tables synchronized with Neon DB.');
        process.exit(0);
    } catch (err) {
        logger.error('Migration failed:', err);
        process.exit(1);
    }
})();
