'use strict';

import path from 'path';
import fs from 'fs';
import { Op, literal, fn, col } from 'sequelize';
import db from '../models/index.js';
const { Student, User, Role, Classroom, ClassroomStudent, StudentAcademicHistory, PromotionLog } = db;
import { success, error } from '../utils/apiResponse.js';
import permissionEmitter from '../events/permissionEmitter.js';
import { buildPhotoUrl } from '../middlewares/uploadMiddleware.js';

// ─── Shared eager-load: always join the user account ─────────────────────────
const studentWithAccount = {
    include: [
        {
            model: User,
            as: 'account',
            attributes: [
                'id', 'userId', 'email', 'firstName', 'lastName',
                'isActive', 'lastLoginAt',
            ],
        },
    ],
};

// ─── Rich include used on the single-record GET ───────────────────────────────
const studentFullInclude = {
    include: [
        {
            model: User,
            as: 'account',
            attributes: [
                'id', 'userId', 'email', 'firstName', 'lastName',
                'isActive', 'lastLoginAt',
            ],
        },
        {
            model: ClassroomStudent,
            as: 'classroomEnrollments',
            required: false,
            include: [
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'name', 'section', 'academicYear', 'status'],
                },
            ],
        },
    ],
};

// =============================================================================
// HELPER — Auto-generate ERP internal student ID  ("STU-00001")
// =============================================================================
const generateStudentId = async (t) => {
    const [results] = await db.sequelize.query("SELECT nextval('erp_student_id_seq') as seq", { transaction: t });
    return `STU-${String(results[0].seq).padStart(5, '0')}`;
};

// =============================================================================
// HELPER — Auto-generate ERP user login ID  ("ERP-00002")
// =============================================================================
const generateUserId = async (t) => {
    const [results] = await db.sequelize.query("SELECT nextval('erp_user_id_seq') as seq", { transaction: t });
    return `ERP-${String(results[0].seq).padStart(5, '0')}`;
};

// =============================================================================
// HELPER — Auto-generate admission number  ("ADM-2026-0014")
// =============================================================================
const generateAdmissionNumber = async (t) => {
    const year = new Date().getFullYear();
    const [results] = await db.sequelize.query("SELECT nextval('student_adm_seq') as seq", { transaction: t });
    const seq = String(results[0].seq).padStart(4, '0');
    return `ADM-${year}-${seq}`;
};

