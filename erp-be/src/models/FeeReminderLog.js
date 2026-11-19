'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FeeReminderLog = sequelize.define('FeeReminderLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
        allowNull: true,
        field: 'classroom_id',
        references: { model: 'classrooms', key: 'id' },
        onDelete: 'SET NULL',
    },
    periodKey: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'period_key',
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'due_date',
    },
    installmentDue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'installment_due',
    },
    arrears: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'arrears',
    },
    advanceCredit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'advance_credit',
    },
    payableAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'payable_amount',
    },
    channel: {
        type: DataTypes.ENUM('EMAIL', 'SMS', 'WHATSAPP'),
        defaultValue: 'EMAIL',
        allowNull: false,
        field: 'channel',
    },
    recipientEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'recipient_email',
    },
    status: {
        type: DataTypes.ENUM('QUEUED', 'SENT', 'SKIPPED', 'FAILED'),
        allowNull: false,
        defaultValue: 'QUEUED',
        field: 'status',
    },
    skipReason: {
        type: DataTypes.ENUM('CURRENT_PAID', 'FULLY_PAID', 'NO_DUE', 'INACTIVE', 'ALREADY_REMINDED_TODAY', 'NO_EMAIL'),
        allowNull: true,
        field: 'skip_reason',
    },
    sentById: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'sent_by_id',
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'sent_at',
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'error_message',
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        field: 'metadata',
    },
}, {
    tableName: 'fee_reminder_logs',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
        {
            fields: ['student_id'],
        },
        {
            fields: ['period_key'],
        },
        {
            fields: ['status'],
        },
        {
            fields: ['created_at'],
        },
    ],
});

export default FeeReminderLog;

