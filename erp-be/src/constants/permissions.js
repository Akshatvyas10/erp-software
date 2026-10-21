'use strict';

/**
 * Centralized Permission Constants (Single Source of Truth)
 * Matches frontend permissions.ts exactly.
 */
export const PERMISSIONS = Object.freeze({
    // Classroom & Academic Classes
    CLASSROOMS_READ: 'classrooms:read',
    CLASSROOMS_CREATE: 'classrooms:create',
    CLASSROOMS_UPDATE: 'classrooms:update',
    CLASSROOMS_DELETE: 'classrooms:delete',
    CLASSROOMS_MANAGE: 'classrooms:manage',

    // Students & Rosters
    STUDENTS_READ: 'students:read',
    STUDENTS_CREATE: 'students:create',
    STUDENTS_UPDATE: 'students:update',
    STUDENTS_DELETE: 'students:delete',
    STUDENTS_MANAGE: 'students:manage',

    // Homework & Assignments
    HOMEWORK_READ: 'homework:read',
    HOMEWORK_CREATE: 'homework:create',
    HOMEWORK_UPDATE: 'homework:update',
    HOMEWORK_DELETE: 'homework:delete',

    // Examinations & Gradebook
    EXAMS_READ: 'exams:read',
    EXAMS_CREATE: 'exams:create',
    EXAMS_UPDATE: 'exams:update',
    EXAMS_MANAGE: 'exams:manage',

    // Daily Attendance
    ATTENDANCE_READ: 'attendance:read',
    ATTENDANCE_CREATE: 'attendance:create',
    ATTENDANCE_UPDATE: 'attendance:update',
    ATTENDANCE_MANAGE: 'attendance:manage',

    // Academic Departments
    DEPARTMENTS_READ: 'departments:read',
    DEPARTMENTS_CREATE: 'departments:create',
    DEPARTMENTS_UPDATE: 'departments:update',
    DEPARTMENTS_DELETE: 'departments:delete',
    DEPARTMENTS_MANAGE: 'departments:manage',

    // Faculty & Teachers
    TEACHERS_READ: 'teachers:read',
    TEACHERS_CREATE: 'teachers:create',
    TEACHERS_UPDATE: 'teachers:update',
    TEACHERS_DELETE: 'teachers:delete',
    TEACHERS_MANAGE: 'teachers:manage',

    // Universal Admin
    ALL_MANAGE: 'all:manage',
});

export default PERMISSIONS;
