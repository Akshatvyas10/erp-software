'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TeacherLeaveBalance = sequelize.define('TeacherLeaveBalance', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    teacherId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'teacher_id',
        references: { model: 'teachers', key: 'id' },
        onDelete: 'CASCADE',
    },
    leaveTypeId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'leave_type_id',
        references: { model: 'leave_types', key: 'id' },
        onDelete: 'RESTRICT',
    },
    academicYearId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'academic_year_id',
        references: { model: 'academic_years', key: 'id' },
        onDelete: 'RESTRICT',
    },
    openingBalance: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0.0,
        field: 'opening_balance',
    },
    consumedDays: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0.0,
        field: 'consumed_days',
    },
}, {
    tableName: 'teacher_leave_balances',
    indexes: [
        {
            unique: true,
            fields: ['teacher_id', 'leave_type_id', 'academic_year_id'],
            name: 'unique_teacher_year_leave_balance',
        },
    ],
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default TeacherLeaveBalance;
