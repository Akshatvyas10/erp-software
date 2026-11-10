'use strict';

import db from '../models/index.js';
const { DocumentTemplate, User } = db;
import { Op } from 'sequelize';

/**
 * Default standard design configurations for quick template instantiation
 */
export const DEFAULT_DESIGN_TEMPLATES = {
    STUDENT_ID_CARD: {
        name: "Standard Student ID Card (CR80)",
        type: "STUDENT_ID_CARD",
        paperSize: "CR80",
        orientation: "PORTRAIT",
        isDefault: true,
        status: "ACTIVE",
        description: "Official student identification badge for campus access & library.",
        designConfig: {
            theme: {
                primaryColor: "#4F46E5",
                secondaryColor: "#818CF8",
                textColor: "#1E293B",
                accentColor: "#F59E0B",
                backgroundColor: "#FFFFFF",
                fontFamily: "Inter"
            },
            header: {
                showSchoolLogo: true,
                logoPosition: "CENTER",
                showSchoolName: true,
                showTagline: true,
                showAffiliation: false,
                showSchoolAddress: false,
                showContactInfo: false
            },
            body: {
                layout: "SINGLE_COL",
                showStudentPhoto: true,
                photoPosition: "CENTER",
                showBarcodeOrQr: true,
                barcodeType: "QR_CODE",
                barcodeContent: "STUDENT_ID"
            },
            idCardSides: {
                hasBackSide: true,
                backSideConfig: {
                    showPrincipalSignature: true,
                    showParentContact: true,
                    showBloodGroup: true,
                    showEmergencyAddress: true,
                    instructionsText: "This identity card is property of the institution. If found, please return to the school administration office."
                }
            },
            watermark: {
                enabled: false,
                opacity: 0.05,
                type: "SCHOOL_LOGO"
            },
            footer: {
                showIssueDate: true,
                showAuthorizedSignature: true,
                signatureTitle: "Authorized Signatory"
            }
        },
        selectedFields: [
            { key: "fullName", label: "Student Name", visible: true, order: 1, isBold: true },
            { key: "admissionNumber", label: "Admission No", visible: true, order: 2, isBold: false },
            { key: "rollNumber", label: "Roll No", visible: true, order: 3, isBold: false },
            { key: "className", label: "Class & Section", visible: true, order: 4, isBold: true },
            { key: "dateOfBirth", label: "DOB", visible: true, order: 5, format: "DD/MM/YYYY" },
            { key: "bloodGroup", label: "Blood Group", visible: true, order: 6 },
            { key: "emergencyContact", label: "Emergency Phone", visible: true, order: 7 }
        ]
    },
    TEACHER_ID_CARD: {
        name: "Standard Faculty Badge (CR80)",
        type: "TEACHER_ID_CARD",
        paperSize: "CR80",
        orientation: "PORTRAIT",
        isDefault: true,
        status: "ACTIVE",
        description: "Staff and faculty member official campus credential.",
        designConfig: {
            theme: {
                primaryColor: "#0F766E",
                secondaryColor: "#14B8A6",
                textColor: "#134E4A",
                accentColor: "#F97316",
                backgroundColor: "#FFFFFF",
                fontFamily: "Inter"
            },
            header: {
                showSchoolLogo: true,
                logoPosition: "CENTER",
                showSchoolName: true,
                showTagline: false,
                showAffiliation: true,
                showSchoolAddress: false,
                showContactInfo: false
            },
            body: {
                layout: "SINGLE_COL",
                showStudentPhoto: true,
                photoPosition: "CENTER",
                showBarcodeOrQr: true,
                barcodeType: "QR_CODE",
                barcodeContent: "TEACHER_ID"
            },
            idCardSides: {
                hasBackSide: true,
                backSideConfig: {
                    showPrincipalSignature: true,
                    showParentContact: false,
                    showBloodGroup: true,
                    showEmergencyAddress: true,
                    instructionsText: "Official Faculty Identification. Non-transferable."
                }
            },
            watermark: {
                enabled: false,
                opacity: 0.05,
                type: "SCHOOL_LOGO"
            },
            footer: {
                showIssueDate: true,
                showAuthorizedSignature: true,
                signatureTitle: "Principal"
            }
        },
        selectedFields: [
            { key: "fullName", label: "Faculty Name", visible: true, order: 1, isBold: true },
            { key: "teacherId", label: "Employee ID", visible: true, order: 2, isBold: true },
            { key: "designation", label: "Designation", visible: true, order: 3, isBold: false },
            { key: "department", label: "Department", visible: true, order: 4, isBold: false },
            { key: "bloodGroup", label: "Blood Group", visible: true, order: 5 },
            { key: "phone", label: "Contact No", visible: true, order: 6 }
        ]
    },
    REPORT_CARD: {
        name: "Standard Academic Scorecard (A4)",
        type: "REPORT_CARD",
        paperSize: "A4",
        orientation: "PORTRAIT",
        isDefault: true,
        status: "ACTIVE",
        description: "CBSE / State compliant term evaluation report card.",
        designConfig: {
            theme: {
                primaryColor: "#1E3A8A",
                secondaryColor: "#3B82F6",
                textColor: "#0F172A",
                accentColor: "#EAB308",
                backgroundColor: "#FFFFFF",
                fontFamily: "Inter"
            },
            header: {
                showSchoolLogo: true,
                logoPosition: "LEFT",
                showSchoolName: true,
                showTagline: true,
                showAffiliation: true,
                showSchoolAddress: true,
                showContactInfo: true
            },
            body: {
                layout: "GRID_2_COL",
                showStudentPhoto: true,
                photoPosition: "TOP_RIGHT",
                showBarcodeOrQr: false,
                barcodeType: "NONE",
                barcodeContent: "STUDENT_ID"
            },
            idCardSides: {
                hasBackSide: false,
                backSideConfig: {}
            },
            watermark: {
                enabled: true,
                opacity: 0.04,
                type: "SCHOOL_LOGO"
            },
            footer: {
                showIssueDate: true,
                showAuthorizedSignature: true,
                signatureTitle: "Class Teacher & Principal"
            }
        },
        selectedFields: [
            { key: "fullName", label: "Student Name", visible: true, order: 1, isBold: true },
            { key: "admissionNumber", label: "Admission No", visible: true, order: 2 },
            { key: "rollNumber", label: "Roll No", visible: true, order: 3 },
            { key: "className", label: "Class & Section", visible: true, order: 4, isBold: true },
            { key: "academicYear", label: "Academic Session", visible: true, order: 5 },
            { key: "attendancePercentage", label: "Attendance %", visible: true, order: 6 },
            { key: "rank", label: "Class Standing", visible: true, order: 7 }
        ]
    },
    TRANSFER_CERTIFICATE: {
        name: "Official Transfer Certificate (TC)",
        type: "TRANSFER_CERTIFICATE",
        paperSize: "A4",
        orientation: "PORTRAIT",
        isDefault: true,
        status: "ACTIVE",
        description: "Official school departure and migration document.",
        designConfig: {
            theme: {
                primaryColor: "#831843",
                secondaryColor: "#BE185D",
                textColor: "#1E293B",
                accentColor: "#D97706",
                backgroundColor: "#FFFFFF",
                fontFamily: "Inter"
            },
            header: {
                showSchoolLogo: true,
                logoPosition: "CENTER",
                showSchoolName: true,
                showTagline: true,
                showAffiliation: true,
                showSchoolAddress: true,
                showContactInfo: true
            },
            body: {
                layout: "SINGLE_COL",
                showStudentPhoto: false,
                photoPosition: "TOP_RIGHT",
                showBarcodeOrQr: true,
                barcodeType: "QR_CODE",
                barcodeContent: "TC_VERIFICATION"
            },
            idCardSides: {
                hasBackSide: false,
                backSideConfig: {}
            },
            watermark: {
                enabled: true,
                opacity: 0.05,
                type: "SCHOOL_LOGO"
            },
            footer: {
                showIssueDate: true,
                showAuthorizedSignature: true,
                signatureTitle: "Head of Institution / Principal"
            }
        },
        selectedFields: [
            { key: "fullName", label: "Name of Pupil", visible: true, order: 1, isBold: true },
            { key: "fatherName", label: "Father / Guardian Name", visible: true, order: 2 },
            { key: "motherName", label: "Mother Name", visible: true, order: 3 },
            { key: "nationality", label: "Nationality", visible: true, order: 4 },
            { key: "dateOfAdmission", label: "Date of First Admission", visible: true, order: 5 },
            { key: "dateOfBirth", label: "Date of Birth", visible: true, order: 6 },
            { key: "classStudying", label: "Class in which Pupil last studied", visible: true, order: 7 },
            { key: "schoolDuesPaid", label: "Whether School Dues Paid", visible: true, order: 8 },
            { key: "generalConduct", label: "General Conduct", visible: true, order: 9 },
            { key: "reasonForLeaving", label: "Reason for Leaving", visible: true, order: 10 }
        ]
    },
    LEAVING_CERTIFICATE: {
        name: "Standard School Leaving Certificate",
        type: "LEAVING_CERTIFICATE",
        paperSize: "A4",
        orientation: "PORTRAIT",
        isDefault: true,
        status: "ACTIVE",
        description: "Official leaving certificate issued at conclusion of schooling.",
        designConfig: {
            theme: {
                primaryColor: "#1E293B",
                secondaryColor: "#475569",
                textColor: "#0F172A",
                accentColor: "#0284C7",
                backgroundColor: "#FFFFFF",
                fontFamily: "Inter"
            },
            header: {
                showSchoolLogo: true,
                logoPosition: "CENTER",
                showSchoolName: true,
                showTagline: true,
                showAffiliation: true,
                showSchoolAddress: true,
                showContactInfo: true
            },
            body: {
                layout: "SINGLE_COL",
                showStudentPhoto: false,
                photoPosition: "TOP_RIGHT",
                showBarcodeOrQr: false,
                barcodeType: "NONE",
                barcodeContent: "STUDENT_ID"
            },
            idCardSides: {
                hasBackSide: false,
                backSideConfig: {}
            },
            watermark: {
                enabled: true,
                opacity: 0.05,
                type: "SCHOOL_LOGO"
            },
            footer: {
                showIssueDate: true,
                showAuthorizedSignature: true,
                signatureTitle: "Principal & Secretary"
            }
        },
        selectedFields: [
            { key: "fullName", label: "Student Name", visible: true, order: 1, isBold: true },
            { key: "admissionNumber", label: "General Register No", visible: true, order: 2 },
            { key: "dateOfBirth", label: "Date of Birth", visible: true, order: 3 },
            { key: "lastSchoolAttended", label: "Previous School Attended", visible: true, order: 4 },
            { key: "progressReport", label: "Academic Progress", visible: true, order: 5 },
            { key: "conduct", label: "Character & Conduct", visible: true, order: 6 }
        ]
    }
};

