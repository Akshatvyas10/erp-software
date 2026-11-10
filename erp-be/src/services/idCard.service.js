'use strict';

import db from '../models/index.js';
const { DocumentTemplate, Student, Teacher, User, Classroom, ClassroomStudent, SchoolConfig, IssuedDocument } = db;
import { Op } from 'sequelize';

/**
 * Service to handle centralized ID Card generation, template binding, and audit logging.
 */

/**
 * Get active template for a given document type, falling back to default or latest active.
 */
export const getActiveTemplate = async (documentType, customTemplateId = null) => {
    if (customTemplateId) {
        const customTemplate = await DocumentTemplate.findByPk(customTemplateId);
        if (customTemplate && customTemplate.type === documentType) {
            return customTemplate;
        }
    }

    // Try default active template
    let template = await DocumentTemplate.findOne({
        where: {
            type: documentType,
            status: 'ACTIVE',
            isDefault: true
        }
    });

    if (!template) {
        // Fallback to any active template of this type
        template = await DocumentTemplate.findOne({
            where: {
                type: documentType,
                status: 'ACTIVE'
            },
            order: [['updatedAt', 'DESC']]
        });
    }

    return template;
};

/**
 * Fetch centralized school info for ID cards, certificates, and document templates
 */
export const getSchoolBranding = async () => {
    const config = await SchoolConfig.findOne();
    if (!config) {
        return {
            schoolName: "INSTITUTION NAME",
            tagline: "",
            address: "",
            addressLine1: "",
            addressLine2: "",
            city: "",
            state: "",
            pincode: "",
            country: "",
            phone: "",
            primaryPhone: "",
            secondaryPhone: "",
            email: "",
            website: "",
            logoUrl: "",
            watermarkUrl: "",
            boardType: "",
            affiliationNumber: "",
            schoolCode: "",
            principalSignatureUrl: "",
            stampUrl: "",
            authorizedSignatoryName: "Principal",
            authorizedSignatoryDesignation: "Head of School"
        };
    }

    const fullAddress = [
        config.addressLine1, 
        config.addressLine2, 
        config.city, 
        config.state, 
        config.pincode,
        config.country
    ].filter(Boolean).join(', ');

    return {
        schoolName: config.schoolName || "",
        tagline: config.tagline || "",
        address: fullAddress,
        addressLine1: config.addressLine1 || "",
        addressLine2: config.addressLine2 || "",
        city: config.city || "",
        state: config.state || "",
        pincode: config.pincode || "",
        country: config.country || "",
        phone: config.primaryPhone || config.secondaryPhone || "",
        primaryPhone: config.primaryPhone || "",
        secondaryPhone: config.secondaryPhone || "",
        email: config.email || "",
        website: config.website || "",
        logoUrl: config.logoUrl || "",
        watermarkUrl: config.watermarkUrl || "",
        boardType: config.boardType || "",
        affiliationNumber: config.affiliationNumber || "",
        schoolCode: config.schoolCode || "",
        principalSignatureUrl: config.principalSignatureUrl || "",
        stampUrl: config.stampUrl || "",
        authorizedSignatoryName: config.authorizedSignatoryName || "Principal",
        authorizedSignatoryDesignation: config.authorizedSignatoryDesignation || "Head of School"
    };
};

/**
 * Generate Student ID Cards (Single or Bulk)
 * 
 * @param {Object} params
 * @param {string} [params.classroomId]
 * @param {Array<string>} [params.studentIds]
 * @param {string} [params.templateId]
 * @param {string} params.issuedById
 * @param {Object} [params.actor] User object
 */
