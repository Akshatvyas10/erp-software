'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SalarySlip = sequelize.define('SalarySlip', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    teacherId: {
        type: DataTypes.UUID, allowNull: false, field: 'teacher_id',
        references: { model: 'teachers', key: 'id' },
        onDelete: 'CASCADE',
    },

    month: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 12 } },
    year: { type: DataTypes.INTEGER, allowNull: false },

    // Attendance summary
    totalWorkingDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_working_days' },
    presentDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'present_days' },
    absentDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'absent_days' },
    leaveDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'leave_days' },
    halfDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'half_days' },
    totalHoursWorked: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'total_hours_worked' },

    // Salary calculation — use STRING to avoid ENUM ALTER issues
    salaryType: {
        type: DataTypes.STRING(20), allowNull: false, defaultValue: 'fixed_monthly', field: 'salary_type',
        validate: { isIn: [['fixed_monthly', 'hourly']] }
    },
    basicSalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'basic_salary' },
    hourlyRate: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'hourly_rate' },
    grossSalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'gross_salary' },

    // Deductions
    absentDeduction: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'absent_deduction' },
    unpaidLeaveDeduction: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'unpaid_leave_deduction' },
    otherDeductions: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'other_deductions' },
    totalDeductions: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'total_deductions' },
    netSalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'net_salary' },

    // Bank / payment
    bankName: { type: DataTypes.STRING(100), allowNull: true, field: 'bank_name' },
    accountNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'account_number' },
    ifscCode: { type: DataTypes.STRING(11), allowNull: true, field: 'ifsc_code' },

    paymentStatus: {
        type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending', field: 'payment_status',
        validate: { isIn: [['pending', 'paid', 'on_hold']] },
    },
    paymentDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'payment_date' },
    paidBy: { type: DataTypes.UUID, allowNull: true, field: 'paid_by', comment: 'User who marked as paid' },

    remarks: { type: DataTypes.TEXT, allowNull: true },

}, {
    tableName: 'salary_slips',
    indexes: [
        { unique: true, fields: ['teacher_id', 'month', 'year'], name: 'unique_salary_month_year' },
    ],
    paranoid: false,
    timestamps: true,
});

module.exports = SalarySlip;
