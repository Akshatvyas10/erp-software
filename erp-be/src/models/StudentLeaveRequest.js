'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StudentLeaveRequest = sequelize.define('StudentLeaveRequest', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'student_id',
        references: { model: 'students', key: 'id' },
        onDelete: 'CASCADE',
    },
    classroomId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'classroom_id',
        references: { model: 'classrooms', key: 'id' },
        onDelete: 'CASCADE',
    },
    departmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'department_id',
        references: { model: 'departments', key: 'id' },
        onDelete: 'SET NULL',
    },
    academicYearId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'academic_year_id',
        references: { model: 'academic_years', key: 'id' },
        onDelete: 'RESTRICT',
    },
    category: {
        type: DataTypes.ENUM('MEDICAL', 'CASUAL_PERSONAL', 'FAMILY_EVENT', 'OFFICIAL_DUTY'),
        allowNull: false,
        defaultValue: 'CASUAL_PERSONAL',
    },
    fromDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'from_date',
    },
    toDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'to_date',
    },
    totalDays: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        field: 'total_days',
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    attachmentUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'attachment_url',
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
    },
    decidedByRole: {
        type: DataTypes.ENUM('CLASS_TEACHER', 'DEPARTMENT_INCHARGE', 'ADMIN'),
        allowNull: true,
        field: 'decided_by_role',
    },
    decidedByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'decided_by_user_id',
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
    },
    actionByName: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'action_by_name',
    },
    decidedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'decided_at',
    },
    decisionRemark: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'decision_remark',
    },
    cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'cancelled_at',
    },
    cancellationReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'cancellation_reason',
    },
}, {
    tableName: 'student_leave_requests',
    indexes: [
        { fields: ['student_id', 'status'], name: 'idx_slr_student_status' },
        { fields: ['classroom_id', 'status'], name: 'idx_slr_classroom_status' },
        { fields: ['department_id'], name: 'idx_slr_department' },
        { fields: ['from_date', 'to_date'], name: 'idx_slr_dates' },
        { fields: ['academic_year_id'], name: 'idx_slr_academic_year' },
    ],
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default StudentLeaveRequest;
