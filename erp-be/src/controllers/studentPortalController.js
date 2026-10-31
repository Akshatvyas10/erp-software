'use strict';

import db from '../models/index.js';
const {
    Student,
    User,
    Classroom,
    ClassroomStudent,
    ClassroomSubject,
    Subject,
    Teacher,
    Timetable,
    Homework,
    HomeworkSubmission,
    StudentAttendance,
    ExamSchedule,
    Exam,
    ExamResult,
    AcademicYear,
    ClassroomRemark,
} = db;
import { Op } from 'sequelize';
import { success, error } from '../utils/apiResponse.js';

/**
 * Helper to resolve the student record for the authenticated user (student or parent).
 */
const resolveStudentForUser = async (req) => {
    // 1. Direct student user
    if (req.user.studentId) {
        return await Student.findByPk(req.user.studentId, {
            include: [{ model: User, as: 'account', attributes: ['id', 'userId', 'firstName', 'lastName', 'email', 'phone'] }]
        });
    }

    // 2. Direct lookup by userId
    const student = await Student.findOne({
        where: { userId: req.user.id },
        include: [{ model: User, as: 'account', attributes: ['id', 'userId', 'firstName', 'lastName', 'email', 'phone'] }]
    });
    if (student) return student;

    // 3. Parent / Guardian lookup (matches guardianEmail or phone)
    const guardianStudent = await Student.findOne({
        where: {
            [Op.or]: [
                { guardianEmail: req.user.email },
                { guardianPhone: req.user.phone || '___NO_PHONE___' },
            ]
        },
        include: [{ model: User, as: 'account', attributes: ['id', 'userId', 'firstName', 'lastName', 'email', 'phone'] }]
    });

    return guardianStudent;
};

/**
 * GET /api/portal/student/me
 * Returns the student's profile, active classroom enrollment, and class teacher details.
 */
