'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AdmissionApplication = sequelize.define(
    'AdmissionApplication',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        formId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'form_id',
            references: { model: 'admission_forms', key: 'id' },
            onDelete: 'CASCADE',
        },
        // --- Student Information ---
        studentFirstName: { type: DataTypes.STRING(100), allowNull: false, field: 'student_first_name' },
        studentLastName: { type: DataTypes.STRING(100), allowNull: false, field: 'student_last_name' },
        dateOfBirth: { type: DataTypes.DATEONLY, allowNull: false, field: 'date_of_birth' },
        gender: { type: DataTypes.STRING(20), allowNull: false },
        bloodGroup: { type: DataTypes.STRING(5), allowNull: true, field: 'blood_group' },
        aadhaarNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'aadhaar_number' },
        previousSchoolName: { type: DataTypes.STRING(200), allowNull: true, field: 'previous_school_name' },
        previousClass: { type: DataTypes.STRING(50), allowNull: true, field: 'previous_class' },
        currentAddress: { type: DataTypes.TEXT, allowNull: false, field: 'current_address' },
        permanentAddress: { type: DataTypes.TEXT, allowNull: false, field: 'permanent_address' },
        
        // --- Parent / Guardian Information ---
        fatherName: { type: DataTypes.STRING(200), allowNull: false, field: 'father_name' },
        motherName: { type: DataTypes.STRING(200), allowNull: false, field: 'mother_name' },
        guardianName: { type: DataTypes.STRING(200), allowNull: true, field: 'guardian_name' },
        primaryContactNumber: { type: DataTypes.STRING(20), allowNull: false, field: 'primary_contact_number' },
        alternateContactNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'alternate_contact_number' },
        parentEmail: { type: DataTypes.STRING(255), allowNull: false, field: 'parent_email' },
        fatherOccupation: { type: DataTypes.STRING(100), allowNull: true, field: 'father_occupation' },
        motherOccupation: { type: DataTypes.STRING(100), allowNull: true, field: 'mother_occupation' },
        annualFamilyIncome: { type: DataTypes.STRING(100), allowNull: true, field: 'annual_family_income' },
        
        // --- Additional ---
        preferredClassId: { type: DataTypes.UUID, allowNull: true, field: 'preferred_class_id' },
        medicalNotes: { type: DataTypes.TEXT, allowNull: true, field: 'medical_notes' },
        declarationAccepted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'declaration_accepted' },
        
        // --- Bank Details ---
        bankAccountNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'bank_account_number' },
        bankIfscCode: { type: DataTypes.STRING(20), allowNull: true, field: 'bank_ifsc_code' },
        bankName: { type: DataTypes.STRING(100), allowNull: true, field: 'bank_name' },
        bankBranch: { type: DataTypes.STRING(100), allowNull: true, field: 'bank_branch' },
        bankMicrNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'bank_micr_number' },

        // --- Custom Fields ---
        customFieldResponses: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
            field: 'custom_field_responses',
            comment: 'Key-value mapping of custom field responses',
        },

        // --- System / Status ---
        status: {
            type: DataTypes.ENUM('Pending', 'Admitted', 'Rejected'),
            allowNull: false,
            defaultValue: 'Pending',
        },
        rejectionReason: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'rejection_reason',
        },
        actionBy: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'action_by',
            references: { model: 'users', key: 'id' },
        },
        actionAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'action_at',
        }
    },
    {
        tableName: 'admission_applications'
    }
);

export default AdmissionApplication;
