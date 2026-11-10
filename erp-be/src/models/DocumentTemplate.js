'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DocumentTemplate = sequelize.define('DocumentTemplate', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    type: {
        type: DataTypes.ENUM(
            'STUDENT_ID_CARD',
            'TEACHER_ID_CARD',
            'REPORT_CARD',
            'TRANSFER_CERTIFICATE',
            'LEAVING_CERTIFICATE',
            'BONAFIDE_CERTIFICATE',
            'CHARACTER_CERTIFICATE',
            'FEE_RECEIPT',
            'CUSTOM'
        ),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'DRAFT'
    },
    paperSize: {
        type: DataTypes.ENUM('CR80', 'A4', 'A5', 'LETTER'),
        allowNull: false,
        defaultValue: 'A4',
        field: 'paper_size'
    },
    orientation: {
        type: DataTypes.ENUM('PORTRAIT', 'LANDSCAPE'),
        allowNull: false,
        defaultValue: 'PORTRAIT'
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_default'
    },
    designConfig: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        field: 'design_config'
    },
    selectedFields: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'selected_fields'
    },
    createdById: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by_id',
        references: { model: 'users', key: 'id' }
    },
    updatedById: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'updated_by_id',
        references: { model: 'users', key: 'id' }
    }
}, {
    tableName: 'document_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export default DocumentTemplate;
