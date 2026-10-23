'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ExamSchedule = sequelize.define('ExamSchedule', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: {
        type: DataTypes.ENUM('WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'UNIT_TEST'),
        allowNull: false, defaultValue: 'MONTHLY'
    },
    classroomId: {
        type: DataTypes.UUID, allowNull: false, field: 'classroom_id',
        references: { model: 'classrooms', key: 'id' }, onDelete: 'CASCADE'
    },
    academicYearId: {
        type: DataTypes.UUID, allowNull: true, field: 'academic_year_id',
        references: { model: 'academic_years', key: 'id' }, onDelete: 'SET NULL'
    },
    status: {
        type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'COMPLETED'),
        allowNull: false, defaultValue: 'DRAFT'
    }
}, {
    tableName: 'exam_schedules',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
        { unique: true, fields: ['classroom_id', 'name', 'type'], name: 'unique_exam_schedule' }
    ]
});

export default ExamSchedule;
