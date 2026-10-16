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

export const updateSmtpConfigSchema = z.object({
    host: z.string().min(1, 'SMTP Host is required'),
    port: z.coerce.number().int().min(1).max(65535, 'Invalid port'),
    encryption: z.enum(['NONE', 'SSL', 'TLS']),
    username: z.string().min(1, 'Username / Email is required'),
    password: z.string().optional(), // If empty, existing encrypted password is retained
    fromName: z.string().min(1, 'Sender Name is required'),
    fromEmail: z.string().email('Valid sender email is required'),
    replyTo: z.string().email('Valid reply-to email').optional().or(z.literal('')),
});

export const testEmailSchema = z.object({
    recipientEmail: z.string().email('Valid recipient email address is required'),
});

export const updateThemeSchema = z.object({
    activeTheme: z.string().min(1, 'Theme name is required'),
});

