'use strict';
import db from '../models/index.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { enqueueEmailJob } from '../queues/email.queue.js';

const {
    sequelize,
    StudentLeaveRequest,
    Student,
    Classroom,
    Department,
    AcademicYear,
    User,
    StudentAttendance
} = db;

/**
 * 1. Submit a student leave application (Student or Parent on behalf of Student)
 */
export const applyStudentLeave = async ({
    studentId,
    category,
    fromDate,
    toDate,
    totalDays,
    reason,
    attachmentUrl
}) => {
    // 1. Resolve student and active classroom
    const student = await Student.findByPk(studentId, {
        include: [
            {
                model: Classroom,
                as: 'classroom',
                include: [{ model: Department, as: 'departmentRef' }]
            }
        ]
    });

    if (!student) {
        throw new Error('Student profile not found.');
    }

    if (!student.classroomId) {
        throw new Error('Student is not enrolled in an active classroom section.');
    }

    // 2. Resolve active academic year
    const activeYear = await AcademicYear.findOne({ where: { isCurrent: true } }) || await AcademicYear.findOne();
    if (!activeYear) {
        throw new Error('No active academic year found in the system.');
    }

    // 3. Check for overlapping student leave requests
    const overlap = await StudentLeaveRequest.findOne({
        where: {
            studentId,
            status: { [Op.in]: ['PENDING', 'APPROVED'] },
            [Op.or]: [
                {
                    fromDate: { [Op.lte]: toDate },
                    toDate: { [Op.gte]: fromDate }
                }
            ]
        }
    });

    if (overlap) {
        throw new Error(`An existing ${overlap.status.toLowerCase()} leave application overlaps with the selected date range (${overlap.fromDate} to ${overlap.toDate}).`);
    }

    // 4. Create the leave request
    const request = await StudentLeaveRequest.create({
        studentId,
        classroomId: student.classroomId,
        departmentId: student.classroom?.departmentId || null,
        academicYearId: activeYear.id,
        category,
        fromDate,
        toDate,
        totalDays: Number(totalDays) || 1,
        reason,
        attachmentUrl: attachmentUrl || null,
        status: 'PENDING'
    });

    logger.info(`[Student Leave] Application ${request.id} created for student ${student.firstName} ${student.lastName}`);

    // Non-blocking notification dispatch
    enqueueEmailJob('STUDENT_LEAVE_APPLIED', {
        requestId: request.id,
        studentName: `${student.firstName} ${student.lastName}`,
        classroomName: student.classroom?.name || 'Class',
        fromDate,
        toDate,
        reason
    });

    return request;
};

/**
 * 2. Get student's own leave applications
 */
export const getStudentOwnLeaves = async (studentId) => {
    return await StudentLeaveRequest.findAll({
        where: { studentId },
        include: [
            { model: Classroom, as: 'classroom', attributes: ['id', 'name', 'section'] },
            { model: User, as: 'decider', attributes: ['id', 'firstName', 'lastName'] }
        ],
        order: [['created_at', 'DESC']]
    });
};

/**
 * 3. Get pending student leaves for review (scoped to Class Teacher or Department Incharge)
 */
export const getReviewableStudentLeaves = async ({ user, query = {} }) => {
    const isSuperAdmin = user.Roles?.some(r => ['super_admin', 'admin', 'SUPER_ADMIN', 'ADMIN'].includes(r.name));
    const teacherId = user.teacherId;

    let classroomWhere = {};
    const requestWhere = {};

    if (query.status) {
        requestWhere.status = query.status;
    }

    // Role-based scope resolution
    if (!isSuperAdmin) {
        if (!teacherId) {
            return []; // User has no teacher profile and is not admin
        }

        // Find classrooms where this teacher is either Class Teacher or Department Incharge
        const myClassrooms = await Classroom.findAll({
            where: { classTeacherId: teacherId },
            attributes: ['id']
        });
        const myClassroomIds = myClassrooms.map(c => c.id);

        // Find departments where this teacher is Head / Incharge
        const myDepts = await Department.findAll({
            where: { headId: teacherId },
            attributes: ['id']
        });
        const myDeptIds = myDepts.map(d => d.id);

        requestWhere[Op.or] = [
            { classroomId: { [Op.in]: myClassroomIds } },
            { departmentId: { [Op.in]: myDeptIds } }
        ];
    }

    return await StudentLeaveRequest.findAll({
        where: requestWhere,
        include: [
            {
                model: Student,
                as: 'student',
                attributes: ['id', 'firstName', 'lastName', 'admissionNumber', 'rollNumber']
            },
            {
                model: Classroom,
                as: 'classroom',
                attributes: ['id', 'name', 'section', 'classTeacherId']
            },
            {
                model: Department,
                as: 'department',
                attributes: ['id', 'name']
            },
            {
                model: User,
                as: 'decider',
                attributes: ['id', 'firstName', 'lastName']
            }
        ],
        order: [['created_at', 'DESC']]
    });
};

