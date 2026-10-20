'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TestExamConfig = sequelize.define('TestExamConfig', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    departmentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'department_id',
        references: {
            model: 'departments',
            key: 'id'
        },
        onDelete: 'CASCADE',
    },
    academicYear: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '2026-2027',
        field: 'academic_year',
    },
    totalTestsPerYear: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 6,
        field: 'total_tests_per_year',
    },
    totalExamsPerYear: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
        field: 'total_exams_per_year',
    },
    testFrequency: {
        type: DataTypes.ENUM('MONTHLY', 'BI_MONTHLY', 'QUARTERLY', 'CUSTOM'),
        allowNull: false,
        defaultValue: 'MONTHLY',
        field: 'test_frequency',
    },
    examFrequency: {
        type: DataTypes.ENUM('QUARTERLY', 'TERM_WISE', 'SEMESTER_WISE', 'ANNUAL', 'CUSTOM'),
        allowNull: false,
        defaultValue: 'QUARTERLY',
        field: 'exam_frequency',
    },
    testTemplates: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'test_templates',
        comment: 'Array of objects: [{ name: "Unit Test 1", monthOffset: 1, durationDays: 2 }]'
    },
    examTemplates: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'exam_templates',
        comment: 'Array of objects: [{ name: "Quarterly Exam", monthOffset: 3, durationDays: 5 }]'
    },
    rulesDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'rules_description',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
    }
}, {
    tableName: 'test_exam_configs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['department_id', 'academic_year'],
            name: 'unique_department_academic_year_config'
        }
    ]
});

export default TestExamConfig;