/**
 * Get all templates with optional filtering
 */
export const getAllTemplates = async ({ type, status, search }) => {
    // Auto-seed standard templates if none exist
    const count = await DocumentTemplate.count();
    if (count === 0) {
        await seedDefaultTemplates();
    }

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } }
        ];
    }

    return await DocumentTemplate.findAll({
        where,
        order: [['is_default', 'DESC'], ['updated_at', 'DESC']],
        include: [
            {
                model: User,
                as: 'updater',
                attributes: ['id', 'firstName', 'lastName']
            }
        ]
    });
};

/**
 * Get template by ID
 */
export const getTemplateById = async (id) => {
    return await DocumentTemplate.findByPk(id, {
        include: [
            {
                model: User,
                as: 'creator',
                attributes: ['id', 'firstName', 'lastName']
            },
            {
                model: User,
                as: 'updater',
                attributes: ['id', 'firstName', 'lastName']
            }
        ]
    });
};

/**
 * Get the active default template for a given document type
 */
export const getDefaultTemplate = async (type) => {
    let template = await DocumentTemplate.findOne({
        where: { type, isDefault: true, status: 'ACTIVE' }
    });

    if (!template) {
        template = await DocumentTemplate.findOne({
            where: { type, status: 'ACTIVE' },
            order: [['updated_at', 'DESC']]
        });
    }

    return template;
};

