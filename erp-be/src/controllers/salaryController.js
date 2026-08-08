'use strict';

import { Op } from 'sequelize';
import db from '../models/index.js';
const { Teacher, SalarySlip, TeacherAttendance, User } = db;
import { success, error } from '../utils/apiResponse.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

const teacherFields = ['id', 'teacherId', 'employeeNumber', 'department', 'designation',
    'salaryType', 'fixedMonthlySalary', 'hourlyRate', 'dailyWorkingHours',
    'bankName', 'accountNumber', 'ifscCode'];

const accountFields = ['id', 'userId', 'firstName', 'lastName', 'email'];

/**
 * Calculate salary for a teacher for a given month/year based on attendance.
 */
const calculateSalary = (teacher, attendanceRows, month, year) => {
    const totalWorkingDays = attendanceRows.length;
    const present = attendanceRows.filter(a => a.status === 'present').length;
    const halfDays = attendanceRows.filter(a => a.status === 'half_day').length;
    const onLeave = attendanceRows.filter(a => a.status === 'on_leave').length;
    const absent = attendanceRows.filter(a => a.status === 'absent').length;
    const totalHoursWorked = attendanceRows.reduce((sum, a) => sum + parseFloat(a.hoursWorked || 0), 0);

    let basicSalary = 0;
    let absentDeduction = 0;
    let unpaidLeaveDeduction = 0;

    if (teacher.salaryType === 'fixed_monthly') {
        const monthly = parseFloat(teacher.fixedMonthlySalary || 0);
        const perDay = totalWorkingDays > 0 ? monthly / totalWorkingDays : 0;

        basicSalary = monthly;
        absentDeduction = absent * perDay;
        unpaidLeaveDeduction = 0; // casual/sick leaves are paid

        // Half day deducts half a day's pay
        absentDeduction += (halfDays * perDay * 0.5);

    } else {
        // hourly
        const rate = parseFloat(teacher.hourlyRate || 0);
        basicSalary = totalHoursWorked * rate;
    }

    const totalDeductions = absentDeduction + unpaidLeaveDeduction;
    const grossSalary = basicSalary;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    return {
        month, year,
        totalWorkingDays, presentDays: present, absentDays: absent,
        leaveDays: onLeave, halfDays, totalHoursWorked,
        salaryType: teacher.salaryType,
        basicSalary: parseFloat(basicSalary.toFixed(2)),
        hourlyRate: parseFloat(teacher.hourlyRate || 0),
        grossSalary: parseFloat(grossSalary.toFixed(2)),
        absentDeduction: parseFloat(absentDeduction.toFixed(2)),
        unpaidLeaveDeduction: parseFloat(unpaidLeaveDeduction.toFixed(2)),
        otherDeductions: 0,
        totalDeductions: parseFloat(totalDeductions.toFixed(2)),
        netSalary: parseFloat(netSalary.toFixed(2)),
        bankName: teacher.bankName,
        accountNumber: teacher.accountNumber,
        ifscCode: teacher.ifscCode,
    };
};

// ─── GET /api/salary/:teacherId/preview?month=&year= ─────────────────────────
/**
 * Preview salary calculation without saving — used before generating the slip.
 */
const previewSalary = async (req, res, next) => {
    try {
        const { teacherId } = req.params;
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);

        if (!month || !year || month < 1 || month > 12) {
            return error(res, 'Valid month (1-12) and year are required', 422);
        }

        const teacher = await Teacher.findByPk(teacherId, {
            attributes: teacherFields,
            include: [{ model: User, as: 'account', attributes: accountFields }],
        });
        if (!teacher) return error(res, 'Teacher not found', 404);

        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const end = new Date(year, month, 0).toISOString().split('T')[0]; // last day

        const attendance = await TeacherAttendance.findAll({
            where: { teacherId, date: { [Op.between]: [start, end] } },
            order: [['date', 'ASC']],
        });

        const calculation = calculateSalary(teacher, attendance, month, year);

        return success(res, {
            teacher: { ...teacher.toJSON(), account: teacher.account },
            attendance,
            calculation,
        });
    } catch (err) { next(err); }
};

// ─── POST /api/salary/:teacherId/generate ────────────────────────────────────
/**
 * Generate (create or recalculate) a salary slip for a month/year.
 */
