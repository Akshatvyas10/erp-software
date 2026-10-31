'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TeacherLeaveAccrual = sequelize.define('TeacherLeaveAccrual', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    teacherId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'teacher_id',
        references: { model: 'teachers', key: 'id' },
        onDelete: 'CASCADE',
    },
    leaveTypeId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'leave_type_id',
        references: { model: 'leave_types', key: 'id' },
        onDelete: 'CASCADE',
    },
    academicYearId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'academic_year_id',
        references: { model: 'academic_years', key: 'id' },
        onDelete: 'CASCADE',
    },
    yearMonth: {
        type: DataTypes.STRING(7), // e.g. '2026-10'
        allowNull: false,
        field: 'year_month',
    },
    creditedDays: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0.0,
        field: 'credited_days',
    },
    carriedOverDays: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0.0,
        field: 'carried_over_days',
    },
    advanceBorrowedDays: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0.0,
        field: 'advance_borrowed_days',
    },
    advanceRepaidDays: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0.0,
        field: 'advance_repaid_days',
    },
    consumedDays: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0.0,
        field: 'consumed_days',
    },
    remainingBalance: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0.0,
        field: 'remaining_balance',
    },
}, {
    tableName: 'teacher_leave_accruals',
    indexes: [
        {
            unique: true,
            fields: ['teacher_id', 'leave_type_id', 'year_month'],
            name: 'uniq_teacher_leave_month_accrual',
        },
        { fields: ['academic_year_id'], name: 'idx_accrual_year' },
    ],
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default TeacherLeaveAccrual;
