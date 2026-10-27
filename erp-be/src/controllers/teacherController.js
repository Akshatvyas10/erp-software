'use strict';

import { Op } from 'sequelize';
import db from '../models/index.js';
const { Teacher, User, Role, Department } = db;
import { success, error } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import { sendTeacherEnrollmentWelcomeEmail } from '../services/email.service.js';
import { buildTeacherPhotoUrl } from '../middlewares/uploadMiddleware.js';

// All teacher-owned fields allowed on create / update
const TEACHER_FIELDS = [
    'employeeNumber', 'department', 'designation', 'qualification',
    'joiningDate', 'phone', 'subjects',
    'aadhaarNo', 'panNo',
    'employmentType', 'dailyWorkingHours',
    'salaryType', 'fixedMonthlySalary', 'hourlyRate',
    'casualLeaveBalance', 'sickLeaveBalance',
    'bankName', 'accountHolderName', 'accountNumber', 'ifscCode', 'bankBranch',
    'currentAddress', 'permanentAddress',
    'emergencyContactName', 'emergencyContactPhone',
    'profilePhotoUrl',
];

const teacherWithAccount = {
    include: [{
        model: User,
        as: 'account',
        attributes: ['id', 'userId', 'email', 'firstName', 'lastName', 'gender', 'dob', 'phone', 'isActive', 'lastLoginAt'],
        include: [{ model: Role, as: 'Roles', through: { attributes: [] }, required: false }],
    }],
};

/** GET /api/teachers */
const listTeachers = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const dept = req.query.department || '';
        const status = req.query.status || '';
        const employmentType = req.query.employmentType || '';

        const where = {};
        if (search) {
            where[Op.or] = [
                { teacherId: { [Op.iLike]: `%${search}%` } },
                { employeeNumber: { [Op.iLike]: `%${search}%` } },
                { department: { [Op.iLike]: `%${search}%` } },
                { designation: { [Op.iLike]: `%${search}%` } },
            ];
        }
        if (dept) where.department = { [Op.iLike]: `%${dept}%` };
        if (employmentType && employmentType !== 'all') {
            where.employmentType = employmentType;
        }

        const accountWhere = {};
        if (status === 'active') {
            accountWhere.isActive = true;
        } else if (status === 'inactive') {
            accountWhere.isActive = false;
        }

        const userRolesLower = (req.userRoles || []).map(r => String(r).toLowerCase());
        const canViewSensitive = userRolesLower.some(r => ['super_admin', 'admin', 'hr'].includes(r));

        const { count, rows } = await Teacher.findAndCountAll({
            where,
            include: [{
                model: User,
                as: 'account',
                where: Object.keys(accountWhere).length > 0 ? accountWhere : undefined,
                attributes: ['id', 'userId', 'email', 'firstName', 'lastName', 'gender', 'dob', 'phone', 'isActive', 'lastLoginAt'],
                include: [{ model: Role, as: 'Roles', through: { attributes: [] }, required: false }],
            }],
            limit, offset,
            order: [['createdAt', 'DESC']],
            distinct: true,
        });

        // Map department and designation names
        const departments = await Department.findAll();
        const deptMap = departments.reduce((acc, d) => ({ ...acc, [d.id]: d.name }), {});

        const designationLabels = {
            'CLASS_TEACHER': 'Class Teacher',
            'SUBJECT_TEACHER': 'Subject Teacher',
            'HEAD_OF_DEPARTMENT': 'Incharge (Head of Department)',
            'ASSISTANT_TEACHER': 'Assistant Teacher',
            'LAB_ASSISTANT': 'Lab Assistant',
            'SPECIAL_EDUCATOR': 'Special Educator',
            'PHYSICAL_EDUCATION_TEACHER': 'Physical Education Teacher',
            'SUBSTITUTE_TEACHER': 'Substitute Teacher'
        };

        const teachersMapped = rows.map(t => {
            const data = t.toJSON();
            data.departmentName = deptMap[data.department] || data.department;
            data.designationName = designationLabels[data.designation] || data.designation;

            const isSelf = req.user && req.user.id === data.userId;
            if (!canViewSensitive && !isSelf) {
                data.bankName = null;
                data.accountHolderName = null;
                data.accountNumber = null;
                data.ifscCode = null;
                data.bankBranch = null;
                data.fixedMonthlySalary = null;
                data.hourlyRate = null;
                data.aadhaarNo = null;
                data.panNo = null;
            }

            return data;
        });

        return success(res, {
            teachers: teachersMapped,
            pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
        });
    } catch (err) { next(err); }
};

