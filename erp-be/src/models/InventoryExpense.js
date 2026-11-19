'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * InventoryItem: Campus asset or consumable stock item
 */
export const InventoryItem = sequelize.define('InventoryItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    itemCode: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    category: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Stationery' },
    unitOfMeasure: { type: DataTypes.STRING(30), defaultValue: 'PIECE' }, // e.g. PACK, BOX, PIECE
    currentQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    reorderLevel: { type: DataTypes.INTEGER, defaultValue: 10 },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    location: { type: DataTypes.STRING(100), allowNull: true }, // Store Room A, Rack 2
    status: { type: DataTypes.ENUM('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'), defaultValue: 'IN_STOCK' },
}, {
    tableName: 'inventory_items',
    timestamps: true,
    underscored: true,
});

/**
 * ExpenseVoucher: School expenditure and operational bills
 */
export const ExpenseVoucher = sequelize.define('ExpenseVoucher', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    voucherNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    category: { type: DataTypes.STRING(100), allowNull: false }, // Maintenance, Electricity, Lab Supplies
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    paymentMode: { type: DataTypes.ENUM('CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI'), defaultValue: 'BANK_TRANSFER' },
    expenseDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    vendorName: { type: DataTypes.STRING(150), allowNull: true },
    paidTo: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    approvedById: { type: DataTypes.UUID, allowNull: true },
    receiptAttachmentUrl: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'), defaultValue: 'APPROVED' },
}, {
    tableName: 'expense_vouchers',
    timestamps: true,
    underscored: true,
});

export default { InventoryItem, ExpenseVoucher };

