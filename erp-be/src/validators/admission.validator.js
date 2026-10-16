import { z } from 'zod';

export const generateFormSchema = z.object({
    classroomId: z.string().uuid({ message: 'Invalid classroom ID' }),
    expiresAt: z.string().datetime().optional().nullable().refine(val => {
        if (!val) return true;
        return new Date(val) > new Date();
    }, { message: "Expiry date must be in the future" }),
    customFields: z.array(z.object({
        name: z.string().min(1, 'Field name is required'),
        label: z.string().min(1, 'Field label is required'),
        type: z.enum(['text', 'number', 'email', 'date', 'dropdown', 'checkbox', 'textarea']),
        required: z.boolean().default(false),
        options: z.array(z.string()).optional(),
    })).default([])
});

export const submitApplicationSchema = z.object({
    // Standard Fields
    studentFirstName: z.string().min(1, 'Student first name is required').max(100),
    studentLastName: z.string().min(1, 'Student last name is required').max(100),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
    gender: z.string().min(1, 'Gender is required'),
    bloodGroup: z.string().max(5).optional(),
    aadhaarNumber: z.string().max(20).optional(),
    previousSchoolName: z.string().max(200).optional(),
    previousClass: z.string().max(50).optional(),
    currentAddress: z.string().min(1, 'Current address is required'),
    permanentAddress: z.string().min(1, 'Permanent address is required'),

    fatherName: z.string().min(1, 'Father name is required').max(200),
    motherName: z.string().min(1, 'Mother name is required').max(200),
    guardianName: z.string().max(200).optional(),
    primaryContactNumber: z.string().min(1, 'Primary contact number is required').max(20),
    alternateContactNumber: z.string().max(20).optional(),
    parentEmail: z.string().email('Invalid parent email').max(255),
    fatherOccupation: z.string().max(100).optional(),
    motherOccupation: z.string().max(100).optional(),
    annualFamilyIncome: z.string().max(100).optional(),

    preferredClassId: z.string().uuid().optional(),
    medicalNotes: z.string().optional(),
    declarationAccepted: z.boolean().refine(val => val === true, {
        message: 'You must accept the declaration'
    }),
    
    // Bank Details
    bankAccountNumber: z.string().max(50).optional(),
    bankIfscCode: z.string().max(20).optional(),
    bankName: z.string().max(100).optional(),
    bankBranch: z.string().max(100).optional(),
    bankMicrNumber: z.string().max(20).optional(),
    
    // Dynamic Fields Data
    customFieldResponses: z.record(z.any()).default({})
});

export const updateStatusSchema = z.object({
    status: z.enum(['Pending', 'Admitted', 'Rejected']),
    rejectionReason: z.string().optional(),
    rollNumber: z.string().optional(),
    admissionNumber: z.string().optional(),
    password: z.string().optional(),
    
    // Editable fields from application
    studentFirstName: z.string().optional(),
    studentLastName: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    bloodGroup: z.string().optional(),
    aadhaarNumber: z.string().optional(),
    previousSchoolName: z.string().optional(),
    previousClass: z.string().optional(),
    currentAddress: z.string().optional(),
    permanentAddress: z.string().optional(),
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
    guardianName: z.string().optional(),
    primaryContactNumber: z.string().optional(),
    alternateContactNumber: z.string().optional(),
    parentEmail: z.string().optional(),
    fatherOccupation: z.string().optional(),
    motherOccupation: z.string().optional(),
    annualFamilyIncome: z.string().optional(),
    preferredClassId: z.string().uuid().optional(),
    medicalNotes: z.string().optional(),
    
    // Bank Details
    bankAccountNumber: z.string().max(50).optional(),
    bankIfscCode: z.string().max(20).optional(),
    bankName: z.string().max(100).optional(),
    bankBranch: z.string().max(100).optional(),
    bankMicrNumber: z.string().max(20).optional(),

    customFieldResponses: z.record(z.any()).optional()
}).refine(data => {
    if (data.status === 'Rejected' && (!data.rejectionReason || !data.rejectionReason.trim())) {
        return false;
    }
    return true;
}, {
    message: "Rejection reason is required when rejecting an application",
    path: ["rejectionReason"]
}).refine(data => {
    if (data.status === 'Admitted' && !data.rollNumber?.trim()) {
        return false;
    }
    return true;
}, {
    message: "Roll number is required when admitting a student",
    path: ["rollNumber"]
}).refine(data => {
    if (data.status === 'Admitted' && !data.admissionNumber?.trim()) {
        return false;
    }
    return true;
}, {
    message: "Admission number is required when admitting a student",
    path: ["admissionNumber"]
}).refine(data => {
    if (data.status === 'Admitted' && (!data.password?.trim() || data.password.length < 8)) {
        return false;
    }
    return true;
}, {
    message: "Password is required (min 8 characters) when admitting a student",
    path: ["password"]
});
