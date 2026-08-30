'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StudentAttendance = sequelize.define('StudentAttendance', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    academicYearId: {
        type: DataTypes.STRING(20), allowNull: false, field: 'academic_year_id',
    },
    classroomId: {
        type: DataTypes.UUID, allowNull: false, field: 'classroom_id',
        references: { model: 'classrooms', key: 'id' }, onDelete: 'CASCADE'
    },
    studentId: {
        type: DataTypes.UUID, allowNull: false, field: 'student_id',
        references: { model: 'students', key: 'id' }, onDelete: 'CASCADE'
    },
    teacherId: {
        type: DataTypes.UUID, allowNull: false, field: 'teacher_id',
        references: { model: 'teachers', key: 'id' }, onDelete: 'RESTRICT'
    },
    subjectId: {
        type: DataTypes.UUID, allowNull: true, field: 'subject_id',
        references: { model: 'subjects', key: 'id' }, onDelete: 'CASCADE'
    },
    attendanceDate: {
        type: DataTypes.DATEONLY, allowNull: false, field: 'attendance_date',
    },
    status: {
        type: DataTypes.ENUM('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'),
        allowNull: false, defaultValue: 'PRESENT'
    },
    remarks: {
        type: DataTypes.STRING(255), allowNull: true,
    },
    createdBy: {
        type: DataTypes.UUID, allowNull: false, field: 'created_by',
    },
    updatedBy: {
        type: DataTypes.UUID, allowNull: false, field: 'updated_by',
    }
}, {
    tableName: 'student_attendance',
    indexes: [
        { 
            unique: true, 
            fields: ['classroom_id', 'student_id', 'subject_id', 'attendance_date'], 
            name: 'unique_student_attendance' 
        },
        { fields: ['attendance_date'], name: 'idx_attendance_date' }
    ],
    timestamps: true,
});

export default StudentAttendance;
