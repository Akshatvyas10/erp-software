'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FeeStructure = sequelize.define('FeeStructure', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    academicYearId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'academic_year_id',
        references: { model: 'academic_years', key: 'id' },
        onDelete: 'CASCADE',
    },
    academicClassId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'academic_class_id',
        references: { model: 'academic_classes', key: 'id' },
        onDelete: 'CASCADE',
    },
    quota: {
        type: DataTypes.STRING(30),
        defaultValue: 'GENERAL',
        validate: { isIn: [['GENERAL', 'STAFF_CHILD', 'SCHOLARSHIP', 'SIBLING_DISCOUNT', 'RTE']] },
    },
    frequency: {
        type: DataTypes.STRING(20),
        defaultValue: 'MONTHLY',
        validate: { isIn: [['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'TERM_WISE', 'ANNUAL']] },
    },
    dueDayOfMonth: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
        field: 'due_day_of_month',
        validate: { min: 1, max: 31 },
    },
    lateFinePerDay: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        field: 'late_fine_per_day',
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'ACTIVE',
        validate: { isIn: [['ACTIVE', 'INACTIVE']] },
    },
}, {
    tableName: 'fee_structures',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            fields: ['academic_year_id'],
        },
        {
            fields: ['academic_class_id'],
        },
    ],
});

export default FeeStructure;

