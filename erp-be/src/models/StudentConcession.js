import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StudentConcession = sequelize.define(
    'StudentConcession',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        studentId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'student_id',
        },
        academicYearId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'academic_year_id',
        },
        feeHeadId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'fee_head_id',
        },
        discountType: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'PERCENTAGE',
            field: 'discount_type',
            validate: {
                isIn: [['PERCENTAGE', 'FLAT']],
            },
        },
        discountValue: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.0,
            field: 'discount_value',
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'PENDING',
            validate: {
                isIn: [['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']],
            },
        },
        reason: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        requestedById: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'requested_by_id',
        },
        approvedById: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'approved_by_id',
        },
        approvedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'approved_at',
        },
    },
    {
        tableName: 'student_concessions',
        timestamps: true,
        paranoid: true,
        underscored: true,
    }
);

export default StudentConcession;

