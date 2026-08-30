import db from '../models/index.js';
import logger from '../utils/logger.js';

const seedEventTypes = async () => {
    try {
        const types = [
            { name: 'Academic', code: 'ACADEMIC', is_leave_day: false },
            { name: 'Exam', code: 'EXAM', is_leave_day: false },
            { name: 'Assessment', code: 'ASSESSMENT', is_leave_day: false },
            { name: 'Event', code: 'EVENT', is_leave_day: false },
            { name: 'Holiday', code: 'HOLIDAY', is_leave_day: true },
            { name: 'Sports', code: 'SPORTS', is_leave_day: false },
            { name: 'Cultural', code: 'CULTURAL', is_leave_day: false },
            { name: 'Festival / National', code: 'FESTIVAL', is_leave_day: true },
            { name: 'Parent Meeting', code: 'PARENT_MEETING', is_leave_day: false },
            { name: 'Staff Meeting', code: 'STAFF_MEETING', is_leave_day: false },
            { name: 'Teacher Training', code: 'TEACHER_TRAINING', is_leave_day: false },
            { name: 'Admission', code: 'ADMISSION', is_leave_day: false },
            { name: 'Fee', code: 'FEE', is_leave_day: false },
            { name: 'Submission / Deadline', code: 'DEADLINE', is_leave_day: false },
            { name: 'Result', code: 'RESULT', is_leave_day: false },
            { name: 'Milestone', code: 'MILESTONE', is_leave_day: false },
            { name: 'Other', code: 'OTHER', is_leave_day: false },
        ];

        for (const type of types) {
            await db.EventType.findOrCreate({
                where: { code: type.code },
                defaults: type
            });
        }
        logger.info('Event Types seeded successfully.');
    } catch (err) {
        logger.error('Error seeding event types:', err);
        throw err;
    }
};

export default seedEventTypes;
