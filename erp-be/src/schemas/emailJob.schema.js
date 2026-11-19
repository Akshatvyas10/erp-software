import { z } from 'zod';

/**
 * Strict Zod validation schemas for all BullMQ email queue jobs.
 * Enforces contract validation so malformed payloads fail fast.
 */

export const EmailJobTypeEnum = z.enum([
    'WELCOME_EMAIL',
    'STUDENT_ENROLLMENT',
    'PARENT_ENROLLMENT',
    'TEACHER_ENROLLMENT',
    'ADMISSION_SUBMITTED',
    'ADMISSION_APPROVED',
    'ADMISSION_REJECTED',
    'ADMIN_ADMISSION_ALERT',
    'STUDENT_LEAVE_APPLIED',
    'STUDENT_LEAVE_DECIDED',
    'TEACHER_LEAVE_APPLIED',
    'TEACHER_LEAVE_DECIDED',
    'PASSWORD_RESET',
    'LOGIN_OTP',
    'ACCOUNT_ACTIVATED',
    'PERMISSION_UPDATED',
    'SYSTEM_NOTIFICATION',
    'FEE_REMINDER',
    'RAW_EMAIL'
]);

export const EmailJobPayloadSchema = z.object({
    type: EmailJobTypeEnum,
    payload: z.record(z.any()),
    metadata: z.object({
        enqueuedAt: z.string().optional(),
        correlationId: z.string().optional(),
        source: z.string().optional()
    }).optional()
});

// Specific payload schemas for granular checks
export const WelcomeEmailPayloadSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    userId: z.string().optional(),
    tempPassword: z.string().optional()
});

export const StudentEnrollmentPayloadSchema = z.object({
    studentEmail: z.string().email(),
    studentName: z.string().min(1),
    admissionNumber: z.string().min(1),
    classroomName: z.string().min(1),
    studentId: z.string().optional(),
    temporaryPassword: z.string().optional(),
    parentName: z.string().optional(),
    parentEmail: z.string().email().optional(),
    academicYear: z.string().optional()
});

export const AdmissionSubmittedPayloadSchema = z.object({
    parentEmail: z.string().email(),
    studentName: z.string().min(1),
    applicationNumber: z.string().optional()
});

export const AdmissionApprovedPayloadSchema = z.object({
    parentEmail: z.string().email(),
    studentName: z.string().min(1),
    studentId: z.string().min(1),
    temporaryPassword: z.string().min(1)
});

export const AdmissionRejectedPayloadSchema = z.object({
    parentEmail: z.string().email(),
    studentName: z.string().min(1),
    reason: z.string().optional()
});

export const StudentLeaveAppliedPayloadSchema = z.object({
    requestId: z.string().uuid().optional(),
    studentName: z.string().min(1),
    classroomName: z.string().optional(),
    fromDate: z.string().min(1),
    toDate: z.string().min(1),
    reason: z.string().optional(),
    facultyEmail: z.string().email().optional()
});

export const StudentLeaveDecidedPayloadSchema = z.object({
    requestId: z.string().uuid().optional(),
    status: z.enum(['APPROVED', 'REJECTED']),
    studentName: z.string().min(1),
    studentEmail: z.string().email().optional().nullable(),
    guardianEmail: z.string().email().optional().nullable(),
    fromDate: z.string().min(1),
    toDate: z.string().min(1),
    actionByName: z.string().optional(),
    decisionRemark: z.string().optional()
});

export const RawEmailPayloadSchema = z.object({
    to: z.string().email(),
    subject: z.string().min(1),
    html: z.string().min(1),
    text: z.string().optional()
});

export default {
    EmailJobTypeEnum,
    EmailJobPayloadSchema,
    WelcomeEmailPayloadSchema,
    StudentEnrollmentPayloadSchema,
    AdmissionSubmittedPayloadSchema,
    AdmissionApprovedPayloadSchema,
    AdmissionRejectedPayloadSchema,
    StudentLeaveAppliedPayloadSchema,
    StudentLeaveDecidedPayloadSchema,
    RawEmailPayloadSchema
};

