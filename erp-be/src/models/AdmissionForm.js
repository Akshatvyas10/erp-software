'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AdmissionForm = sequelize.define(
    'AdmissionForm',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        classroomId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'classroom_id',
            references: { model: 'classrooms', key: 'id' },
            onDelete: 'CASCADE',
        },
        token: {
            type: DataTypes.STRING(128),
            allowNull: false,
            unique: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active',
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'expires_at',
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'created_by',
            references: { model: 'users', key: 'id' },
        },
        customFields: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
            field: 'custom_fields',
            comment: 'Array of custom field definitions: { label, type, required, options }',
        }
    },
    {
        tableName: 'admission_forms',
        indexes: [
            { unique: true, fields: ['token'] },
        ]
    }
);

export default AdmissionForm;