export const generateStudentIdCards = async ({ classroomId, studentIds, templateId, issuedById, actor }) => {
    // 1. Check active template
    const template = await getActiveTemplate('STUDENT_ID_CARD', templateId);
    const school = await getSchoolBranding();

    // 2. Query student records
    let whereClause = {};
    if (studentIds && studentIds.length > 0) {
        whereClause.id = { [Op.in]: studentIds };
    }

    let include = [
        {
            model: User,
            as: 'account',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
            model: ClassroomStudent,
            as: 'classroomEnrollments',
            include: [{
                model: Classroom,
                as: 'classroom',
                attributes: ['id', 'name', 'section', 'academicYear']
            }]
        }
    ];

    if (classroomId) {
        // Ensure student belongs to this classroom
        include[1].where = { classroomId };
        include[1].required = true;
    }

    const students = await Student.findAll({
        where: whereClause,
        include,
        order: [['admissionNumber', 'ASC']]
    });

    if (!students || students.length === 0) {
        return {
            template,
            school,
            cards: [],
            total: 0
        };
    }

    // 3. Format payload for preview/render
    const cards = students.map(student => {
        const user = student.account || {};
        const enrollment = (student.classroomEnrollments && student.classroomEnrollments[0]) || {};
        const classroom = enrollment.classroom || {};

        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student Name';
        const className = classroom.name ? `${classroom.name}${classroom.section ? ` - ${classroom.section}` : ''}` : (student.grade || 'Grade 10');

        return {
            studentId: student.id,
            admissionNumber: student.admissionNumber || student.studentId || 'ADM-2024-001',
            rollNumber: enrollment.rollNumber || student.rollNumber || '01',
            fullName,
            firstName: user.firstName,
            lastName: user.lastName,
            photoUrl: student.profilePhotoUrl || '',
            className,
            section: classroom.section || student.section || 'A',
            grade: classroom.name || student.grade || '10',
            academicYear: classroom.academicYear || '2024-25',
            dob: student.dateOfBirth ? String(student.dateOfBirth) : '',
            bloodGroup: student.bloodGroup || 'O+',
            emergencyContact: student.guardianPhone || user.phone || '9876543210',
            address: student.currentAddress || student.permanentAddress || student.address || school.address,
            busRoute: student.transportationMode === 'SCHOOL_BUS' ? 'School Bus' : (student.transportationMode || 'Walker / Self'),
            schoolInfo: school
        };
    });

    // 4. Record audit log asynchronously
    if (issuedById) {
        try {
            const auditRecords = students.map(s => ({
                documentType: 'STUDENT_ID_CARD',
                templateId: template?.id || null,
                subjectType: 'STUDENT',
                subjectId: s.id,
                issuedById,
                mode: 'without_signature',
                metadata: {
                    admissionNumber: s.admissionNumber,
                    classroomId: classroomId || null,
                    templateName: template?.name || 'Standard ID Card'
                }
            }));
            await IssuedDocument.bulkCreate(auditRecords, { ignoreDuplicates: true });
        } catch (auditErr) {
            console.error('Failed to log IssuedDocument audit:', auditErr);
        }
    }

    return {
        template,
        school,
        cards,
        total: cards.length
    };
};

/**
 * Generate Teacher ID Cards (Single or Bulk)
 * 
 * @param {Object} params
 * @param {Array<string>} [params.teacherIds]
 * @param {string} [params.templateId]
 * @param {string} params.issuedById
 */
export const generateTeacherIdCards = async ({ teacherIds, templateId, issuedById }) => {
    // 1. Check active template
    const template = await getActiveTemplate('TEACHER_ID_CARD', templateId);
    const school = await getSchoolBranding();

    // 2. Query teachers
    let whereClause = {};
    if (teacherIds && teacherIds.length > 0) {
        whereClause.id = { [Op.in]: teacherIds };
    }

    const teachers = await Teacher.findAll({
        where: whereClause,
        include: [
            {
                model: User,
                as: 'account',
                attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
            }
        ],
        order: [['teacherId', 'ASC']]
    });

    if (!teachers || teachers.length === 0) {
        return {
            template,
            school,
            cards: [],
            total: 0
        };
    }

    // 3. Format cards
    const cards = teachers.map(teacher => {
        const user = teacher.account || {};
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Teacher Name';

        const humanId = teacher.teacherId || teacher.employeeNumber || 'TCH-001';
        const empCode = teacher.employeeNumber || teacher.teacherId || humanId;

        return {
            id: teacher.id,
            teacherId: humanId,
            employeeId: empCode,
            teacherCode: humanId,
            fullName,
            firstName: user.firstName,
            lastName: user.lastName,
            photoUrl: teacher.profilePhotoUrl || '',
            department: teacher.department || 'Academics',
            designation: teacher.designation ? teacher.designation.replace(/_/g, ' ') : 'Faculty Member',
            phone: teacher.phone || user.phone || '9876543210',
            email: user.email || '',
            joiningDate: teacher.joiningDate ? String(teacher.joiningDate) : '',
            bloodGroup: teacher.bloodGroup || 'B+',
            schoolInfo: school
        };
    });

    // 4. Audit log
    if (issuedById) {
        try {
            const auditRecords = teachers.map(t => ({
                documentType: 'TEACHER_ID_CARD',
                templateId: template?.id || null,
                subjectType: 'TEACHER',
                subjectId: t.id,
                issuedById,
                mode: 'without_signature',
                metadata: {
                    employeeId: t.employeeNumber || t.teacherId,
                    templateName: template?.name || 'Faculty ID Card'
                }
            }));
            await IssuedDocument.bulkCreate(auditRecords, { ignoreDuplicates: true });
        } catch (auditErr) {
            console.error('Failed to log IssuedDocument audit for teachers:', auditErr);
        }
    }

    return {
        template,
        school,
        cards,
        total: cards.length
    };
};

/**
 * Get Student's Own ID Card
 */
export const getMyStudentIdCard = async (userId) => {
    const student = await Student.findOne({
        where: { userId },
        include: [
            {
                model: User,
                as: 'account',
                attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
            },
            {
                model: ClassroomStudent,
                as: 'classroomEnrollments',
                include: [{
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'name', 'section', 'academicYear']
                }]
            }
        ]
    });

    if (!student) {
        throw new Error('Student profile not found for current user');
    }

    return generateStudentIdCards({
        studentIds: [student.id],
        issuedById: null
    });
};