/**
 * 4. Action student leave (Approve / Reject) with attendance reconciliation
 */
export const actionStudentLeave = async ({ requestId, action, decisionRemark, user }) => {
    const request = await StudentLeaveRequest.findByPk(requestId, {
        include: [
            { model: Student, as: 'student' },
            { model: Classroom, as: 'classroom' },
            { model: Department, as: 'department' }
        ]
    });

    if (!request) {
        throw new Error('Student leave application not found.');
    }

    if (request.status !== 'PENDING') {
        throw new Error(`This request has already been ${request.status.toLowerCase()}.`);
    }

    const isSuperAdmin = user.Roles?.some(r => ['super_admin', 'admin', 'SUPER_ADMIN', 'ADMIN'].includes(r.name));
    const teacherId = user.teacherId;

    let decidedByRole = 'ADMIN';

    // Verify scope
    if (!isSuperAdmin) {
        if (!teacherId) {
            throw new Error('Access denied. Only authorized faculty can action student leaves.');
        }

        const isClassTeacher = request.classroom?.classTeacherId === teacherId;
        const isIncharge = request.department?.headId === teacherId;

        if (!isClassTeacher && !isIncharge) {
            throw new Error('Access denied. You are neither the Class Teacher nor the Department Incharge for this student.');
        }

        decidedByRole = isClassTeacher ? 'CLASS_TEACHER' : 'DEPARTMENT_INCHARGE';
    }

    const actionUpper = action.toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(actionUpper)) {
        throw new Error('Action must be either APPROVED or REJECTED.');
    }

    if (actionUpper === 'REJECTED' && (!decisionRemark || !decisionRemark.trim())) {
        throw new Error('A reason or remark is required when rejecting a student leave application.');
    }

    // Execute within database transaction
    return await sequelize.transaction(async (t) => {
        const actionByName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'School Faculty';

        await request.update({
            status: actionUpper,
            decidedByRole,
            decidedByUserId: user.id,
            actionByName,
            decidedAt: new Date(),
            decisionRemark: decisionRemark || null
        }, { transaction: t });

        // If Approved, automate attendance reconciliation across the date range
        if (actionUpper === 'APPROVED') {
            const start = new Date(request.fromDate);
            const end = new Date(request.toDate);

            const curr = new Date(start);
            while (curr <= end) {
                const dateStr = curr.toISOString().split('T')[0];
                const dayOfWeek = curr.getDay(); // 0 is Sunday

                // Skip Sundays
                if (dayOfWeek !== 0) {
                    await StudentAttendance.upsert({
                        academicYearId: request.academicYearId,
                        classroomId: request.classroomId,
                        studentId: request.studentId,
                        attendanceDate: dateStr,
                        status: 'LEAVE',
                        remarks: `Excused Leave: ${request.category} (Ref #${request.id.slice(0, 8)})`,
                        createdBy: user.id,
                        updatedBy: user.id
                    }, { transaction: t });
                }

                curr.setDate(curr.getDate() + 1);
            }
            logger.info(`[Student Leave] Synchronized 'LEAVE' attendance records for student ${request.studentId} from ${request.fromDate} to ${request.toDate}`);
        }

        // Enqueue non-blocking email notification to student & parent
        enqueueEmailJob('STUDENT_LEAVE_DECIDED', {
            requestId: request.id,
            status: actionUpper,
            studentName: `${request.student?.firstName || ''} ${request.student?.lastName || ''}`,
            studentEmail: request.student?.email,
            guardianEmail: request.student?.guardianEmail,
            fromDate: request.fromDate,
            toDate: request.toDate,
            actionByName,
            decisionRemark
        });

        return request;
    });
};