/** GET /api/teachers/me  — must be registered BEFORE /:id in routes */
const getMyTeacherProfile = async (req, res, next) => {
    try {
        const teacher = await Teacher.findOne({
            where: { userId: req.user.id },
            include: [
                ...teacherWithAccount.include,
                {
                    model: db.Classroom,
                    as: 'classrooms',
                    attributes: ['id', 'name', 'section', 'academicYear', 'roomNumber'],
                },
                {
                    model: db.ClassroomSubject,
                    as: 'assignedSubjects',
                    include: [
                        { model: db.Classroom, as: 'classroom', attributes: ['id', 'name', 'section', 'academicYear'] },
                        { model: db.Subject, as: 'subject', attributes: ['id', 'code', 'name', 'type'] },
                    ],
                },
                {
                    model: db.Department,
                    as: 'headedDepartments',
                    attributes: ['id', 'name'],
                },
            ],
        });
        if (!teacher) return error(res, 'Teacher profile not found', 404);
        return success(res, { teacher });
    } catch (err) { next(err); }
};

/** GET /api/teachers/:id */
const getTeacher = async (req, res, next) => {
    try {
        const teacher = await Teacher.findByPk(req.params.id, {
            include: [
                ...teacherWithAccount.include,
                {
                    model: db.Classroom,
                    as: 'classrooms',
                    attributes: ['id', 'name', 'section', 'academicYear', 'roomNumber'],
                },
                {
                    model: db.ClassroomSubject,
                    as: 'assignedSubjects',
                    include: [
                        { model: db.Classroom, as: 'classroom', attributes: ['id', 'name', 'section', 'academicYear'] },
                        { model: db.Subject, as: 'subject', attributes: ['id', 'code', 'name', 'type'] },
                    ],
                },
                {
                    model: db.Department,
                    as: 'headedDepartments',
                    attributes: ['id', 'name'],
                },
            ],
        });
        if (!teacher) return error(res, 'Teacher not found', 404);

        const data = teacher.toJSON();
        const designationLabels = {
            'CLASS_TEACHER': 'Class Teacher',
            'SUBJECT_TEACHER': 'Subject Teacher',
            'HEAD_OF_DEPARTMENT': 'Incharge (Head of Department)',
            'ASSISTANT_TEACHER': 'Assistant Teacher',
            'LAB_ASSISTANT': 'Lab Assistant',
            'SPECIAL_EDUCATOR': 'Special Educator',
            'PHYSICAL_EDUCATION_TEACHER': 'Physical Education Teacher',
            'SUBSTITUTE_TEACHER': 'Substitute Teacher'
        };
        data.designationName = designationLabels[data.designation] || data.designation;
        if (data.department) {
            const dept = await Department.findByPk(data.department);
            data.departmentName = dept ? dept.name : data.department;
        }

        // RBAC Sensitive Data Guard:
        // Sensitive financial & identity items masked unless Super Admin, Admin, HR, or the Teacher themselves
        const userRolesLower = (req.userRoles || []).map(r => String(r).toLowerCase());
        const canViewSensitive = userRolesLower.some(r => ['super_admin', 'admin', 'hr'].includes(r));
        const isSelf = req.user && req.user.id === data.userId;

        data.canViewSensitive = canViewSensitive || isSelf;

        if (!canViewSensitive && !isSelf) {
            data.bankName = null;
            data.accountHolderName = null;
            data.accountNumber = null;
            data.ifscCode = null;
            data.bankBranch = null;
            data.fixedMonthlySalary = null;
            data.hourlyRate = null;
            data.aadhaarNo = null;
            data.panNo = null;
        }

        return success(res, { teacher: data });
    } catch (err) { next(err); }
};

// Auto-generate helper using sequences
const generateNextTeacherCode = async (seqName, prefix, transaction) => {
    let uniqueFound = false;
    let code = '';
    while (!uniqueFound) {
        const [results] = await Teacher.sequelize.query(`SELECT nextval('${seqName}') as seq`, { transaction });
        const candidate = `${prefix}-${String(results[0].seq).padStart(5, '0')}`;
        const exists = await Teacher.findOne({
            where: prefix === 'TCH' ? { teacherId: candidate } : { employeeNumber: candidate },
            paranoid: false,
            transaction
        });
        if (!exists) {
            code = candidate;
            uniqueFound = true;
        }
    }
    return code;
};

