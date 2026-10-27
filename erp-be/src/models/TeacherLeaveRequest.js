'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TeacherLeaveRequest = sequelize.define('TeacherLeaveRequest', {
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
        onDelete: 'RESTRICT',
    },
    academicYearId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'academic_year_id',
        references: { model: 'academic_years', key: 'id' },
        onDelete: 'RESTRICT',
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
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PENDING',
        validate: { isIn: [['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']] },
    },
    decidedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'decided_by',
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
    tableName: 'teacher_leave_requests',
    indexes: [
        { fields: ['teacher_id', 'status'], name: 'idx_tlr_teacher_status' },
        { fields: ['from_date', 'to_date'], name: 'idx_tlr_dates' },
        { fields: ['academic_year_id'], name: 'idx_tlr_academic_year' },
    ],
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default TeacherLeaveRequest;
