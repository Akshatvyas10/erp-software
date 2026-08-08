'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Student = sequelize.define(
    'Student',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        // FK to users.id (1:1 strict)
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        // ─── ERP identifiers ──────────────────────────────────────────────────
        studentId: {
            // Internal ERP ID  e.g. "STU-00001"
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
        },
        enrollmentNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
        },
        admissionNumber: {
            // Official school admission number — unique
            type: DataTypes.STRING(30),
            allowNull: true,
            unique: true,
        },
        rollNumber: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        // ─── Academic placement ───────────────────────────────────────────────
        grade: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        section: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        // ─── Personal details ─────────────────────────────────────────────────
        dateOfBirth: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        gender: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        bloodGroup: {
            type: DataTypes.STRING(5),
            allowNull: true,
        },
        medicalNotes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        profilePhotoUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        // ─── Address ──────────────────────────────────────────────────────────
        permanentAddress: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        currentAddress: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        // ─── Transport ────────────────────────────────────────────────────────
        transportationMode: {
            type: DataTypes.ENUM('SCHOOL_BUS', 'PRIVATE_TRANSPORT', 'WALKER'),
            allowNull: true,
            defaultValue: 'WALKER',
        },
        // ─── Guardian ─────────────────────────────────────────────────────────
        guardianName: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        guardianRelationship: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        guardianPhone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        guardianEmail: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        // Legacy field kept for backwards compat (maps to currentAddress)
        address: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        // ─── Compliance & Finance ─────────────────────────────────────────────
        governmentId: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
        },
        feeQuota: {
            type: DataTypes.ENUM('REGULAR', 'STAFF_CHILD', 'SCHOLARSHIP_HALF', 'SCHOLARSHIP_FULL'),
            allowNull: false,
            defaultValue: 'REGULAR',
        },
        previousSchoolDetails: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        transferCertificateUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        // ─── Status ───────────────────────────────────────────────────────────
        status: {
            type: DataTypes.ENUM('ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED'),
            allowNull: false,
            defaultValue: 'ACTIVE',
        },
    },
    {
        tableName: 'students',
        // paranoid: true is inherited from sequelize.define defaults in database.js
    }
);

export default Student;
