import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PromotionLog = sequelize.define('PromotionLog', {
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
    sourceClassroomId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'source_classroom_id',
        references: { model: 'classrooms', key: 'id' },
        onDelete: 'CASCADE'
    },
    targetClassroomId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'target_classroom_id',
        references: { model: 'classrooms', key: 'id' },
        onDelete: 'SET NULL'
    },
    sourceAcademicYear: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'source_academic_year'
    },
    targetAcademicYear: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'target_academic_year'
    },
    action: {
        type: DataTypes.STRING(20),
        allowNull: false, // 'PROMOTE', 'RETAIN', 'GRADUATE', 'TRANSFER'
        field: 'action'
    },
    ruleId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'rule_id',
        references: { model: 'promotion_rules', key: 'id' },
        onDelete: 'SET NULL'
    },
    isManualOverride: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_manual_override'
    },
    overrideReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'override_reason'
    },
    evaluationSummary: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        field: 'evaluation_summary'
    },
    promotedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'promoted_by',
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL'
    }
}, {
    tableName: 'promotion_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['student_id'] },
        { fields: ['source_classroom_id'] },
        { fields: ['action'] }
    ]
});

export default PromotionLog;
