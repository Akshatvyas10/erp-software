'use strict';
import db from '../models/index.js';
const { Classroom, ClassroomSubject, ClassroomStudent } = db;
import { error } from '../utils/apiResponse.js';

/**
 * Enforces Role-Based Access Control and ownership scope for Classroom endpoints.
 * 
 * Rules:
 * - Super Admin / Admin / Principal: Full unconstrained access.
 * - Class Teacher: Granted access to their assigned class section.
 * - Subject Teacher: Granted access to sections where they teach assigned subjects.
 * - Student: Granted read access only to their currently enrolled section.
 * - Non-assigned users: 403 Forbidden.
 */
export const enforceClassroomScope = async (req, res, next) => {
    try {
        const userRoles = (req.userRoles || []).map(r => String(r).toLowerCase());
        const isPrivileged = userRoles.some(r => ['super_admin', 'admin', 'principal'].includes(r));
        if (isPrivileged) {
            req.scopeContext = { isPrivileged: true, isClassTeacher: true, isSubjectTeacher: false };
            return next();
        }

        const classroomId = req.params.id || req.body.classroomId || req.query.classroomId;
        if (!classroomId) {
            return next();
        }

        // 1. Teacher Scoping
        if (userRoles.includes('teacher')) {
            const teacherId = req.user.teacherId;
            if (!teacherId) {
                return error(res, 'Teacher profile not linked to this user account', 403);
            }

            // Check if user is the Class Teacher of this classroom
            const isClassTeacher = await Classroom.count({
                where: { id: classroomId, classTeacherId: teacherId }
            });

            if (isClassTeacher > 0) {
                req.scopeContext = { isPrivileged: false, isClassTeacher: true, isSubjectTeacher: false };
                return next();
            }

            // Check if user is the Department Incharge (Head of Department) responsible for this classroom
            const section = await Classroom.findByPk(classroomId, {
                attributes: ['id', 'departmentId'],
                include: [{
                    model: db.AcademicClass,
                    as: 'academicClass',
                    attributes: ['id', 'departmentId']
                }]
            });
            const effectiveDeptId = section?.departmentId || section?.academicClass?.departmentId;
            if (effectiveDeptId) {
                const isDeptIncharge = await db.Department.count({
                    where: { id: effectiveDeptId, headId: teacherId }
                });
                if (isDeptIncharge > 0) {
                    req.scopeContext = { isPrivileged: false, isClassTeacher: true, isSubjectTeacher: false, isDepartmentIncharge: true };
                    return next();
                }
            }

            // Check if user is a Subject Teacher in this classroom
            const isSubjectTeacher = await ClassroomSubject.count({
                where: { classroomId, teacherId }
            });

            if (isSubjectTeacher > 0) {
                // Subject teachers have read access to roster/timetable/overview, but cannot mutate settings, rosters, or periods
                if (
                    req.method === 'DELETE' ||
                    (req.method === 'PUT' && !req.path.includes('/homework')) ||
                    (req.method === 'POST' && (req.path.includes('/students') || req.path.includes('/periods')))
                ) {
                    return error(res, 'Subject teachers cannot modify classroom settings, student rosters, or period structures', 403);
                }
                req.scopeContext = { isPrivileged: false, isClassTeacher: false, isSubjectTeacher: true };
                return next();
            }

            return error(res, 'Access Denied: You are not assigned to this classroom section', 403);
        }

        // 2. Student Scoping
        if (userRoles.includes('student')) {
            let studentId = req.user.studentId;
            if (!studentId) {
                const studentProfile = await db.Student.findOne({ where: { userId: req.user.id } });
                studentId = studentProfile?.id;
            }
            if (!studentId) {
                return error(res, 'Student profile not linked to this user account', 403);
            }

            // Students only have read operations
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
                return error(res, 'Students cannot modify classroom records', 403);
            }

            const isEnrolled = await ClassroomStudent.count({
                where: { classroomId, studentId }
            });

            if (isEnrolled > 0) {
                req.scopeContext = { isPrivileged: false, isStudent: true };
                return next();
            }

            return error(res, 'Access Denied: You are not enrolled in this section', 403);
        }

        // Default deny for unhandled roles
        return error(res, 'Unauthorized to access this classroom', 403);
    } catch (err) {
        next(err);
    }
};

export default enforceClassroomScope;