/** POST /api/teachers — creates user account + teacher profile atomically */
const createTeacher = async (req, res, next) => {
    const t = await Teacher.sequelize.transaction();

    try {
        const {
            email, password, firstName, lastName, phone, gender, dob,
            aadhaarNo, panNo,
            bankName, accountHolderName, accountNumber, ifscCode, bankBranch,
            currentAddress, permanentAddress,
            emergencyContactName, emergencyContactPhone,
            department, designation, employmentType, qualification, subjects,
            salaryType, fixedMonthlySalary, hourlyRate, dailyWorkingHours,
            casualLeaveBalance, sickLeaveBalance, joiningDate
        } = req.body;

        // Uniqueness checks for email
        const existingUser = await User.findOne({
            where: { email: email.trim().toLowerCase() },
            transaction: t,
            paranoid: false,
        });
        if (existingUser) {
            await t.rollback();
            return error(res, 'Email already exists', 409);
        }

        // Auto-generate unique userId using the PostgreSQL sequence
        let userId = req.body.userId?.trim();
        if (!userId) {
            let uniqueFound = false;
            while (!uniqueFound) {
                const [results] = await Teacher.sequelize.query("SELECT nextval('erp_user_id_seq') as seq", { transaction: t });
                const candidate = `ERP-${String(results[0].seq).padStart(5, '0')}`;
                const exists = await User.findOne({ where: { userId: candidate }, paranoid: false, transaction: t });
                if (!exists) {
                    userId = candidate;
                    uniqueFound = true;
                }
            }
        }

        // Auto-generate teacherId and employeeNumber safely using dedicated sequences
        let teacherId = req.body.teacherId?.trim();
        if (!teacherId) {
            teacherId = await generateNextTeacherCode('teacher_id_seq', 'TCH', t);
        }

        let employeeNumber = req.body.employeeNumber?.trim();
        if (!employeeNumber) {
            employeeNumber = await generateNextTeacherCode('employee_num_seq', 'EMP', t);
        }

        // Create user
        const user = await User.create({
            userId,
            email: email.trim().toLowerCase(),
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone ? String(phone).trim() : undefined,
            gender: gender || undefined,
            dob: dob || undefined,
            isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
        }, { transaction: t });

        // Assign teacher role
        const teacherRole = await Role.findOne({
            where: { name: 'teacher' },
            transaction: t
        });
        if (teacherRole) await user.addRole(teacherRole, { transaction: t });

        // Build teacher payload
        let profilePhotoUrl = req.body.profilePhotoUrl || null;
        if (req.file) {
            profilePhotoUrl = buildTeacherPhotoUrl(req.file.filename);
        }

        let parsedSubjects = [];
        if (Array.isArray(subjects)) {
            parsedSubjects = subjects;
        } else if (typeof subjects === 'string') {
            try {
                parsedSubjects = JSON.parse(subjects);
            } catch {
                parsedSubjects = subjects.split(',').map(s => s.trim()).filter(Boolean);
            }
        }

        const teacherPayload = {
            teacherId,
            userId: user.id,
            employeeNumber,
            department: department || null,
            designation: designation || null,
            qualification: qualification || null,
            joiningDate: joiningDate || new Date(),
            phone: phone ? String(phone).trim() : null,
            subjects: parsedSubjects,
            aadhaarNo: aadhaarNo?.trim() || null,
            panNo: panNo ? panNo.trim().toUpperCase() : null,
            employmentType: employmentType || 'full_time',
            dailyWorkingHours: dailyWorkingHours ? Number(dailyWorkingHours) : 8.0,
            salaryType: salaryType || 'fixed_monthly',
            fixedMonthlySalary: fixedMonthlySalary ? Number(fixedMonthlySalary) : null,
            hourlyRate: hourlyRate ? Number(hourlyRate) : null,
            casualLeaveBalance: casualLeaveBalance !== undefined ? Number(casualLeaveBalance) : 12,
            sickLeaveBalance: sickLeaveBalance !== undefined ? Number(sickLeaveBalance) : 10,
            bankName: bankName?.trim() || null,
            accountHolderName: accountHolderName?.trim() || null,
            accountNumber: accountNumber?.trim() || null,
            ifscCode: ifscCode ? ifscCode.trim().toUpperCase() : null,
            bankBranch: bankBranch?.trim() || null,
            currentAddress: currentAddress?.trim() || null,
            permanentAddress: permanentAddress?.trim() || null,
            emergencyContactName: emergencyContactName?.trim() || null,
            emergencyContactPhone: emergencyContactPhone?.trim() || null,
            profilePhotoUrl,
        };

        const teacher = await Teacher.create(teacherPayload, { transaction: t });
        await t.commit();

        const result = await Teacher.findByPk(teacher.id, teacherWithAccount);

        // Asynchronously dispatch welcome email (non-blocking)
        setImmediate(async () => {
            try {
                await sendTeacherEnrollmentWelcomeEmail({
                    to: user.email,
                    teacherName: `${user.firstName} ${user.lastName}`.trim(),
                    employeeNumber: teacher.employeeNumber,
                    teacherId: teacher.teacherId,
                    email: user.email,
                    password: password, // plain password for initial login welcome note
                    department: teacher.department,
                    designation: teacher.designation,
                });
                logger.info(`[TeacherController] Welcome email successfully sent to ${user.email}`);
            } catch (mailErr) {
                logger.warn(`[TeacherController] Welcome email failed for ${user.email}: ${mailErr.message}`);
            }
        });

        return success(res, { teacher: result }, 'Teacher created successfully', 201);
    } catch (err) {
        await t.rollback();
        next(err);
    }
};

