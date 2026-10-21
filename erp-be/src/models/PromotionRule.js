import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PromotionRule = sequelize.define('PromotionRule', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(120),
        allowNull: false
    },
    academicClassId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'academic_class_id',
        references: { model: 'academic_classes', key: 'id' },
        onDelete: 'CASCADE'
    },
    minOverallPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 33.00,
        field: 'min_overall_percentage'
    },
    mustPassAllSubjects: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'must_pass_all_subjects'
    },
    minSubjectPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 33.00,
        field: 'min_subject_percentage'
    },
    maxCompartmentSubjects: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'max_compartment_subjects'
    },
    minAttendancePercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'min_attendance_percentage'
    },
    status: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'ACTIVE',
        validate: { isIn: [['ACTIVE', 'INACTIVE']] }
    }
}, {
    tableName: 'promotion_rules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['academic_class_id'] },
        { fields: ['status'] }
    ]
});

export default PromotionRule;
