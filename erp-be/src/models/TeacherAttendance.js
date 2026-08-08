'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Daily attendance record per teacher.
 * Future: populated by biometric device via POST /api/attendance/biometric.
 * Currently: manual entry by admin/HR.
 *
 * Using VARCHAR check constraints instead of ENUMs to avoid Neon ALTER issues.
 */
const TeacherAttendance = sequelize.define('TeacherAttendance', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    teacherId: {
        type: DataTypes.UUID, allowNull: false,
        field: 'teacher_id',
        references: { model: 'teachers', key: 'id' },
        onDelete: 'CASCADE',
    },

    date: { type: DataTypes.DATEONLY, allowNull: false },

    // Biometric / manual times stored as TIME string "HH:MM:SS"
    checkIn: { type: DataTypes.TIME, allowNull: true, field: 'check_in', comment: 'Entry time (biometric or manual)' },
    checkOut: { type: DataTypes.TIME, allowNull: true, field: 'check_out', comment: 'Exit time (biometric or manual)' },

    hoursWorked: {
        type: DataTypes.DECIMAL(5, 2), allowNull: true, field: 'hours_worked',
        comment: 'Computed from checkIn/checkOut or manually entered',
    },

    // Use STRING + validate instead of ENUM to avoid Neon ALTER COLUMN issues
    status: {
        type: DataTypes.STRING(20), allowNull: false, defaultValue: 'present',
        validate: { isIn: [['present', 'absent', 'half_day', 'late', 'on_leave', 'holiday']] },
    },

    leaveType: {
        type: DataTypes.STRING(20), allowNull: false, defaultValue: 'none', field: 'leave_type',
        validate: { isIn: [['casual', 'sick', 'unpaid', 'none']] },
    },

    source: {
        type: DataTypes.STRING(20), allowNull: false, defaultValue: 'manual',
        validate: { isIn: [['manual', 'biometric']] },
        comment: 'How the record was created',
    },

    remarks: { type: DataTypes.TEXT, allowNull: true },

}, {
    tableName: 'teacher_attendance',
    indexes: [
        { unique: true, fields: ['teacher_id', 'date'], name: 'unique_teacher_date' },
    ],
    paranoid: false,
    timestamps: true,
});

export default TeacherAttendance;
