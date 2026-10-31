import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ClassroomRemark = sequelize.define('ClassroomRemark', {
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
    studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'student_id',
        references: { model: 'students', key: 'id' },
        onDelete: 'CASCADE'
    },
    teacherId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'teacher_id',
        references: { model: 'teachers', key: 'id' },
        onDelete: 'SET NULL'
    },
    createdById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'created_by_id',
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
    },
    teacherName: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'teacher_name'
    },
    type: {
        type: DataTypes.ENUM('Homework', 'Academic', 'Behavior', 'General'),
        allowNull: false,
        defaultValue: 'General'
    },
    remark: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    homeworkId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'homework_id',
        references: { model: 'homeworks', key: 'id' },
        onDelete: 'SET NULL'
    }
}, {
    tableName: 'classroom_remarks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export default ClassroomRemark;
