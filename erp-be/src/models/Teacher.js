'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Teacher = sequelize.define('Teacher', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },

    // FK to users
    userId: {
        type: DataTypes.UUID, allowNull: false, unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
    },

    // ── Identity ──────────────────────────────────────────────────────────────
    teacherId: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    employeeNumber: { type: DataTypes.STRING(50), allowNull: true, unique: true },
    aadhaarNo: { type: DataTypes.STRING(12), allowNull: true },   // 12-digit Aadhaar
    panNo: { type: DataTypes.STRING(10), allowNull: true },   // 10-char PAN

    // ── Professional ──────────────────────────────────────────────────────────
    department: { type: DataTypes.STRING(100), allowNull: true },
    designation: {
        type: DataTypes.ENUM(
            'CLASS_TEACHER',
            'SUBJECT_TEACHER',
            'HEAD_OF_DEPARTMENT',
            'ASSISTANT_TEACHER',
            'LAB_ASSISTANT',
            'SPECIAL_EDUCATOR',
            'PHYSICAL_EDUCATION_TEACHER',
            'SUBSTITUTE_TEACHER'
        ),
        allowNull: true
    },
    qualification: { type: DataTypes.STRING(200), allowNull: true },
    joiningDate: { type: DataTypes.DATEONLY, allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    subjects: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: [] },

    // ── Employment type ───────────────────────────────────────────────────────
    employmentType: {
        type: DataTypes.ENUM('part_time', 'full_time', 'double_shift', 'casual', 'hourly'),
        allowNull: false,
        defaultValue: 'full_time',
    },

    // ── Working hours ─────────────────────────────────────────────────────────
    // Standard daily working hours (e.g. 8 for full-time, 4 for part-time)
    dailyWorkingHours: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 8.00,
        comment: 'Standard daily working hours',
    },

    // ── Salary ────────────────────────────────────────────────────────────────
    salaryType: {
        type: DataTypes.ENUM('fixed_monthly', 'hourly'),
        allowNull: false,
        defaultValue: 'fixed_monthly',
    },
    fixedMonthlySalary: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Used when salaryType = fixed_monthly',
    },
    hourlyRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Used when salaryType = hourly',
    },

    // ── Leave entitlement ─────────────────────────────────────────────────────
    casualLeaveBalance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 12,          // 12 casual leaves per year by default
        comment: 'Annual casual leave balance',
    },
    sickLeaveBalance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 6,
        comment: 'Annual sick leave balance',
    },

    // ── Bank details ──────────────────────────────────────────────────────────
    bankName: { type: DataTypes.STRING(100), allowNull: true },
    accountNumber: { type: DataTypes.STRING(20), allowNull: true },   // stored encrypted at app level
    ifscCode: { type: DataTypes.STRING(11), allowNull: true },

}, { tableName: 'teachers' });

export default Teacher;
