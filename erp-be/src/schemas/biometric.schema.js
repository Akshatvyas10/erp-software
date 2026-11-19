import { z } from 'zod';

export const biometricEntrySchema = z.object({
    deviceId: z.string().trim().min(1, 'deviceId is required').max(100),
    employeeCode: z.string().trim().min(1, 'employeeCode is required').max(50),
    timestamp: z.string().datetime({ message: 'timestamp must be a valid ISO 8601 string' }).or(
        z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, 'Invalid timestamp format')
    ),
    type: z.enum(['in', 'out'], { errorMap: () => ({ message: "type must be 'in' or 'out'" }) }),
    nonce: z.string().optional(),
    signature: z.string().optional(),
});

