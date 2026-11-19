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
    amount: z.number().min(0, 'Amount must be >= 0').default(0),
    frequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL', 'TERM', 'ONE_TIME']).default('MONTHLY'),
    isEnabled: z.boolean().default(true),
});

export const feeStructureDiscountSchema = z.object({
    quota: z.enum(['GENERAL', 'STAFF_CHILD', 'SCHOLARSHIP_HALF', 'SCHOLARSHIP_FULL', 'SIBLING_DISCOUNT', 'RTE', 'OTHER']),
    discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).default('PERCENTAGE'),
    discountValue: z.number().min(0, 'Discount must be >= 0'),
    scope: z.enum(['ALL_HEADS', 'SPECIFIC_HEADS']).default('ALL_HEADS'),
    applicableFeeHeadIds: z.array(z.string().uuid()).optional().default([]),
}).superRefine((data, ctx) => {
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Percentage discount cannot exceed 100%',
            path: ['discountValue'],
        });
    }
});

export const feeStructureSchema = z.object({
    name: z.string().min(3, 'Structure name must be at least 3 characters').max(120),
    academicYearId: z.string().uuid('Invalid Academic Year UUID'),
    academicClassId: z.string().uuid('Invalid Academic Class UUID'),
    activeFrequencies: z.array(z.string()).min(1, 'Select at least one billing frequency').default(['MONTHLY', 'QUARTERLY', 'ANNUAL']),
    dueDayOfMonth: z.number().int().min(1).max(31).default(10),
    lateFinePerDay: z.number().min(0).default(0),
    minimumPaymentAmount: z.number().min(0).default(0),
    allowBelowMinimum: z.boolean().default(true),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    items: z.array(feeStructureItemSchema).min(1, 'Fee items are required'),
    discounts: z.array(feeStructureDiscountSchema).optional().default([]),
});

export const feeStructureUpdateSchema = z.object({
    name: z.string().min(3).max(120).optional(),
    academicYearId: z.string().uuid().optional(),
    academicClassId: z.string().uuid().optional(),
    activeFrequencies: z.array(z.string()).min(1).optional(),
    dueDayOfMonth: z.number().int().min(1).max(31).optional(),
    lateFinePerDay: z.number().min(0).optional(),
    minimumPaymentAmount: z.number().min(0).optional(),
    allowBelowMinimum: z.boolean().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    items: z.array(feeStructureItemSchema).optional(),
    discounts: z.array(feeStructureDiscountSchema).optional(),
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

export const bulkClassInvoicePreviewSchema = z.object({
    classroomId: z.string().uuid('Invalid Classroom UUID'),
    academicYearId: z.string().uuid('Invalid Academic Year UUID'),
    feeStructureId: z.string().uuid('Invalid Fee Structure UUID'),
    frequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL', 'TERM', 'ONE_TIME']).default('MONTHLY'),
    periodLabel: z.string().min(2).max(50).optional(),
});

export const bulkClassInvoiceSchema = z.object({
    classroomId: z.string().uuid('Invalid Classroom UUID'),
    academicYearId: z.string().uuid('Invalid Academic Year UUID'),
    feeStructureId: z.string().uuid('Invalid Fee Structure UUID'),
    frequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL', 'TERM', 'ONE_TIME']).default('MONTHLY'),
    periodLabel: z.string().min(2).max(50).optional(),
    title: z.string().min(3, 'Title is required').max(150),
    description: z.string().max(500).optional().nullable(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD'),
    notes: z.string().max(500).optional().nullable(),
    selectedStudentIds: z.array(z.string().uuid()).optional(),
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
    // Extended mode-specific fields
    upiId: z.string().max(100).optional().nullable(),
    payerName: z.string().max(100).optional().nullable(),
    cardRef: z.string().max(50).optional().nullable(),
    cardLast4: z.string().max(4).optional().nullable(),
    authCode: z.string().max(50).optional().nullable(),
    transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Transfer date must be YYYY-MM-DD').optional().nullable(),
    chequeStatus: z.string().max(50).optional().nullable(),
    paymentDetails: z.record(z.any()).optional().nullable(),
    // Below minimum amount policy fields
    isBelowMinimum: z.boolean().optional(),
    belowMinimumReasonCode: z.enum([
        'FINANCIAL_HARDSHIP',
        'MANAGEMENT_APPROVAL',
        'STAFF_CONCESSION',
        'SYSTEM_ADJUSTMENT',
        'OTHER',
    ]).optional().nullable(),
    belowMinimumReasonText: z.string().max(500).optional().nullable(),
    allocationStrategy: z.enum(['SELECTED_INVOICE', 'FIFO_AUTO']).optional().default('SELECTED_INVOICE'),
    studentId: z.string().uuid().optional(),
});

export const bulkFeeReminderSchema = z.object({
    studentIds: z.array(z.string().uuid('Invalid Student UUID')).min(1, 'Please select at least one student'),
    periodKey: z.string().max(50).optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD').optional(),
    customNote: z.string().max(500).optional().nullable(),
});

export const feeReminderSettingsSchema = z.object({
    enabled: z.boolean().optional().default(false),
    daysBeforeDue: z.array(z.number().int().nonnegative()).optional().default([7, 3, 1]),
    remindBeforeExam: z.boolean().optional().default(false),
    maxRemindersPerDay: z.number().int().positive().optional().default(1),
});



