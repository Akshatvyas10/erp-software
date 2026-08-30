'use strict';

import path from 'path';
import fs from 'fs';
import { Op, literal, fn, col } from 'sequelize';
import db from '../models/index.js';
const { Student, User, Role, Classroom, ClassroomStudent } = db;
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
    const last = await Student.findOne({
        order: [['created_at', 'DESC']],
        paranoid: false,
        attributes: ['studentId'],
        lock: t ? t.LOCK.UPDATE : undefined,
        transaction: t,
    });
    if (!last) return 'STU-00001';
    const num = parseInt(last.studentId.replace('STU-', ''), 10);
    return `STU-${String(num + 1).padStart(5, '0')}`;
};

// =============================================================================
// HELPER — Auto-generate ERP user login ID  ("ERP-00002")
// =============================================================================
const generateUserId = async (t) => {
    const last = await User.findOne({
        order: [['created_at', 'DESC']],
        paranoid: false,
        attributes: ['userId'],
        lock: t ? t.LOCK.UPDATE : undefined,
        transaction: t,
    });
    if (!last) return 'ERP-00002';
    const num = parseInt(last.userId.replace('ERP-', ''), 10);
    return `ERP-${String(num + 1).padStart(5, '0')}`;
};

// =============================================================================
// HELPER — Auto-generate admission number  ("ADM-2026-0014")
// Counts students created in the current calendar year, then pads + formats.
// Runs INSIDE the transaction so concurrent inserts cannot collide.
// =============================================================================
const generateAdmissionNumber = async (t) => {
    const year = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const count = await Student.count({
        where: {
            createdAt: { [Op.gte]: yearStart, [Op.lt]: yearEnd },
        },
        paranoid: false,
        transaction: t,
    });

    const seq = String(count + 1).padStart(4, '0');
    return `ADM-${year}-${seq}`;
};

// =============================================================================
// GET /api/students
// Offset pagination · search · classroom filter · status filter
// =============================================================================
const listStudents = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const status = req.query.status || '';
        const classroomId = req.query.classroomId || '';

        const studentWhere = {};
        if (status) studentWhere.status = status;

        // Account-level search (joins to users table)
        const accountWhere = search
            ? {
                [Op.or]: [
                    { firstName: { [Op.iLike]: `%${search}%` } },
                    { lastName: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                    { userId: { [Op.iLike]: `%${search}%` } },
                ],
            }
            : {};

        // Student-table search terms
        if (search) {
            studentWhere[Op.or] = [
                { studentId: { [Op.iLike]: `%${search}%` } },
                { admissionNumber: { [Op.iLike]: `%${search}%` } },
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
                    where: Object.keys(accountWhere).length ? accountWhere : undefined,
                    required: Object.keys(accountWhere).length > 0,
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
            rollNumber, grade, section,
            dateOfBirth, gender, bloodGroup, medicalNotes,
            permanentAddress, currentAddress,
            transportationMode,
            guardianName, guardianRelationship, guardianPhone, guardianEmail,
            governmentId, feeQuota,
            previousSchoolDetails, transferCertificateUrl,
            status,
            classroomId,          // optional classroom junction
        } = req.body;

        // ── 1. Year-scoped admission number ──────────────────────────────────
        const admissionNumber = await generateAdmissionNumber(t);

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
                admissionNumber,                       // ← auto-generated
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
            'transferCertificateUrl', 'status',
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

export {
    listStudents,
    getStudent,
    getMyStudentProfile,
    createStudent,
    updateStudent,
    deleteStudent,
};
