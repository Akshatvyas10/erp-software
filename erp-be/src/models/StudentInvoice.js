'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StudentInvoice = sequelize.define('StudentInvoice', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    invoiceNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'invoice_number',
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
    academicYearId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'academic_year_id',
        references: { model: 'academic_years', key: 'id' },
        onDelete: 'CASCADE',
    },
    feeStructureId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'fee_structure_id',
        references: { model: 'fee_structures', key: 'id' },
        onDelete: 'SET NULL',
    },
    periodKey: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'period_key',
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
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        field: 'discount_amount',
    },
    fineAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        field: 'fine_amount',
    },
    waivedFineAmount: {
        type: DataTypes.DECIMAL(10, 2),
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
        defaultValue: 'ISSUED',
        validate: { isIn: [['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']] },
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    createdById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'created_by_id',
        references: { model: 'users', key: 'id' },
    },
}, {
    tableName: 'student_invoices',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['invoice_number'],
            name: 'unique_student_invoice_number',
            where: { deleted_at: null },
        },
        {
            fields: ['student_id'],
        },
        {
            fields: ['classroom_id'],
        },
        {
            fields: ['academic_year_id'],
        },
        {
            fields: ['status'],
        },
    ],
});

export default StudentInvoice;

