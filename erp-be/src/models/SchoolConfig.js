'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SchoolConfig = sequelize.define(
    'SchoolConfig',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        schoolName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'school_name',
        },
        tagline: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        logoUrl: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'logo_url',
        },
        watermarkUrl: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'watermark_url',
        },
        primaryPhone: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'primary_phone',
        },
        secondaryPhone: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'secondary_phone',
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        website: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        addressLine1: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'address_line_1',
        },
        addressLine2: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'address_line_2',
        },
        city: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        state: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        pincode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        country: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        boardType: {
            type: DataTypes.ENUM('CBSE', 'ICSE', 'IB', 'STATE_BOARD', 'OTHER'),
            allowNull: true,
            field: 'board_type',
        },
        affiliationNumber: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'affiliation_number',
        },
        schoolCode: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'school_code',
        },
        owners: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
        },
        taxId: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'tax_id',
        },
        bankDetails: {
            type: DataTypes.JSONB,
            allowNull: true,
            field: 'bank_details',
            defaultValue: {},
        },
        currencySymbol: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '₹',
            field: 'currency_symbol',
        },
        timezone: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: 'Asia/Kolkata',
        },
        smtpSettings: {
            type: DataTypes.JSONB,
            allowNull: true,
            field: 'smtp_settings',
            defaultValue: {
                host: '',
                port: 587,
                encryption: 'TLS',
                username: '',
                password: '',
                fromName: '',
                fromEmail: '',
                replyTo: '',
                isConfigured: false,
                lastTestedAt: null,
                connectionStatus: 'UNTESTED',
            },
        },
        activeTheme: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'royal-purple',
            field: 'active_theme',
        }
    },
    {
        tableName: 'school_configs',
        timestamps: true,
    }
);

export default SchoolConfig;