/** PUT /api/teachers/:id */
const updateTeacher = async (req, res, next) => {
    try {
        const teacher = await Teacher.findByPk(req.params.id);
        if (!teacher) return error(res, 'Teacher not found', 404);

        // Teacher profile fields
        const teacherUpdates = {};
        for (const k of TEACHER_FIELDS) {
            if (req.body[k] !== undefined) {
                if (k === 'subjects' && typeof req.body[k] === 'string') {
                    try {
                        teacherUpdates[k] = JSON.parse(req.body[k]);
                    } catch {
                        teacherUpdates[k] = req.body[k].split(',').map(s => s.trim()).filter(Boolean);
                    }
                } else if (k === 'panNo' && req.body[k]) {
                    teacherUpdates[k] = req.body[k].trim().toUpperCase();
                } else if (k === 'ifscCode' && req.body[k]) {
                    teacherUpdates[k] = req.body[k].trim().toUpperCase();
                } else {
                    teacherUpdates[k] = req.body[k];
                }
            }
        }

        if (req.file) {
            teacherUpdates.profilePhotoUrl = buildTeacherPhotoUrl(req.file.filename);
        }

        if (Object.keys(teacherUpdates).length) await teacher.update(teacherUpdates);

        // Linked user fields
        const { firstName, lastName, email, phone, gender, dob, isActive } = req.body;
        const user = await User.findByPk(teacher.userId);
        if (user) {
            const userUpdates = {};
            if (firstName !== undefined) userUpdates.firstName = firstName.trim();
            if (lastName !== undefined) userUpdates.lastName = lastName.trim();
            if (email !== undefined) userUpdates.email = email.trim().toLowerCase();
            if (phone !== undefined) userUpdates.phone = phone ? String(phone).trim() : null;
            if (gender !== undefined) userUpdates.gender = gender;
            if (dob !== undefined) userUpdates.dob = dob;
            if (isActive !== undefined) userUpdates.isActive = Boolean(isActive);

            if (Object.keys(userUpdates).length) {
                await user.update(userUpdates);
            }
        }

        const updated = await Teacher.findByPk(teacher.id, teacherWithAccount);
        return success(res, { teacher: updated }, 'Teacher updated');
    } catch (err) { next(err); }
};

/** DELETE /api/teachers/:id (soft-deletes teacher + user) */
const deleteTeacher = async (req, res, next) => {
    try {
        const teacher = await Teacher.findByPk(req.params.id);
        if (!teacher) return error(res, 'Teacher not found', 404);
        await User.destroy({ where: { id: teacher.userId } });   // paranoid soft-delete cascades
        return success(res, null, 'Teacher deleted');
    } catch (err) { next(err); }
};

export { listTeachers, getMyTeacherProfile, getTeacher, createTeacher, updateTeacher, deleteTeacher };

