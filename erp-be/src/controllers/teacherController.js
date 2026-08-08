'use strict';

import { Op } from 'sequelize';
import db from '../models/index.js';
const { Teacher, User, Role, Department } = db;
import { success, error } from '../utils/apiResponse.js';

// All teacher-owned fields allowed on create / update
const TEACHER_FIELDS = [
    'employeeNumber', 'department', 'designation', 'qualification',
    'joiningDate', 'phone', 'subjects',
    // new
    'aadhaarNo', 'panNo',
    'employmentType', 'dailyWorkingHours',
    'salaryType', 'fixedMonthlySalary', 'hourlyRate',
    'casualLeaveBalance', 'sickLeaveBalance',
    'bankName', 'accountNumber', 'ifscCode',
];

const teacherWithAccount = {
    include: [{
        model: User,
        as: 'account',
        attributes: ['id', 'userId', 'email', 'firstName', 'lastName', 'isActive', 'lastLoginAt'],
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

        const { count, rows } = await Teacher.findAndCountAll({
            where,
            ...teacherWithAccount,
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
            'HEAD_OF_DEPARTMENT': 'Head of Department',
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
        const teacher = await Teacher.findOne({ where: { userId: req.user.id }, ...teacherWithAccount });
        if (!teacher) return error(res, 'Teacher profile not found', 404);
        return success(res, { teacher });
    } catch (err) { next(err); }
};

/** GET /api/teachers/:id */
const getTeacher = async (req, res, next) => {
    try {
        const teacher = await Teacher.findByPk(req.params.id, teacherWithAccount);
        if (!teacher) return error(res, 'Teacher not found', 404);
        
        const data = teacher.toJSON();
        const designationLabels = {
            'CLASS_TEACHER': 'Class Teacher',
            'SUBJECT_TEACHER': 'Subject Teacher',
            'HEAD_OF_DEPARTMENT': 'Head of Department',
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

        return success(res, { teacher: data });
    } catch (err) { next(err); }
};

/** POST /api/teachers — creates user account + teacher profile atomically */
const createTeacher = async (req, res, next) => {
    const t = await Teacher.sequelize.transaction();
    try {
        const {
            email, password, firstName, lastName,
        } = req.body;

        // Auto-generate userId sequentially (ERP-00001)
        const lastUser = await User.findOne({
            where: { userId: { [Op.like]: 'ERP-%' } },
            order: [['userId', 'DESC']],
            transaction: t,
            paranoid: false
        });
        let nextUserId = 1;
        if (lastUser && lastUser.userId) {
            const lastNum = parseInt(lastUser.userId.replace('ERP-', ''), 10);
            if (!isNaN(lastNum)) {
                nextUserId = lastNum + 1;
            }
        }
        const userId = `ERP-${String(nextUserId).padStart(5, '0')}`;

        // Uniqueness checks for email (userId is auto-generated and unique)
        const existingUser = await User.findOne({
            where: { email },
        });
        if (existingUser) {
            await t.rollback();
            return error(res, 'Email already exists', 409);
        }

        // Auto-generate teacherId sequentially (TCH-00001)
        const lastTeacher = await Teacher.findOne({
            where: { teacherId: { [Op.like]: 'TCH-%' } },
            order: [['teacherId', 'DESC']],
            transaction: t,
            paranoid: false
        });
        let nextNumber = 1;
        if (lastTeacher && lastTeacher.teacherId) {
            const lastNumber = parseInt(lastTeacher.teacherId.replace('TCH-', ''), 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
        const teacherId = `TCH-${String(nextNumber).padStart(5, '0')}`;
        
        // Use teacherId for employeeNumber if not provided, or auto-generate EMP-XXXXX
        // For simplicity, let's use the teacherId as the employeeNumber for now if it's auto-generated, or EMP-equivalent
        const employeeNumber = `EMP-${String(nextNumber).padStart(5, '0')}`;

        // Create user
        const user = await User.create({ userId, email, password, firstName, lastName }, { transaction: t });

        // Assign teacher role
        const teacherRole = await Role.findOne({ where: { name: 'teacher' } });
        if (teacherRole) await user.addRole(teacherRole, { transaction: t });

        // Build teacher payload — pick all allowed fields from body
        const teacherPayload = { teacherId, userId: user.id, employeeNumber };
        for (const k of TEACHER_FIELDS) {
            if (req.body[k] !== undefined && k !== 'employeeNumber') teacherPayload[k] = req.body[k];
        }
        if (!teacherPayload.subjects) teacherPayload.subjects = [];

        const teacher = await Teacher.create(teacherPayload, { transaction: t });
        await t.commit();

        const result = await Teacher.findByPk(teacher.id, teacherWithAccount);
        return success(res, { teacher: result }, 'Teacher created', 201);
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
            if (req.body[k] !== undefined) teacherUpdates[k] = req.body[k];
        }
        if (Object.keys(teacherUpdates).length) await teacher.update(teacherUpdates);

        // Linked user fields
        const { firstName, lastName, email } = req.body;
        if (firstName || lastName || email) {
            const user = await User.findByPk(teacher.userId);
            if (user) {
                const userUpdates = {};
                if (firstName) userUpdates.firstName = firstName;
                if (lastName) userUpdates.lastName = lastName;
                if (email) userUpdates.email = email;
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
