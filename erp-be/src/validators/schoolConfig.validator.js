import { z } from 'zod';

export const updateSchoolConfigSchema = z.object({
    schoolName: z.string().min(2, 'School name is required'),
    tagline: z.string().optional(),
    primaryPhone: z.string().optional(),
    secondaryPhone: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
    boardType: z.enum(['CBSE', 'ICSE', 'IB', 'STATE_BOARD', 'OTHER']).optional(),
    affiliationNumber: z.string().optional(),
    schoolCode: z.string().optional(),
    taxId: z.string().optional(),
    currencySymbol: z.string().default('₹'),
    timezone: z.string().default('Asia/Kolkata'),
    owners: z.string().optional().transform(val => val ? JSON.parse(val) : []), // Sent as JSON string in form-data
    bankDetails: z.string().optional().transform(val => val ? JSON.parse(val) : {}),
});
