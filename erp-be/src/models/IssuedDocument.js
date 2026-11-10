'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const IssuedDocument = sequelize.define('IssuedDocument', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    documentType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'document_type'
    },
    templateId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'template_id',
        references: { model: 'document_templates', key: 'id' }
    },
    subjectType: {
        type: DataTypes.ENUM('STUDENT', 'TEACHER'),
        allowNull: false,
        field: 'subject_type'
    },
    subjectId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'subject_id'
    },
    issuedById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'issued_by_id',
        references: { model: 'users', key: 'id' }
    },
    mode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'without_signature'
    },
    serialNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'serial_number'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    }
}, {
    tableName: 'issued_documents',
    underscored: true,
    timestamps: true
});

export default IssuedDocument;