const generateSalarySlip = async (req, res, next) => {
    try {
        const { teacherId } = req.params;
        const { month, year, otherDeductions = 0, remarks = '' } = req.body;

        if (!month || !year) return error(res, 'month and year are required', 422);

        const teacher = await Teacher.findByPk(teacherId, {
            attributes: teacherFields,
            include: [{ model: User, as: 'account', attributes: accountFields }],
        });
        if (!teacher) return error(res, 'Teacher not found', 404);

        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const end = new Date(year, month, 0).toISOString().split('T')[0];

        const attendance = await TeacherAttendance.findAll({
            where: { teacherId, date: { [Op.between]: [start, end] } },
        });

        const calc = calculateSalary(teacher, attendance, month, year);
        calc.otherDeductions = parseFloat(otherDeductions);
        calc.totalDeductions = parseFloat((calc.absentDeduction + calc.unpaidLeaveDeduction + calc.otherDeductions).toFixed(2));
        calc.netSalary = parseFloat(Math.max(0, calc.grossSalary - calc.totalDeductions).toFixed(2));
        calc.remarks = remarks;

        const [slip, created] = await SalarySlip.upsert(
            { teacherId, ...calc },
            { returning: true }
        );

        const full = await SalarySlip.findByPk(slip.id ?? slip[0]?.id, {
            include: [{
                model: Teacher,
                as: 'teacher',
                attributes: teacherFields,
                include: [{ model: User, as: 'account', attributes: accountFields }],
            }],
        });

        return success(res, { slip: full }, created ? 'Salary slip generated' : 'Salary slip updated', 201);
    } catch (err) { next(err); }
};

// ─── GET /api/salary/:teacherId ───────────────────────────────────────────────
/**
 * All salary slips for a teacher.
 */
const getTeacherSalarySlips = async (req, res, next) => {
    try {
        const slips = await SalarySlip.findAll({
            where: { teacherId: req.params.teacherId },
            order: [['year', 'DESC'], ['month', 'DESC']],
        });
        return success(res, { slips });
    } catch (err) { next(err); }
};

// ─── GET /api/salary/slip/:slipId ─────────────────────────────────────────────
/**
 * Single salary slip with full teacher details (for printing).
 */
const getSalarySlip = async (req, res, next) => {
    try {
        const slip = await SalarySlip.findByPk(req.params.slipId, {
            include: [{
                model: Teacher,
                as: 'teacher',
                attributes: [...teacherFields, 'phone', 'qualification'],
                include: [{ model: User, as: 'account', attributes: accountFields }],
            }],
        });
        if (!slip) return error(res, 'Salary slip not found', 404);
        return success(res, { slip });
    } catch (err) { next(err); }
};

// ─── PATCH /api/salary/slip/:slipId/status ────────────────────────────────────
const updatePaymentStatus = async (req, res, next) => {
    try {
        const { status, paymentDate } = req.body;
        const slip = await SalarySlip.findByPk(req.params.slipId);
        if (!slip) return error(res, 'Slip not found', 404);
        await slip.update({
            paymentStatus: status,
            paymentDate: paymentDate || new Date(),
            paidBy: req.user?.id,
        });
        return success(res, { slip }, 'Payment status updated');
    } catch (err) { next(err); }
};

// ─── GET /api/salary ──────────────────────────────────────────────────────────
/**
 * List all salary slips (optionally filter by month/year).
 */
const listAllSalarySlips = async (req, res, next) => {
    try {
        const where = {};
        if (req.query.month) where.month = parseInt(req.query.month);
        if (req.query.year) where.year = parseInt(req.query.year);
        if (req.query.status) where.paymentStatus = req.query.status;

        const slips = await SalarySlip.findAll({
            where,
            include: [{
                model: Teacher,
                as: 'teacher',
                attributes: teacherFields,
                include: [{ model: User, as: 'account', attributes: accountFields }],
            }],
            order: [['year', 'DESC'], ['month', 'DESC'], ['createdAt', 'DESC']],
        });
        return success(res, { slips });
    } catch (err) { next(err); }
};

export {
    previewSalary, generateSalarySlip, getTeacherSalarySlips,
    getSalarySlip, updatePaymentStatus, listAllSalarySlips,
};
