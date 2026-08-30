'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Junction: classroom ↔ student (one student → one classroom per academic year)
const ClassroomStudent = sequelize.define('ClassroomStudent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    classroomId: {
        type: DataTypes.UUID, allowNull: false, field: 'classroom_id',
        references: { model: 'classrooms', key: 'id' }, onDelete: 'CASCADE'
    },
    studentId: {
        type: DataTypes.UUID, allowNull: false, field: 'student_id',
        references: { model: 'students', key: 'id' }, onDelete: 'CASCADE'
    },
    rollNumber: {
        type: DataTypes.STRING(20), allowNull: true, field: 'roll_number'
    },
}, {
    tableName: 'classroom_students',
    indexes: [
        { unique: true, fields: ['classroom_id', 'student_id'], name: 'unique_classroom_student' },
        { unique: true, fields: ['classroom_id', 'roll_number'], name: 'unique_classroom_roll' },
        { fields: ['student_id'], name: 'idx_cs_student' },
    ],
    paranoid: false,
    timestamps: true,
});

export default ClassroomStudent;
