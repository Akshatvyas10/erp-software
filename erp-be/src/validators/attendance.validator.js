import { z } from 'zod';

export const attendanceSchema = z.object({
    classroomId: z.string().uuid("Invalid classroom ID"),
    academicYearId: z.string().min(1, "Academic year is required"),
    date: z.string()
        .refine((val) => !isNaN(Date.parse(val)), "Invalid date")
        .refine((val) => {
            const dateStr = val.split('T')[0] || val;
            const inputDate = new Date(dateStr);
            inputDate.setHours(0, 0, 0, 0);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            return inputDate <= today;
        }, "Cannot mark attendance for future dates"),
    records: z.array(z.object({
        studentId: z.string().uuid("Invalid student ID"),
        subjectId: z.string().uuid().optional().nullable(),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE']),
        remarks: z.string().max(255).optional().nullable()
    })).min(1, "At least one attendance record is required")
});

export const attendanceUpdateSchema = z.object({
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE']),
    remarks: z.string().max(255).optional().nullable()
});

export const validateAttendance = (req, res, next) => {
    try {
        attendanceSchema.parse(req.body);
        next();
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: err.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        });
    }
};

export const validateAttendanceUpdate = (req, res, next) => {
    try {
        attendanceUpdateSchema.parse(req.body);
        next();
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: err.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        });
    }
};
