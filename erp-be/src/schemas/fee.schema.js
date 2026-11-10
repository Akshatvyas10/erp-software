import { z } from 'zod';

export const feeHeadSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    code: z
        .string()
        .max(30)
        .optional()
        .nullable()
        .transform((val) => (val ? val.toUpperCase().trim() : undefined)),
    description: z.string().max(255).optional().nullable(),
    category: z.enum(['TUITION', 'ADMISSION', 'EXAM', 'LAB', 'TRANSPORT', 'ACTIVITY', 'LIBRARY', 'HOSTEL', 'FINE', 'OTHER']).default('OTHER'),
    isOptional: z.boolean().default(false),
    isRefundable: z.boolean().default(false),
    isActive: z.boolean().default(true),
});

export const feeHeadUpdateSchema = feeHeadSchema.partial();

export const feeStructureItemSchema = z.object({
    feeHeadId: z.string().uuid('Invalid Fee Head UUID'),
    amount: z.number().min(0, 'Amount must be >= 0'),
    isMandatory: z.boolean().default(true),
    notes: z.string().max(255).optional().nullable(),
});

export const feeStructureSchema = z.object({
    name: z.string().min(3, 'Structure name must be at least 3 characters').max(120),
    academicYearId: z.string().uuid('Invalid Academic Year UUID'),
    classroomId: z.string().uuid('Invalid Classroom UUID').optional().nullable(),
    quota: z.enum(['GENERAL', 'STAFF_CHILD', 'SCHOLARSHIP', 'SIBLING_DISCOUNT', 'RTE', 'OTHER']).default('GENERAL'),
    frequency: z.enum(['MONTHLY', 'QUARTERLY', 'TERMLY', 'HALF_YEARLY', 'ANNUALLY', 'ONE_TIME']).default('ANNUALLY'),
    dueDayOfMonth: z.number().int().min(1).max(31).default(10),
    lateFineAmount: z.number().min(0).default(0),
    lateFineGraceDays: z.number().int().min(0).max(60).default(7),
    isActive: z.boolean().default(true),
    items: z.array(feeStructureItemSchema).min(1, 'At least one fee line item is required'),
});

export const feeStructureUpdateSchema = z.object({
    name: z.string().min(3).max(120).optional(),
    academicYearId: z.string().uuid().optional(),
    classroomId: z.string().uuid().optional().nullable(),
    quota: z.enum(['GENERAL', 'STAFF_CHILD', 'SCHOLARSHIP', 'SIBLING_DISCOUNT', 'RTE', 'OTHER']).optional(),
    frequency: z.enum(['MONTHLY', 'QUARTERLY', 'TERMLY', 'HALF_YEARLY', 'ANNUALLY', 'ONE_TIME']).optional(),
    dueDayOfMonth: z.number().int().min(1).max(31).optional(),
    lateFineAmount: z.number().min(0).optional(),
    lateFineGraceDays: z.number().int().min(0).max(60).optional(),
    isActive: z.boolean().optional(),
    items: z.array(feeStructureItemSchema).min(1).optional(),
});

export const singleInvoiceItemInputSchema = z.object({
    feeHeadId: z.string().uuid('Invalid Fee Head UUID'),
    title: z.string().min(1).max(100),
    amount: z.number().min(0),
    discountAmount: z.number().min(0).default(0),
    notes: z.string().max(255).optional().nullable(),
});

export const singleInvoiceSchema = z.object({
    studentId: z.string().uuid('Invalid Student UUID'),
    academicYearId: z.string().uuid('Invalid Academic Year UUID'),
    feeStructureId: z.string().uuid('Invalid Fee Structure UUID').optional().nullable(),
    title: z.string().min(3, 'Title is required').max(150),
    description: z.string().max(500).optional().nullable(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD'),
    discountAmount: z.number().min(0).default(0),
    fineAmount: z.number().min(0).default(0),
    notes: z.string().max(500).optional().nullable(),
    items: z.array(singleInvoiceItemInputSchema).min(1, 'At least one invoice line item is required'),
});

export const bulkClassInvoiceSchema = z.object({
    classroomId: z.string().uuid('Invalid Classroom UUID'),
    academicYearId: z.string().uuid('Invalid Academic Year UUID'),
    feeStructureId: z.string().uuid('Invalid Fee Structure UUID'),
    title: z.string().min(3, 'Title is required').max(150),
    description: z.string().max(500).optional().nullable(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD'),
    notes: z.string().max(500).optional().nullable(),
});

export const collectPaymentSchema = z.object({
    invoiceId: z.string().uuid('Invalid Invoice UUID'),
    amount: z.number().positive('Payment amount must be greater than 0'),
    paymentMode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'DEMAND_DRAFT', 'OTHER']),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be YYYY-MM-DD').optional(),
    transactionReference: z.string().max(100).optional().nullable(),
    chequeNumber: z.string().max(50).optional().nullable(),
    chequeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Cheque date must be YYYY-MM-DD').optional().nullable(),
    bankName: z.string().max(100).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
});

