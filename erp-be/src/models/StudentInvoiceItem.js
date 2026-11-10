'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StudentInvoiceItem = sequelize.define('StudentInvoiceItem', {
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
    feeHeadId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'fee_head_id',
        references: { model: 'fee_heads', key: 'id' },
        onDelete: 'SET NULL',
    },
    headName: {
        type: DataTypes.STRING(80),
        allowNull: false,
        field: 'head_name',
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
}, {
    tableName: 'student_invoice_items',
    timestamps: true,
    indexes: [
        {
            fields: ['student_invoice_id'],
        },
    ],
});

export default StudentInvoiceItem;

