'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LeaveRule = sequelize.define('LeaveRule', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    academicYearId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'academic_year_id',
        references: { model: 'academic_years', key: 'id' },
        onDelete: 'CASCADE',
    },
    ruleName: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: 'rule_name',
        defaultValue: 'Default Teacher Leave Policy',
    },
    casualLeaveCount: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 12.0,
        field: 'casual_leave_count',
    },
    sickLeaveCount: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 10.0,
        field: 'sick_leave_count',
    },
    earnedLeaveCount: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 15.0,
        field: 'earned_leave_count',
    },
    maternityLeaveCount: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 90.0,
        field: 'maternity_leave_count',
    },
    leaveWithoutPayCount: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 30.0,
        field: 'leave_without_pay_count',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
    },
    // Audit Fields with User Snapshot
    createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by',
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
    },
    createdByName: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'created_by_name',
    },
    updatedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'updated_by',
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
    },
    updatedByName: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'updated_by_name',
    },
}, {
    tableName: 'leave_rules',
    indexes: [
        { fields: ['academic_year_id'], name: 'idx_leave_rules_year' },
        { fields: ['is_active'], name: 'idx_leave_rules_active' },
    ],
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default LeaveRule;
