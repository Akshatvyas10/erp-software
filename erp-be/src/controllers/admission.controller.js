'use strict';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../models/index.js';
const { AdmissionForm, AdmissionApplication, Classroom, User, Student, Role, ClassroomStudent } = db;
import { success, error } from '../utils/apiResponse.js';
import { sendAdmissionSubmissionEmail, sendAdmissionApprovalEmail, sendAdmissionRejectionEmail } from '../services/email.service.js';
import { generateFormSchema, submitApplicationSchema, updateStatusSchema } from '../validators/admission.validator.js';

// =============================================================================
// HELPER — Auto-generate ERP user login ID  ("ERP-00002")
// =============================================================================
const generateUserId = async (t) => {
    const [results] = await db.sequelize.query("SELECT nextval('erp_user_id_seq') as seq", { transaction: t });
    return `ERP-${String(results[0].seq).padStart(5, '0')}`;
};

// =============================================================================
// HELPER — Auto-generate ERP internal student ID  ("STU-00001")
// =============================================================================
const generateStudentId = async (t) => {
    const [results] = await db.sequelize.query("SELECT nextval('erp_student_id_seq') as seq", { transaction: t });
    return `STU-${String(results[0].seq).padStart(5, '0')}`;
};

// =============================================================================
// HELPER — Auto-generate admission number  ("ADM-2026-0014")
// =============================================================================
const generateAdmissionNumber = async (t) => {
    const year = new Date().getFullYear();
    const [results] = await db.sequelize.query("SELECT nextval('student_adm_seq') as seq", { transaction: t });
    const seq = String(results[0].seq).padStart(4, '0');
    return `ADM-${year}-${seq}`;
};

