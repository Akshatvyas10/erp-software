import { z } from 'zod';

const baseEventSchema = z.object({
    title: z.string().min(3).max(150),
    description: z.string().optional(),
    type: z.enum([
        'ACADEMIC', 'EXAM', 'ASSESSMENT', 'EVENT', 'HOLIDAY',
        'SPORTS', 'CULTURAL', 'FESTIVAL', 'PARENT_MEETING',
        'STAFF_MEETING', 'TEACHER_TRAINING', 'ADMISSION',
        'FEE', 'DEADLINE', 'RESULT', 'MILESTONE', 'OTHER'
    ]),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    dayType: z.enum(['FULL_DAY', 'HALF_DAY', 'HOLIDAY', 'SPECIAL']).optional().default('FULL_DAY'),
    location: z.string().max(255).optional().nullable(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).optional().default('DRAFT'),
    targetAudience: z.enum(['ALL', 'STAFF', 'STUDENTS', 'CLASS']).optional().default('ALL'),
    targetClassId: z.string().uuid().optional().nullable(),
});

export const createEventSchema = baseEventSchema.refine(
    data => new Date(data.startDate) <= new Date(data.endDate), {
        message: "End date must be after start date",
        path: ["endDate"]
    }
);

export const updateEventSchema = baseEventSchema.partial();

export const bulkGenerateHolidaysSchema = z.object({
    sessionStartDate: z.string().datetime(),
    sessionEndDate: z.string().datetime(),
    saturdayRule: z.enum(['NONE', 'ALL', 'SECOND_FOURTH', 'HALF_DAY']).default('NONE'),
    sundayRule: z.enum(['NONE', 'ALL']).default('ALL'),
}).refine(
    data => new Date(data.sessionStartDate) < new Date(data.sessionEndDate), {
        message: "Session end date must be after start date",
        path: ["sessionEndDate"]
    }
);
