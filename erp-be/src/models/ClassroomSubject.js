'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Academic map: classroom + subject + assigned teacher
const ClassroomSubject = sequelize.define('ClassroomSubject', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    classroomId: {
        type: DataTypes.UUID, allowNull: false, field: 'classroom_id',
        references: { model: 'classrooms', key: 'id' }, onDelete: 'CASCADE'
    },
    teacherId: {
        type: DataTypes.UUID, allowNull: true, field: 'teacher_id',
        references: { model: 'teachers', key: 'id' }, onDelete: 'SET NULL'
    },
    subjectId: {
        type: DataTypes.UUID, allowNull: false, field: 'subject_id',
        references: { model: 'subjects', key: 'id' }, onDelete: 'CASCADE'
    },
}, {
    tableName: 'classroom_subjects',
    indexes: [
        { unique: true, fields: ['classroom_id', 'subject_id'], name: 'unique_classroom_subject' },
        { fields: ['teacher_id'], name: 'idx_csubj_teacher' },
    ],
    paranoid: false,
    timestamps: true,
});

module.exports = ClassroomSubject;
