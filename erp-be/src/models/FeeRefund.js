'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FeeRefund = sequelize.define('FeeRefund', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    refundVoucherNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'refund_voucher_number',
    },
    studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'student_id',
        references: { model: 'students', key: 'id' },
        onDelete: 'CASCADE',
    },
    paymentId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'payment_id',
        references: { model: 'fee_payments', key: 'id' },
        onDelete: 'SET NULL',
    },
    refundType: {
        type: DataTypes.ENUM('ADMISSION_CANCEL', 'SECURITY_DEPOSIT', 'EXCESS_PAYMENT', 'SCHOLARSHIP_RETRO', 'OTHER'),
        allowNull: false,
        defaultValue: 'OTHER',
        field: 'refund_type',
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0.01 },
    },
    status: {
        type: DataTypes.ENUM('REQUESTED', 'APPROVED', 'PAID', 'REJECTED'),
        allowNull: false,
        defaultValue: 'REQUESTED',
    },
    paymentMode: {
        type: DataTypes.ENUM('CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI'),
        allowNull: false,
        defaultValue: 'BANK_TRANSFER',
        field: 'payment_mode',
    },
    transactionReference: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'transaction_reference',
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    requestedById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'requested_by_id',
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
    },
    approvedById: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'approved_by_id',
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
    },
    disbursedAt: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'disbursed_at',
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
    },
}, {
    tableName: 'fee_refunds',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['refund_voucher_number'],
            name: 'unique_fee_refund_voucher_number',
            where: { deleted_at: null },
        },
        {
            fields: ['student_id'],
        },
        {
            fields: ['status'],
        },
        {
            fields: ['created_at'],
        },
    ],
});

export default FeeRefund;

