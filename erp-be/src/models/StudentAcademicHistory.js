import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StudentAcademicHistory = sequelize.define('StudentAcademicHistory', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'student_id',
        references: { model: 'students', key: 'id' },
        onDelete: 'CASCADE'
    },
    classroomId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'classroom_id',
        references: { model: 'classrooms', key: 'id' },
        onDelete: 'SET NULL'
    },
    academicClassId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'academic_class_id',
        references: { model: 'academic_classes', key: 'id' },
        onDelete: 'SET NULL'
    },
    className: {
        type: DataTypes.STRING(80),
        allowNull: false,
        field: 'class_name'
    },
    sectionName: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'section_name'
    },
    academicYear: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'academic_year'
    },
    rollNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'roll_number'
    },
    attendancePercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'attendance_percentage'
    },
    overallPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'overall_percentage'
    },
    overallGrade: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: 'overall_grade'
    },
    resultStatus: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PASSED',
        field: 'result_status'
    },
    teacherRemarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'teacher_remarks'
    },
    appraisalNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'appraisal_notes'
    },
    finalExamResults: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'final_exam_results'
    },
    testBreakdown: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'test_breakdown'
    }
}, {
    tableName: 'student_academic_histories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['student_id'] },
        { fields: ['academic_year'] },
        { fields: ['class_name'] }
    ]
});

export default StudentAcademicHistory;
