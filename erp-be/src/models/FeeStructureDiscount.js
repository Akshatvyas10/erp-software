'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FeeStructureDiscount = sequelize.define('FeeStructureDiscount', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    feeStructureId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'fee_structure_id',
        references: { model: 'fee_structures', key: 'id' },
        onDelete: 'CASCADE',
    },
    quota: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [['GENERAL', 'STAFF_CHILD', 'SCHOLARSHIP_HALF', 'SCHOLARSHIP_FULL', 'SIBLING_DISCOUNT', 'RTE', 'OTHER']] },
    },
    discountType: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PERCENTAGE',
        field: 'discount_type',
        validate: { isIn: [['PERCENTAGE', 'FIXED_AMOUNT']] },
    },
    discountValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'discount_value',
        validate: { min: 0 },
    },
    scope: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'ALL_HEADS',
        validate: { isIn: [['ALL_HEADS', 'SPECIFIC_HEADS']] },
    },
    applicableFeeHeadIds: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: true,
        field: 'applicable_fee_head_ids',
        defaultValue: [],
    },
}, {
    tableName: 'fee_structure_discounts',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            fields: ['fee_structure_id'],
        },
    ],
});

export default FeeStructureDiscount;

