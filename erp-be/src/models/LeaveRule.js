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
    status: {
        type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE',
        field: 'status',
    },
    version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'version',
    },
    appliesTo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'ALL', // 'ALL', 'DEPARTMENT', 'EMPLOYMENT_TYPE'
        field: 'applies_to',
    },
    targetDepartments: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: true,
        defaultValue: [],
        field: 'target_departments',
    },
    targetEmploymentTypes: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [], // e.g. ['FULL_TIME', 'PROBATION', 'CONTRACT']
        field: 'target_employment_types',
    },
    effectiveFrom: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'effective_from',
    },
    effectiveTo: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'effective_to',
    },

    // Backward compatible summary quota numbers
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

    /**
     * Per-leave-type configuration map (keyed by leave code e.g. 'CL', 'SL', 'EL', 'ML', 'LWP')
     * Structure per type:
     * {
     *   enabled: boolean,
     *   allocationMode: 'MONTHLY' | 'YEARLY',
     *   monthlyCreditCount: number,     // e.g. 1.0 for 1 CL/month
     *   yearlyTotalQuota: number,       // e.g. 12.0
     *   maxPerRequest: number,
     *   maxPerMonth: number,
     *   maxPerYear: number,
     *   requiresAttachment: boolean,
     *   isPaid: boolean,
     *   allowNegativeBalance: boolean,
     *   allowAdvanceFromFutureMonths: boolean,
     *   advanceLimit: number,           // e.g. 1.0 day from next month
     *   carryForwardEnabled: boolean,
     *   carryForwardMaxLimit: number,   // e.g. 5.0
     *   expiryMonths: number | null     // e.g. 3 months or null
     * }
     */
    leaveTypeConfigs: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            CL: {
                enabled: true,
                allocationMode: 'MONTHLY',
                monthlyCreditCount: 1.0,
                yearlyTotalQuota: 12.0,
                maxPerRequest: 3.0,
                maxPerMonth: 2.0,
                maxPerYear: 12.0,
                requiresAttachment: false,
                isPaid: true,
                allowNegativeBalance: false,
                allowAdvanceFromFutureMonths: true,
                advanceLimit: 1.0,
                carryForwardEnabled: true,
                carryForwardMaxLimit: 12.0,
                expiryMonths: null,
            },
            SL: {
                enabled: true,
                allocationMode: 'YEARLY',
                monthlyCreditCount: 0.83,
                yearlyTotalQuota: 10.0,
                maxPerRequest: 7.0,
                maxPerMonth: 5.0,
                maxPerYear: 10.0,
                requiresAttachment: true,
                isPaid: true,
                allowNegativeBalance: false,
                allowAdvanceFromFutureMonths: false,
                advanceLimit: 0,
                carryForwardEnabled: true,
                carryForwardMaxLimit: 10.0,
                expiryMonths: null,
            },
            EL: {
                enabled: true,
                allocationMode: 'YEARLY',
                monthlyCreditCount: 1.25,
                yearlyTotalQuota: 15.0,
                maxPerRequest: 10.0,
                maxPerMonth: 5.0,
                maxPerYear: 15.0,
                requiresAttachment: false,
                isPaid: true,
                allowNegativeBalance: false,
                allowAdvanceFromFutureMonths: false,
                advanceLimit: 0,
                carryForwardEnabled: true,
                carryForwardMaxLimit: 30.0,
                expiryMonths: null,
            },
            ML: {
                enabled: true,
                allocationMode: 'YEARLY',
                monthlyCreditCount: 0,
                yearlyTotalQuota: 90.0,
                maxPerRequest: 90.0,
                maxPerMonth: 90.0,
                maxPerYear: 90.0,
                requiresAttachment: true,
                isPaid: true,
                allowNegativeBalance: false,
                allowAdvanceFromFutureMonths: false,
                advanceLimit: 0,
                carryForwardEnabled: false,
                carryForwardMaxLimit: 0,
                expiryMonths: null,
            },
            LWP: {
                enabled: true,
                allocationMode: 'YEARLY',
                monthlyCreditCount: 0,
                yearlyTotalQuota: 30.0,
                maxPerRequest: 30.0,
                maxPerMonth: 15.0,
                maxPerYear: 30.0,
                requiresAttachment: false,
                isPaid: false,
                allowNegativeBalance: true,
                allowAdvanceFromFutureMonths: false,
                advanceLimit: 0,
                carryForwardEnabled: false,
                carryForwardMaxLimit: 0,
                expiryMonths: null,
            },
        },
        field: 'leave_type_configs',
    },

    /**
     * Sandwich rule options:
     * mode: 'NONE' | 'WEEKENDS' | 'HOLIDAYS' | 'BOTH'
     * includeSundays: boolean
     * includeCalendarHolidays: boolean
     */
    sandwichRule: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            mode: 'NONE', // 'NONE', 'WEEKENDS', 'HOLIDAYS', 'BOTH'
            includeSundays: false,
            includeCalendarHolidays: false,
        },
        field: 'sandwich_rule',
    },

    /**
     * General operational restrictions
     */
    restrictions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            excludeSundays: true,
            excludeHolidays: true,
            allowHalfDay: false,
            minNoticeDays: 0,
            maxConsecutiveDays: 15,
            blockIfNoActiveRule: true,
            autoDeductOnApprovalOnly: true,
            pendingLeaveReservesBalance: true,
            genderSpecificVisibility: true,
            probationStaffCustomPolicy: false,
        },
        field: 'restrictions',
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
        { fields: ['status'], name: 'idx_leave_rules_status' },
    ],
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default LeaveRule;
