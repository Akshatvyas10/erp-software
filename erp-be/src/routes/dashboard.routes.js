import express from 'express';
import authenticate from '../middlewares/authenticate.js';
import db from '../models/index.js';
import { success, error } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

const { Student, Teacher, User, TeacherLeave, StudentLeave } = db;

/**
 * GET /api/dashboard/stats
 * Returns live aggregated counts for the staff/admin dashboard
 */
router.get('/stats', async (req, res) => {
    try {
        const [totalStudents, totalTeachers, totalUsers, pendingTeacherLeaves, pendingStudentLeaves] = await Promise.all([
            Student.count(),
            Teacher.count(),
            User.count({ where: { status: 'ACTIVE' } }),
            TeacherLeave ? TeacherLeave.count({ where: { status: 'PENDING' } }) : 0,
            StudentLeave ? StudentLeave.count({ where: { status: 'PENDING' } }) : 0,
        ]);

        return success(res, {
            totalStudents,
            totalTeachers,
            totalUsers,
            pendingLeaves: (pendingTeacherLeaves || 0) + (pendingStudentLeaves || 0),
        }, 'Dashboard stats fetched successfully');
    } catch (err) {
        logger.error('Error fetching dashboard stats:', err);
        return error(res, 'Internal server error', 500);
    }
});

export default router;

