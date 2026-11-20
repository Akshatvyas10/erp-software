'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StudentInvoiceInstallment = sequelize.define('StudentInvoiceInstallment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    studentInvoiceId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'student_invoice_id',
        references: { model: 'student_invoices', key: 'id' },
        onDelete: 'CASCADE',
    },
    installmentNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'installment_number',
    },
    title: {
        type: DataTypes.STRING(120),
        allowNull: false,
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'due_date',
    },
    baseAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'base_amount',
    },
    lateFineAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'late_fine_amount',
    },
    waivedFineAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'waived_fine_amount',
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'total_amount',
    },
    paidAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'paid_amount',
    },
    balanceAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'balance_amount',
    },
    status: {
        type: DataTypes.STRING(25),
        defaultValue: 'PENDING',
        validate: { isIn: [['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE']] },
    },
    fineWaivedById: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'fine_waived_by_id',
        references: { model: 'users', key: 'id' },
    },
    fineWaivedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'fine_waived_at',
    },
    fineWaiveReason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'fine_waive_reason',
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'student_invoice_installments',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
        {
            fields: ['student_invoice_id'],
        },
        {
            fields: ['due_date'],
        },
        {
            fields: ['status'],
        },
    ],
});

export default StudentInvoiceInstallment;

