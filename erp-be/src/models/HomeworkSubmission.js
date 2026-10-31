import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const HomeworkSubmission = sequelize.define('HomeworkSubmission', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    homeworkId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'homework_id',
        references: { model: 'homeworks', key: 'id' },
        onDelete: 'CASCADE'
    },
    studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'student_id',
        references: { model: 'students', key: 'id' },
        onDelete: 'CASCADE'
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'SUBMITTED', 'REVIEWED', 'OVERDUE', 'COMPLETED', 'NOT_COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING'
    },
    submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'submitted_at'
    },
    feedback: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    grade: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'homework_submissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['homework_id', 'student_id']
        }
    ]
});

export default HomeworkSubmission;
