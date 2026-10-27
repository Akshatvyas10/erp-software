'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LeaveType = sequelize.define('LeaveType', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Unique code e.g. CL, SL, EL, ML',
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Display title e.g. Casual Leave, Sick Leave',
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isPaid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_paid',
        comment: 'Whether leave is paid or causes salary deduction',
    },
    defaultDaysPerYear: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 12.0,
        field: 'default_days_per_year',
        comment: 'Default annual quota granted to teachers',
    },
    maxConsecutiveDays: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'max_consecutive_days',
        comment: 'Max limit on single request span',
    },
    requiresAttachment: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'requires_attachment',
        comment: 'e.g. Doctor note for sick leave',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
    },
}, {
    tableName: 'leave_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default LeaveType;