/**
 * Create a new template
 */
export const createTemplate = async (data, userId) => {
    // If setting as default, clear existing default for this type
    if (data.isDefault) {
        await DocumentTemplate.update(
            { isDefault: false },
            { where: { type: data.type } }
        );
    }

    return await DocumentTemplate.create({
        ...data,
        createdById: userId,
        updatedById: userId
    });
};

/**
 * Update an existing template
 */
export const updateTemplate = async (id, data, userId) => {
    const template = await DocumentTemplate.findByPk(id);
    if (!template) {
        throw new Error('Template not found');
    }

    if (data.isDefault && !template.isDefault) {
        await DocumentTemplate.update(
            { isDefault: false },
            { where: { type: template.type } }
        );
    }

    await template.update({
        ...data,
        updatedById: userId
    });

    return template;
};

/**
 * Duplicate a template
 */
export const duplicateTemplate = async (id, userId) => {
    const original = await DocumentTemplate.findByPk(id);
    if (!original) {
        throw new Error('Original template not found');
    }

    const copyData = {
        name: `${original.name} (Copy)`,
        description: original.description,
        type: original.type,
        status: 'DRAFT',
        paperSize: original.paperSize,
        orientation: original.orientation,
        isDefault: false,
        designConfig: original.designConfig,
        selectedFields: original.selectedFields,
        createdById: userId,
        updatedById: userId
    };

    return await DocumentTemplate.create(copyData);
};

/**
 * Set a template as default for its type
 */
export const setDefaultTemplate = async (id, userId) => {
    const template = await DocumentTemplate.findByPk(id);
    if (!template) {
        throw new Error('Template not found');
    }

    await DocumentTemplate.update(
        { isDefault: false },
        { where: { type: template.type } }
    );

    await template.update({
        isDefault: true,
        status: 'ACTIVE',
        updatedById: userId
    });

    return template;
};

/**
 * Delete a template
 */
export const deleteTemplate = async (id) => {
    const template = await DocumentTemplate.findByPk(id);
    if (!template) {
        throw new Error('Template not found');
    }

    if (template.isDefault) {
        throw new Error('Cannot delete the default active template for this document type. Please set another template as default first.');
    }

    await template.destroy();
    return true;
};

/**
 * Seed initial baseline default templates
 */
export const seedDefaultTemplates = async () => {
    const existingCount = await DocumentTemplate.count();
    if (existingCount > 0) return;

    for (const key of Object.keys(DEFAULT_DESIGN_TEMPLATES)) {
        await DocumentTemplate.create(DEFAULT_DESIGN_TEMPLATES[key]);
    }
};