// =============================================================================
// GET /api/students
// Offset pagination · search · classroom filter · status filter
// =============================================================================
const listStudents = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(1000, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const status = req.query.status || '';
        const classroomId = req.query.classroomId || '';

        const studentWhere = {};
        if (status) studentWhere.status = status;

        // Combine Student and Account (User) search terms using nested field references
        if (search) {
            studentWhere[Op.or] = [
                { studentId: { [Op.iLike]: `%${search}%` } },
                { admissionNumber: { [Op.iLike]: `%${search}%` } },
                { '$account.first_name$': { [Op.iLike]: `%${search}%` } },
                { '$account.last_name$': { [Op.iLike]: `%${search}%` } },
                { '$account.email$': { [Op.iLike]: `%${search}%` } },
                { '$account.user_id$': { [Op.iLike]: `%${search}%` } },
            ];
        }

        // Classroom pre-filter
        if (classroomId) {
            const enrollments = await ClassroomStudent.findAll({
                where: { classroomId },
                attributes: ['studentId'],
            });
            const ids = enrollments.map(e => e.studentId);
            if (ids.length === 0) {
                return success(res, {
                    students: [],
                    pagination: { total: 0, page, limit, pages: 0 },
                });
            }
            studentWhere.id = { [Op.in]: ids };
        }

        const { count, rows } = await Student.findAndCountAll({
            where: studentWhere,
            include: [
                {
                    model: User,
                    as: 'account',
                    attributes: ['id', 'userId', 'email', 'firstName', 'lastName', 'isActive'],
                    required: true, // required because student always has an account and we filter on it
                },
                {
                    model: ClassroomStudent,
                    as: 'classroomEnrollments',
                    required: false,
                    include: [
                        {
                            model: Classroom,
                            as: 'classroom',
                            attributes: ['id', 'name', 'section', 'academicYear', 'status'],
                        },
                    ],
                },
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']],
            distinct: true,
        });

        return success(res, {
            students: rows,
            pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
        });
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// GET /api/students/:id  — full detail with classroom enrollment
// =============================================================================
const getStudent = async (req, res, next) => {
    try {
        const student = await Student.findByPk(req.params.id, studentFullInclude);
        if (!student) return error(res, 'Student not found', 404);
        return success(res, { student });
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// GET /api/students/me
// =============================================================================
const getMyStudentProfile = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            where: { userId: req.user.id },
            ...studentFullInclude,
        });
        if (!student) return error(res, 'Student profile not found', 404);
        return success(res, { student });
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// POST /api/students
// Transaction pipeline:
//   1. Generate admission number (year-scoped counter)
//   2. Generate ERP userId & studentId
//   3. Create users row + hash password
//   4. Assign 'student' role
//   5. Create students profile row
//   6. Optionally write classroom_students junction row (if classroomId provided)
//   7. Attach profile photo path from multer (if file uploaded)
// =============================================================================
const createStudent = async (req, res, next) => {
    const t = await Student.sequelize.transaction();
    try {
        const {
            email, password, firstName, lastName,
            admissionNumber, rollNumber, grade, section,
            dateOfBirth, gender, bloodGroup, medicalNotes,
            permanentAddress, currentAddress,
            transportationMode,
            guardianName, guardianRelationship, guardianPhone, guardianEmail,
            governmentId, feeQuota,
            previousSchoolDetails, transferCertificateUrl,
            status,
            customFieldResponses,
            classroomId,
        } = req.body;

        // ── 1. Year-scoped admission number (or provided manual one) ──────────
        const finalAdmissionNumber = admissionNumber && admissionNumber.trim() !== '' 
            ? admissionNumber 
            : await generateAdmissionNumber(t);

        // ── 2. Internal ERP identifiers ───────────────────────────────────────
        const erpUserId = await generateUserId(t);
        const erpStudentId = await generateStudentId(t);

        // ── 3. Profile photo (multer saves file before this runs) ─────────────
        const profilePhotoUrl = req.file
            ? buildPhotoUrl(req.file.filename)
            : null;

        // ── 4. Create user account ────────────────────────────────────────────
        const user = await User.create(
            { userId: erpUserId, email, password, firstName, lastName },
            { transaction: t }
        );

        // ── 5. Assign student role ────────────────────────────────────────────
        const studentRole = await Role.findOne({ where: { name: 'student' } });
        if (studentRole) await user.addRole(studentRole, { transaction: t });

        // ── 6. Create student profile ─────────────────────────────────────────
        const student = await Student.create(
            {
                userId: user.id,
                studentId: erpStudentId,
                admissionNumber: finalAdmissionNumber,
                dateOfBirth: dateOfBirth || null,
                gender: gender || null,
                bloodGroup: bloodGroup || null,
                medicalNotes: medicalNotes || null,
                profilePhotoUrl,                       // ← from multer or null
                permanentAddress: permanentAddress || null,
                currentAddress: currentAddress || null,
                transportationMode: transportationMode || 'WALKER',
                guardianName: guardianName || null,
                guardianRelationship: guardianRelationship || null,
                guardianPhone: guardianPhone || null,
                guardianEmail: guardianEmail || null,
                governmentId: governmentId || null,
                feeQuota: feeQuota || 'REGULAR',
                previousSchoolDetails: previousSchoolDetails || null,
                transferCertificateUrl: transferCertificateUrl || null,
                status: status || 'ACTIVE',
                customFieldResponses: customFieldResponses || {}, // ← new
            },
            { transaction: t }
        );

        // ── 7. Conditional classroom junction ─────────────────────────────────
        if (classroomId) {
            const classroom = await Classroom.findByPk(classroomId, { transaction: t });
            if (!classroom) {
                await t.rollback();
                // Clean up uploaded file if classroom is invalid
                if (req.file) {
                    fs.unlink(req.file.path, () => { });
                }
                return error(res, 'Classroom not found', 404);
            }
            await ClassroomStudent.create(
                { classroomId, studentId: student.id, rollNumber: rollNumber || null },
                { transaction: t }
            );
        }

        await t.commit();

        // Warm permission cache
        permissionEmitter.emit('role:changed', { userId: user.id });

        const result = await Student.findByPk(student.id, studentFullInclude);
        return success(res, { student: result }, 'Student enrolled', 201);
    } catch (err) {
        await t.rollback();
        // Clean up file on transaction failure
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        if (err.name === 'SequelizeUniqueConstraintError' && err.errors?.[0]?.path === 'unique_classroom_roll') {
            return error(res, `Roll number ${req.body.rollNumber} is already taken in this classroom.`, 400);
        }
        next(err);
    }
};

// =============================================================================
// PUT /api/students/:id
// Handles optional new photo upload; replaces old file if one existed.
// =============================================================================
const updateStudent = async (req, res, next) => {
    const t = await Student.sequelize.transaction();
    try {
        const student = await Student.findByPk(req.params.id, { include: ['account'], transaction: t });
        if (!student) {
            await t.rollback();
            // Clean up uploaded file if student not found
            if (req.file) fs.unlink(req.file.path, () => { });
            return error(res, 'Student not found', 404);
        }

        // ── User-level fields ─────────────────────────────────────────────────
        const { firstName, lastName, email, isActive } = req.body;
        const accountUpdates = {};
        if (firstName !== undefined) accountUpdates.firstName = firstName;
        if (lastName !== undefined) accountUpdates.lastName = lastName;
        if (email !== undefined) accountUpdates.email = email;
        if (isActive !== undefined) accountUpdates.isActive = isActive;
        if (Object.keys(accountUpdates).length) {
            await student.account.update(accountUpdates, { transaction: t });
        }

        // ── Student-level fields ──────────────────────────────────────────────
        const allowedFields = [
            'admissionNumber', 'dateOfBirth',
            'gender', 'bloodGroup', 'medicalNotes',
            'permanentAddress', 'currentAddress', 'transportationMode',
            'guardianName', 'guardianRelationship', 'guardianPhone', 'guardianEmail',
            'governmentId', 'feeQuota', 'previousSchoolDetails',
            'transferCertificateUrl', 'status', 'customFieldResponses', // ← new
        ];
        const studentUpdates = {};
        for (const key of allowedFields) {
            if (req.body[key] !== undefined) studentUpdates[key] = req.body[key];
        }

        // ── Photo replacement ─────────────────────────────────────────────────
        if (req.file) {
            // Delete old file from disk if it's a local path
            if (
                student.profilePhotoUrl &&
                student.profilePhotoUrl.startsWith('/uploads/')
            ) {
                const oldPath = path.join(
                    process.cwd(), 'public', student.profilePhotoUrl
                );
                fs.unlink(oldPath, () => { }); // non-blocking; ignore missing file
            }
            studentUpdates.profilePhotoUrl = buildPhotoUrl(req.file.filename);
        }

        if (Object.keys(studentUpdates).length) {
            await student.update(studentUpdates, { transaction: t });
        }

        // ── Classroom / Roll Number updates ──────────────────────────────────
        const { classroomId, rollNumber } = req.body;
        if (classroomId !== undefined || rollNumber !== undefined) {
            const enrollment = await ClassroomStudent.findOne({ where: { studentId: student.id }, transaction: t });
            if (enrollment) {
                const enrollmentUpdates = {};
                if (classroomId !== undefined) enrollmentUpdates.classroomId = classroomId || null;
                if (rollNumber !== undefined) enrollmentUpdates.rollNumber = rollNumber || null;
                
                if (enrollmentUpdates.classroomId === null) {
                    await enrollment.destroy({ transaction: t });
                } else if (Object.keys(enrollmentUpdates).length > 0) {
                    await enrollment.update(enrollmentUpdates, { transaction: t });
                }
            } else if (classroomId) {
                await ClassroomStudent.create({
                    studentId: student.id,
                    classroomId,
                    rollNumber: rollNumber || null
                }, { transaction: t });
            }
        }

        await t.commit();
        const updated = await Student.findByPk(student.id, studentFullInclude);
        return success(res, { student: updated }, 'Student updated');
    } catch (err) {
        await t.rollback();
        if (req.file) fs.unlink(req.file.path, () => { });
        if (err.name === 'SequelizeUniqueConstraintError' && err.errors?.[0]?.path === 'unique_classroom_roll') {
            return error(res, `Roll number ${req.body.rollNumber} is already taken in this classroom.`, 400);
        }
        next(err);
    }
};

// =============================================================================
// DELETE /api/students/:id
// =============================================================================
const deleteStudent = async (req, res, next) => {
    try {
        const student = await Student.findByPk(req.params.id);
        if (!student) return error(res, 'Student not found', 404);

        // Remove profile photo from disk
        if (
            student.profilePhotoUrl &&
            student.profilePhotoUrl.startsWith('/uploads/')
        ) {
            const filePath = path.join(
                process.cwd(), 'public', student.profilePhotoUrl
            );
            fs.unlink(filePath, () => { });
        }

        const user = await User.findByPk(student.userId);
        if (user) await user.destroy();
        else await student.destroy();

        return success(res, null, 'Student deleted');
    } catch (err) {
        next(err);
    }
};

// ── GET /api/students/:id/exam-results ──────────────────────────────────────────
const getStudentExamResults = async (req, res, next) => {
    try {
        const studentId = req.params.id;
        const student = await db.Student.findByPk(studentId);
        if (!student) return error(res, 'Student not found', 404);

        const results = await db.ExamResult.findAll({
            where: { studentId },
            include: [
                {
                    model: db.Exam,
                    as: 'exam',
                    where: { status: 'PUBLISHED' },
                    include: [
                        { model: db.Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
                        { model: db.ExamSchedule, as: 'examSchedule', attributes: ['id', 'name', 'type'] },
                        { model: db.Classroom, as: 'classroom', attributes: ['id', 'name', 'section', 'academicYear'] }
                    ]
                }
            ],
            order: [[{ model: db.Exam, as: 'exam' }, 'date', 'DESC']]
        });
        
        return success(res, { results });
    } catch (err) { next(err); }
};

// =============================================================================
// GET /api/students/:id/attendance — fetch daily attendance history
// =============================================================================
const getStudentAttendance = async (req, res, next) => {
    try {
        const { id: studentId } = req.params;
        const student = await db.Student.findByPk(studentId);
        if (!student) return error(res, 'Student not found', 404);

        const limit = parseInt(req.query.limit) || 30; // Last 30 days default if no dates
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const whereClause = { studentId };
        
        if (startDate && endDate) {
            whereClause.attendanceDate = {
                [Op.between]: [startDate, endDate]
            };
        }

        const queryOptions = {
            where: whereClause,
            include: [
                { model: db.Classroom, as: 'classroom', attributes: ['name', 'section', 'academicYear'] }
            ],
            order: [['attendanceDate', 'DESC']],
        };

        // Only apply limit if date range is not provided
        if (!startDate || !endDate) {
            queryOptions.limit = Math.min(100, limit);
        }

        const attendance = await db.StudentAttendance.findAll(queryOptions);

        // Fetch Holidays if dates are provided
        let holidays = [];
        if (startDate && endDate) {
            holidays = await db.CalendarEvent.findAll({
                where: {
                    day_type: 'HOLIDAY',
                    status: 'PUBLISHED',
                    start_date: { [Op.lte]: new Date(endDate + 'T23:59:59Z') },
                    end_date: { [Op.gte]: new Date(startDate + 'T00:00:00Z') }
                },
                attributes: ['id', 'title', 'start_date', 'end_date']
            });
        }

        // Compute stats
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'PRESENT').length;
        const absent = attendance.filter(a => a.status === 'ABSENT').length;
        const late = attendance.filter(a => a.status === 'LATE').length;
        const halfDay = attendance.filter(a => a.status === 'HALF_DAY').length;

        const summary = {
            total, present, absent, late, halfDay,
            percentage: total > 0 ? ((present + halfDay * 0.5) / total * 100).toFixed(1) : 0
        };

        return success(res, { records: attendance, summary, holidays });
    } catch (err) { next(err); }
};

// =============================================================================
// GET /api/students/:id/academic-history
// Fetch complete past academic history and progression logs
// =============================================================================
const getStudentAcademicHistory = async (req, res, next) => {
    try {
        const studentId = req.params.id;
        const student = await Student.findByPk(studentId, {
            attributes: ['id', 'studentId', 'admissionNumber', 'grade', 'section', 'status'],
            include: [studentWithAccount]
        });
        if (!student) return error(res, 'Student not found', 404);

        const { academicYear, className } = req.query;
        const whereClause = { studentId };
        if (academicYear) whereClause.academicYear = academicYear;
        if (className) whereClause.className = className;

        const history = await StudentAcademicHistory.findAll({
            where: whereClause,
            order: [['created_at', 'ASC'], ['academic_year', 'ASC']]
        });

        const promotionLogs = await PromotionLog.findAll({
            where: { studentId },
            include: [
                { model: Classroom, as: 'sourceClassroom', attributes: ['id', 'name', 'section', 'academicYear'] },
                { model: Classroom, as: 'targetClassroom', attributes: ['id', 'name', 'section', 'academicYear'] }
            ],
            order: [['created_at', 'ASC']]
        });

        return success(res, {
            student,
            history,
            promotionLogs
        });
    } catch (err) {
        next(err);
    }
};

export {
    listStudents, getStudent, getMyStudentProfile,
    createStudent, updateStudent, deleteStudent,
    getStudentExamResults, getStudentAttendance,
    getStudentAcademicHistory
};
