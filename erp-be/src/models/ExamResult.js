import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ExamResult = sequelize.define('ExamResult', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    examId: {
        type: DataTypes.UUID, allowNull: false, field: 'exam_id',
        references: { model: 'exams', key: 'id' }, onDelete: 'CASCADE'
    },
    studentId: {
        type: DataTypes.UUID, allowNull: false, field: 'student_id',
        references: { model: 'students', key: 'id' }, onDelete: 'CASCADE'
    },
    marksObtained: {
        type: DataTypes.DECIMAL(5, 2), allowNull: true,
        field: 'marks_obtained'
    },
    isAbsent: {
        type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false,
        field: 'is_absent'
    },
    percentage: {
        type: DataTypes.DECIMAL(5, 2), allowNull: true,
    },
    grade: {
        type: DataTypes.STRING(5), allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('PASSED', 'FAILED', 'COMPARTMENT'), allowNull: true,
    },
    remarks: {
        type: DataTypes.STRING(255), allowNull: true,
    }
}, {
    tableName: 'exam_results',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { unique: true, fields: ['exam_id', 'student_id'], name: 'unique_exam_student' }
    ]
});

export default ExamResult;
