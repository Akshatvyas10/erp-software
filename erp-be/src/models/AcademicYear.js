'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AcademicYear = sequelize.define('AcademicYear', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
        comment: 'Standard academic year display label, e.g. 2026-27 or 2026-2027',
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'start_date',
        comment: 'Calendar session start date',
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'end_date',
        comment: 'Calendar session end date',
    },
    status: {
        type: DataTypes.ENUM('UPCOMING', 'ACTIVE', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'UPCOMING',
        comment: 'Lifecycle state of academic year',
    },
    isCurrent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_current',
        comment: 'Flag indicating whether this is the single active current academic year',
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional admin notes or metadata',
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by',
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
    },
}, {
    tableName: 'academic_years',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['name'],
        },
        {
            fields: ['is_current'],
        },
        {
            fields: ['status'],
        },
        {
            fields: ['start_date', 'end_date'],
        },
    ],
});

export default AcademicYear;
