'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TimetableSubstitute = sequelize.define('TimetableSubstitute', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    classroomId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'classroom_id',
        references: { model: 'classrooms', key: 'id' },
        onDelete: 'CASCADE'
    },
    timetableId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'timetable_id',
        references: { model: 'timetables', key: 'id' },
        onDelete: 'CASCADE'
    },
    originalTeacherId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'original_teacher_id',
        references: { model: 'teachers', key: 'id' },
        onDelete: 'SET NULL'
    },
    substituteTeacherId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'substitute_teacher_id',
        references: { model: 'teachers', key: 'id' },
        onDelete: 'CASCADE'
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    reason: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'ASSIGNED', 'COMPLETED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING'
    },
    assignedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'assigned_by',
        references: { model: 'users', key: 'id' }
    }
}, {
    tableName: 'timetable_substitutes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['timetable_id', 'date'],
            name: 'unique_timetable_substitute_date'
        },
        {
            fields: ['classroom_id', 'date'],
            name: 'idx_substitute_classroom_date'
        },
        {
            fields: ['substitute_teacher_id', 'date'],
            name: 'idx_substitute_teacher_date'
        }
    ]
});

export default TimetableSubstitute;
