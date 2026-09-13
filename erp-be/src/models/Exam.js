import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Exam = sequelize.define('Exam', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    examScheduleId: {
        type: DataTypes.UUID, allowNull: false, field: 'exam_schedule_id',
        references: { model: 'exam_schedules', key: 'id' }, onDelete: 'CASCADE'
    },
    date: {
        type: DataTypes.DATEONLY, allowNull: true,
    },
    maxMarks: {
        type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 100.00,
        field: 'max_marks'
    },
    status: {
        type: DataTypes.ENUM('SCHEDULED', 'COMPLETED', 'DRAFT', 'PUBLISHED'),
        allowNull: false, defaultValue: 'SCHEDULED'
    },
    classroomId: {
        type: DataTypes.UUID, allowNull: false, field: 'classroom_id',
        references: { model: 'classrooms', key: 'id' }, onDelete: 'CASCADE'
    },
    subjectId: {
        type: DataTypes.UUID, allowNull: false, field: 'subject_id',
        references: { model: 'subjects', key: 'id' }, onDelete: 'CASCADE'
    },
}, {
    tableName: 'exams',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['classroom_id'] },
        { fields: ['subject_id'] },
    ]
});

export default Exam;
