'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FeePayment = sequelize.define('FeePayment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    receiptNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'receipt_number',
    },
    studentInvoiceId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'student_invoice_id',
        references: { model: 'student_invoices', key: 'id' },
        onDelete: 'CASCADE',
    },
    studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'student_id',
        references: { model: 'students', key: 'id' },
        onDelete: 'CASCADE',
    },
    amountPaid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'amount_paid',
        validate: { min: 0.01 },
    },
    paymentMode: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'payment_mode',
        defaultValue: 'CASH',
        validate: { isIn: [['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'ONLINE']] },
    },
    referenceNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'reference_number',
    },
    paymentDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'payment_date',
        defaultValue: DataTypes.NOW,
    },
    paidByName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'paid_by_name',
    },
    collectedById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'collected_by_id',
        references: { model: 'users', key: 'id' },
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'SUCCESS',
        validate: { isIn: [['SUCCESS', 'BOUNCED', 'REVERSED']] },
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'fee_payments',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['receipt_number'],
            name: 'unique_fee_receipt_number',
            where: { deleted_at: null },
        },
        {
            fields: ['student_invoice_id'],
        },
        {
            fields: ['student_id'],
        },
        {
            fields: ['payment_date'],
        },
    ],
});

export default FeePayment;