// =============================================================================
// POST /api/admissions/generate
// Generate a new admission form link for a classroom
// =============================================================================
export const generateForm = async (req, res, next) => {
    try {
        const validated = generateFormSchema.parse(req.body);
        
        // Ensure classroom exists
        const classroom = await Classroom.findByPk(validated.classroomId);
        if (!classroom) return error(res, 'Classroom not found', 404);

        const token = crypto.randomBytes(32).toString('hex');

        const form = await AdmissionForm.create({
            classroomId: validated.classroomId,
            token,
            expiresAt: validated.expiresAt || null,
            createdBy: req.user.id,
            customFields: validated.customFields
        });

        return success(res, {
            formId: form.id,
            token: form.token,
            publicUrl: `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/public/admissions/${form.token}`
        }, 'Form generated successfully', 201);
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// GET /api/admissions/public/:token
// Get form details publicly
// =============================================================================
export const getPublicForm = async (req, res, next) => {
    try {
        const { token } = req.params;
        const form = await AdmissionForm.findOne({
            where: { token, isActive: true },
            include: [{ model: Classroom, as: 'classroom', attributes: ['name', 'section', 'academicYear'] }]
        });

        if (!form) return error(res, 'Form not found or expired', 404);
        if (form.expiresAt && new Date() > new Date(form.expiresAt)) {
            return error(res, 'This form has expired', 400);
        }

        return success(res, {
            classroom: form.classroom,
            customFields: form.customFields
        }, 'Form details fetched');
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// POST /api/admissions/public/:token
// Submit admission application
// =============================================================================
export const submitApplication = async (req, res, next) => {
    try {
        const { token } = req.params;
        const form = await AdmissionForm.findOne({ where: { token, isActive: true } });

        if (!form) return error(res, 'Form not found or expired', 404);
        if (form.expiresAt && new Date() > new Date(form.expiresAt)) {
            return error(res, 'This form has expired', 400);
        }

        const validated = submitApplicationSchema.parse(req.body);

        // Validate required custom fields manually
        const missingFields = [];
        for (const field of form.customFields) {
            if (field.required && !validated.customFieldResponses[field.name]) {
                missingFields.push(field.label);
            }
        }
        if (missingFields.length > 0) {
            return error(res, `Missing required custom fields: ${missingFields.join(', ')}`, 400);
        }

        const application = await AdmissionApplication.create({
            formId: form.id,
            ...validated
        });

        // Send confirmation email asynchronously (non-blocking)
        setImmediate(async () => {
            try {
                await sendAdmissionSubmissionEmail(validated.parentEmail, `${validated.studentFirstName} ${validated.studentLastName}`);
                logger.info(`[Admission] Confirmation email dispatched to ${validated.parentEmail}`);
            } catch (mailErr) {
                logger.warn(`[Admission] Confirmation email failed for ${validated.parentEmail}: ${mailErr.message}`);
            }
        });

        return success(res, { applicationId: application.id }, 'Application submitted successfully', 201);
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// GET /api/admissions
// List applications (Admin/Staff)
// =============================================================================
export const listApplications = async (req, res, next) => {
    try {
        const status = req.query.status;
        const where = {};
        if (status) where.status = status;

        const applications = await AdmissionApplication.findAll({
            where,
            include: [{
                model: AdmissionForm,
                as: 'form',
                include: [{ model: Classroom, as: 'classroom', attributes: ['name', 'section'] }]
            }],
            order: [['createdAt', 'DESC']]
        });

        return success(res, applications, 'Applications fetched');
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// PATCH /api/admissions/:id/status
// Update application status (Admit/Reject)
// =============================================================================
export const updateApplicationStatus = async (req, res, next) => {
    const t = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const validated = updateStatusSchema.parse(req.body);

        const application = await AdmissionApplication.findByPk(id, {
            include: [{ model: AdmissionForm, as: 'form' }]
        });

        if (!application) {
            await t.rollback();
            return error(res, 'Application not found', 404);
        }

        if (application.status !== 'Pending') {
            await t.rollback();
            return error(res, `Application is already ${application.status}`, 400);
        }

        application.status = validated.status;
        application.rejectionReason = validated.rejectionReason || null;
        application.actionBy = req.user.id;
        application.actionAt = new Date();
        
        // Update editable fields if they were provided
        const updatableFields = [
            'studentFirstName', 'studentLastName', 'dateOfBirth', 'gender', 'bloodGroup',
            'aadhaarNumber', 'previousSchoolName', 'previousClass', 'currentAddress',
            'permanentAddress', 'fatherName', 'motherName', 'guardianName',
            'primaryContactNumber', 'alternateContactNumber', 'parentEmail',
            'fatherOccupation', 'motherOccupation', 'annualFamilyIncome', 'medicalNotes', 'customFieldResponses',
            'bankAccountNumber', 'bankIfscCode', 'bankName', 'bankBranch', 'bankMicrNumber'
        ];
        
        updatableFields.forEach(field => {
            if (validated[field] !== undefined) {
                application[field] = validated[field];
            }
        });
        
        await application.save({ transaction: t });

        const studentName = `${application.studentFirstName} ${application.studentLastName}`;

        if (validated.status === 'Rejected') {
            await t.commit();
            setImmediate(async () => {
                try {
                    await sendAdmissionRejectionEmail(application.parentEmail, studentName, validated.rejectionReason);
                    logger.info(`[Admission] Rejection email dispatched to ${application.parentEmail}`);
                } catch (mailErr) {
                    logger.warn(`[Admission] Rejection email failed for ${application.parentEmail}: ${mailErr.message}`);
                }
            });
            return success(res, { application }, 'Application rejected');
        }

        // --- Admitted Flow ---
        
        // 1. Find Student Role
        const studentRole = await Role.findOne({ where: { name: 'student' }, transaction: t });
        if (!studentRole) throw new Error("Student role not found in the database.");

        // 2. Generate Credentials
        const userId = await generateUserId(t);
        const tempPassword = validated.password;
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        // Use provided email or fallback
        const userEmail = application.parentEmail.toLowerCase(); 

        // 3. Create User Account
        const user = await User.create({
            userId,
            email: userEmail,
            password: hashedPassword,
            firstName: application.studentFirstName,
            lastName: application.studentLastName,
            isActive: true,
            emailVerified: true
        }, { transaction: t });

        await user.addRole(studentRole, { transaction: t });

        // 4. Create Student Profile
        const studentId = await generateStudentId(t);
        const admissionNumber = validated.admissionNumber;

        const student = await Student.create({
            userId: user.id,
            studentId,
            admissionNumber,
            dateOfBirth: application.dateOfBirth,
            gender: application.gender,
            bloodGroup: application.bloodGroup,
            medicalNotes: application.medicalNotes,
            currentAddress: application.currentAddress,
            permanentAddress: application.permanentAddress,
            guardianName: application.fatherName || application.motherName || application.guardianName,
            guardianPhone: application.primaryContactNumber,
            guardianEmail: application.parentEmail,
            bankAccountNumber: application.bankAccountNumber,
            bankIfscCode: application.bankIfscCode,
            bankName: application.bankName,
            bankBranch: application.bankBranch,
            bankMicrNumber: application.bankMicrNumber,
            customFieldResponses: application.customFieldResponses, // ← copy custom fields
        }, { transaction: t });

        // 5. Enroll in Classroom
        await ClassroomStudent.create({
            classroomId: application.form.classroomId,
            studentId: student.id,
            rollNumber: validated.rollNumber
        }, { transaction: t });

        await t.commit();

        // Send Email asynchronously (non-blocking)
        setImmediate(async () => {
            try {
                await sendAdmissionApprovalEmail(application.parentEmail, studentName, user.userId, tempPassword);
                logger.info(`[Admission] Approval email dispatched to ${application.parentEmail}`);
            } catch (mailErr) {
                logger.warn(`[Admission] Approval email failed for ${application.parentEmail}: ${mailErr.message}`);
            }
        });

        return success(res, { application, studentId: student.id }, 'Application admitted and student account created');
    } catch (err) {
        await t.rollback();
        next(err);
    }
};

// =============================================================================
// GET /api/admissions/forms/classroom/:classroomId
// Get active form configuration for a classroom (for internal manual enrollment)
// =============================================================================
export const getFormByClassroom = async (req, res, next) => {
    try {
        const { classroomId } = req.params;
        const form = await AdmissionForm.findOne({
            where: { classroomId, isActive: true },
            order: [['createdAt', 'DESC']],
            include: [{ model: Classroom, as: 'classroom', attributes: ['name', 'section'] }]
        });

        if (!form) {
            // Return empty config instead of 404 to not break the UI if no form exists
            return success(res, { customFields: [] }, 'No active form found for this classroom');
        }

        return success(res, { customFields: form.customFields }, 'Form configuration fetched');
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// LIST GENERATED FORMS (Links)
// =============================================================================
export const listForms = async (req, res, next) => {
    try {
        const forms = await AdmissionForm.findAll({
            order: [['createdAt', 'DESC']],
            include: [{ model: Classroom, as: 'classroom', attributes: ['name', 'section', 'academicYear'] }]
        });
        return success(res, { forms }, 'Generated forms fetched successfully');
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// GET /api/admissions/public/application/:id/status
// Get basic status of an application publicly
// =============================================================================
export const getApplicationStatusPublic = async (req, res, next) => {
    try {
        const { id } = req.params;
        const application = await AdmissionApplication.findByPk(id, {
            attributes: ['id', 'status', 'studentFirstName', 'studentLastName']
        });
        
        if (!application) return error(res, 'Application not found', 404);
        
        return success(res, { 
            status: application.status,
            name: `${application.studentFirstName} ${application.studentLastName}`
        }, 'Application status fetched');
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// PATCH /api/admissions/forms/:id/toggle-status
// Toggle form isActive status
// =============================================================================
export const toggleFormStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const form = await AdmissionForm.findByPk(id);
        if (!form) return error(res, 'Form not found', 404);

        form.isActive = !form.isActive;
        await form.save();

        return success(res, { form }, `Form ${form.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// PATCH /api/admissions/forms/bulk-toggle-status
// Bulk toggle form isActive status
// =============================================================================
export const bulkToggleFormStatus = async (req, res, next) => {
    try {
        const { ids, isActive } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return error(res, 'No form IDs provided', 400);
        }

        await AdmissionForm.update(
            { isActive },
            { where: { id: ids } }
        );

        return success(res, null, `Forms ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
        next(err);
    }
};