export const getMyPortalProfile = async (req, res, next) => {
    try {
        const student = await resolveStudentForUser(req);
        if (!student) {
            return error(res, 'Student profile not found for this account', 404);
        }

        // Active classroom enrollment
        const enrollment = await ClassroomStudent.findOne({
            where: { studentId: student.id },
            include: [
                {
                    model: Classroom,
                    as: 'classroom',
                    include: [
                        {
                            model: Teacher,
                            as: 'classTeacher',
                            include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName', 'email'] }]
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return success(res, {
            student,
            enrollment,
            classroom: enrollment?.classroom || null,
        });
    } catch (err) { next(err); }
};

/**
 * GET /api/portal/student/timetable
 * Returns current weekly period schedule for student's enrolled classroom.
 */
export const getMyTimetable = async (req, res, next) => {
    try {
        const student = await resolveStudentForUser(req);
        if (!student) return error(res, 'Student profile not found', 404);

        const enrollment = await ClassroomStudent.findOne({
            where: { studentId: student.id },
            order: [['createdAt', 'DESC']]
        });

        if (!enrollment?.classroomId) {
            return success(res, { timetable: [] });
        }

        const classroomSubjects = await ClassroomSubject.findAll({
            where: { classroomId: enrollment.classroomId },
            attributes: ['id', 'subjectId', 'teacherId', 'classroomId']
        });

        const cSubIds = classroomSubjects.map(cs => cs.id);
        if (cSubIds.length === 0) {
            return success(res, { timetable: [] });
        }

        const slots = await Timetable.findAll({
            where: { classroomSubjectId: { [Op.in]: cSubIds } },
            include: [
                {
                    model: ClassroomSubject,
                    as: 'classroomSubject',
                    include: [
                        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'type'] },
                        {
                            model: Teacher,
                            as: 'teacher',
                            include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName'] }]
                        }
                    ]
                }
            ],
            order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
        });

        return success(res, { timetable: slots, classroomId: enrollment.classroomId });
    } catch (err) { next(err); }
};

/**
 * GET /api/portal/student/attendance
 * Returns full attendance records and attendance percentage.
 */
export const getMyAttendance = async (req, res, next) => {
    try {
        const student = await resolveStudentForUser(req);
        if (!student) return error(res, 'Student profile not found', 404);

        const { classroomId } = req.query;
        const whereClause = { studentId: student.id };
        if (classroomId) {
            whereClause.classroomId = classroomId;
        }

        const records = await StudentAttendance.findAll({
            where: whereClause,
            include: [
                { model: Classroom, as: 'classroom', attributes: ['id', 'name', 'section', 'academicYear'] },
                { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }
            ],
            order: [['attendanceDate', 'DESC']],
            limit: 120,
        });

        // Map records ensuring both 'attendanceDate' and 'date' exist for frontend backwards-compatibility
        const mappedRecords = records.map(r => {
            const raw = r.toJSON();
            return {
                ...raw,
                date: raw.attendanceDate,
                attendanceDate: raw.attendanceDate
            };
        });

        const totalMarked = mappedRecords.length;
        const presentCount = mappedRecords.filter(r => ['PRESENT', 'present', 'LATE', 'late'].includes(r.status)).length;
        const absentCount = mappedRecords.filter(r => ['ABSENT', 'absent'].includes(r.status)).length;
        const leaveCount = mappedRecords.filter(r => ['LEAVE', 'leave', 'HALF_DAY', 'half_day'].includes(r.status)).length;
        const attendancePercentage = totalMarked > 0 ? ((presentCount / totalMarked) * 100).toFixed(1) : '100.0';

        return success(res, {
            records: mappedRecords,
            stats: {
                totalDays: totalMarked,
                presentDays: presentCount,
                absentDays: absentCount,
                leaveDays: leaveCount,
                attendancePercentage: Number(attendancePercentage),
            }
        });
    } catch (err) { next(err); }
};

/**
 * GET /api/portal/student/homework
 * Returns all homework assigned to student's classroom with submission status.
 */
export const getMyHomework = async (req, res, next) => {
    try {
        const student = await resolveStudentForUser(req);
        if (!student) return error(res, 'Student profile not found', 404);

        const { classroomId } = req.query;

        let targetClassroomId = classroomId;
        if (!targetClassroomId) {
            const enrollment = await ClassroomStudent.findOne({
                where: { studentId: student.id },
                order: [['createdAt', 'DESC']]
            });
            targetClassroomId = enrollment?.classroomId;
        }

        if (!targetClassroomId) {
            return success(res, { homework: [], homeworks: [] });
        }

        const homeworks = await Homework.findAll({
            where: {
                classroomId: targetClassroomId,
                status: 'PUBLISHED'
            },
            include: [
                { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
                {
                    model: Teacher,
                    as: 'teacher',
                    include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName'] }]
                },
                {
                    model: HomeworkSubmission,
                    as: 'submissions',
                    where: { studentId: student.id },
                    required: false,
                },
                {
                    model: ClassroomRemark,
                    as: 'remarks',
                    where: { studentId: student.id },
                    required: false,
                    attributes: ['id', 'remark', 'type', 'teacherName', 'created_at']
                }
            ],
            order: [['dueDate', 'DESC']]
        });

        // Format to ensure camelCase createdAt and teacher mapping
        let formatted = homeworks.map(h => {
            const json = h.toJSON();
            if (json.remarks) {
                json.remarks = json.remarks.map(r => ({
                    ...r,
                    createdAt: r.created_at || r.createdAt
                }));
            }
            if (json.teacher && json.teacher.account) {
                json.teacher.firstName = json.teacher.account.firstName;
                json.teacher.lastName = json.teacher.account.lastName;
            }
            return json;
        });

        // Optional status filter: e.g. status=PENDING (includes PENDING or NOT_COMPLETED / unsubmitted)
        const { status: filterStatus } = req.query;
        if (filterStatus) {
            const upper = filterStatus.toUpperCase();
            if (upper === 'PENDING') {
                formatted = formatted.filter(h => {
                    const sub = h.submissions?.[0];
                    const subStatus = sub?.status || 'PENDING';
                    return subStatus === 'PENDING' || subStatus === 'NOT_COMPLETED';
                });
                // Sort pending homework by due date ascending (earliest first)
                formatted.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            } else if (upper === 'COMPLETED') {
                formatted = formatted.filter(h => h.submissions?.[0]?.status === 'COMPLETED');
            } else if (upper === 'SUBMITTED') {
                formatted = formatted.filter(h => h.submissions?.[0]?.status === 'SUBMITTED');
            }
        }

        return success(res, { homework: formatted, homeworks: formatted });
    } catch (err) { next(err); }
};

/**
 * GET /api/portal/student/remarks
 * Returns remarks given specifically to the student in their classroom(s).
 */
export const getMyClassroomRemarks = async (req, res, next) => {
    try {
        const student = await resolveStudentForUser(req);
        if (!student) return error(res, 'Student profile not found', 404);

        const { classroomId } = req.query;
        const where = { studentId: student.id };
        if (classroomId) where.classroomId = classroomId;

        const remarks = await ClassroomRemark.findAll({
            where,
            include: [
                { model: Classroom, as: 'classroom', attributes: ['id', 'name', 'section'] },
                { model: Homework, as: 'homework', attributes: ['id', 'title'] }
            ],
            order: [['created_at', 'DESC']]
        });

        const formatted = remarks.map(r => {
            const json = r.toJSON();
            json.createdAt = json.created_at || json.createdAt;
            return json;
        });

        return success(res, { remarks: formatted });
    } catch (err) { next(err); }
};

/**
 * POST /api/portal/student/homework/:id/submit
 * Submit homework assignment.
 */
export const submitMyHomework = async (req, res, next) => {
    try {
        const student = await resolveStudentForUser(req);
        if (!student) return error(res, 'Student profile not found', 404);

        const homework = await Homework.findByPk(req.params.id);
        if (!homework) return error(res, 'Homework assignment not found', 404);

        const { content, attachmentUrl } = req.body;
        if (!content && !attachmentUrl) {
            return error(res, 'Submission content or attachment required', 400);
        }

        const [submission, created] = await HomeworkSubmission.findOrCreate({
            where: {
                homeworkId: homework.id,
                studentId: student.id,
            },
            defaults: {
                homeworkId: homework.id,
                studentId: student.id,
                content: content || '',
                attachmentUrl: attachmentUrl || null,
                status: 'SUBMITTED',
                submittedAt: new Date(),
            }
        });

        if (!created) {
            await submission.update({
                content: content || submission.content,
                attachmentUrl: attachmentUrl || submission.attachmentUrl,
                status: 'SUBMITTED',
                submittedAt: new Date(),
            });
        }

        return success(res, { submission }, 'Homework submitted successfully');
    } catch (err) { next(err); }
};

/**
 * GET /api/portal/student/exam-results
 * Returns only PUBLISHED exam schedules and student's marks.
 */
export const getMyExamResults = async (req, res, next) => {
    try {
        const student = await resolveStudentForUser(req);
        if (!student) return error(res, 'Student profile not found', 404);

        const enrollment = await ClassroomStudent.findOne({
            where: { studentId: student.id },
            order: [['createdAt', 'DESC']]
        });

        if (!enrollment?.classroomId) {
            return success(res, { schedules: [] });
        }

        const schedules = await ExamSchedule.findAll({
            where: { classroomId: enrollment.classroomId },
            include: [
                {
                    model: Exam,
                    as: 'exams',
                    where: { status: 'PUBLISHED' },
                    include: [
                        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
                        {
                            model: ExamResult,
                            as: 'results',
                            where: { studentId: student.id },
                            required: false,
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return success(res, { schedules });
    } catch (err) { next(err); }
};

/**
 * GET /api/portal/student/updates
 * Returns a consolidated chronologically sorted feed of updates for this student in the classroom:
 * - New homework assigned
 * - Teacher remarks logged
 * - Leave application status decisions
 * - Exam results published
 */
export const getMyUpdatesFeed = async (req, res, next) => {
    try {
        const student = await resolveStudentForUser(req);
        if (!student) return error(res, 'Student profile not found', 404);

        const { classroomId } = req.query;
        let targetClassroomId = classroomId;
        if (!targetClassroomId) {
            const enrollment = await ClassroomStudent.findOne({
                where: { studentId: student.id },
                order: [['createdAt', 'DESC']]
            });
            targetClassroomId = enrollment?.classroomId;
        }

        if (!targetClassroomId) {
            return success(res, { updates: [] });
        }

        const updates = [];

        // 1. Homework assignments in this classroom (last 10)
        const recentHomeworks = await Homework.findAll({
            where: {
                classroomId: targetClassroomId,
                status: 'PUBLISHED'
            },
            include: [
                { model: Subject, as: 'subject', attributes: ['name', 'code'] },
                {
                    model: Teacher,
                    as: 'teacher',
                    include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName'] }]
                }
            ],
            order: [['created_at', 'DESC']],
            limit: 10
        });

        for (const hw of recentHomeworks) {
            const teacherName = hw.teacher?.account
                ? `${hw.teacher.account.firstName} ${hw.teacher.account.lastName}`.trim()
                : 'Teacher';
            updates.push({
                id: `hw-${hw.id}`,
                type: 'HOMEWORK',
                title: `New Homework: ${hw.title}`,
                message: `Assigned in ${hw.subject?.name || 'Class'} by ${teacherName}. Due: ${new Date(hw.dueDate).toLocaleDateString()}`,
                timestamp: hw.created_at || hw.createdAt,
                referenceId: hw.id,
                linkTab: 'homework'
            });
        }

        // 2. Remarks given specifically to this student in this classroom (last 10)
        const recentRemarks = await ClassroomRemark.findAll({
            where: {
                studentId: student.id,
                classroomId: targetClassroomId
            },
            include: [
                { model: Homework, as: 'homework', attributes: ['id', 'title'] }
            ],
            order: [['created_at', 'DESC']],
            limit: 10
        });

        for (const rem of recentRemarks) {
            updates.push({
                id: `rem-${rem.id}`,
                type: 'REMARK',
                subType: rem.type,
                title: `Teacher Remark (${rem.type})`,
                message: rem.remark,
                author: rem.teacherName || 'Faculty',
                timestamp: rem.created_at || rem.createdAt,
                referenceId: rem.id,
                linkTab: 'remarks'
            });
        }

        // 3. Leave applications for this student in this classroom (last 5)
        const studentLeaves = await studentLeaveService.getStudentOwnLeaves(student.id);
        const relevantLeaves = Array.isArray(studentLeaves)
            ? studentLeaves.filter(l => !l.classroomId || l.classroomId === targetClassroomId).slice(0, 5)
            : [];

        for (const l of relevantLeaves) {
            if (l.status !== 'PENDING') {
                updates.push({
                    id: `leave-${l.id}`,
                    type: 'LEAVE',
                    title: `Leave ${l.status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
                    message: `${l.category} leave for ${l.totalDays} day(s) (${l.fromDate} to ${l.toDate}) was ${l.status.toLowerCase()}.${l.decisionRemark ? ` Note: "${l.decisionRemark}"` : ''}`,
                    timestamp: l.decidedAt || l.updatedAt || l.created_at,
                    referenceId: l.id,
                    linkTab: 'overview'
                });
            }
        }

        // 4. Sort all items descending by timestamp
        updates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Return latest 15 updates
        return success(res, { updates: updates.slice(0, 15) });
    } catch (err) { next(err); }
};

import * as studentLeaveService from '../services/studentLeave.service.js';

/**
 * GET /api/portal/student/leaves
 * Returns the student's leave requests
 */
export const getMyLeaves = async (req, res, next) => {
    try {
        const student = await resolveStudentForUser(req);
        if (!student) {
            return error(res, 'Student profile not found.', 404);
        }
        const leaves = await studentLeaveService.getStudentOwnLeaves(student.id);
        return success(res, leaves, 'Student leave applications fetched successfully');
    } catch (err) { next(err); }
};

/**
 * POST /api/portal/student/leaves
 * Submits a new student leave application
 */
export const applyMyLeave = async (req, res, next) => {
    try {
        const student = await resolveStudentForUser(req);
        if (!student) {
            return error(res, 'Student profile not found.', 404);
        }

        const { category, fromDate, toDate, totalDays, reason, attachmentUrl } = req.body;
        if (!fromDate || !toDate || !reason) {
            return error(res, 'From date, to date, and reason are required fields.', 400);
        }

        const leave = await studentLeaveService.applyStudentLeave({
            studentId: student.id,
            category,
            fromDate,
            toDate,
            totalDays,
            reason,
            attachmentUrl
        });

        return success(res, leave, 'Leave application submitted successfully', 201);
    } catch (err) { next(err); }
};
