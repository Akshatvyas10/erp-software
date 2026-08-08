import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Homework = sequelize.define('Homework', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    dueDate: { type: DataTypes.DATE, allowNull: false, field: 'due_date' },
    status: {
        type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
        allowNull: false,
        defaultValue: 'DRAFT'
    },
    classroomId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'classroom_id',
        references: { model: 'classrooms', key: 'id' },
        onDelete: 'CASCADE'
    },
    subjectId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'subject_id',
        references: { model: 'subjects', key: 'id' },
        onDelete: 'CASCADE'
    },
    teacherId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'teacher_id',
        references: { model: 'teachers', key: 'id' },
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'homeworks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export default Homework;
