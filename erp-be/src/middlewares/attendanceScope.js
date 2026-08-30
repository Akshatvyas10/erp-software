import db from '../models/index.js';
import logger from '../utils/logger.js';
const { Classroom, ClassroomSubject, Teacher } = db;

/**
 * Middleware to enforce Level 2 (Classroom Scope) Authorization for Attendance.
 * Checks if the logged-in user is explicitly allowed to access/modify attendance for `classroomId`.
 */
export const enforceAttendanceScope = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const classroomId = req.params.classroomId || req.body.classroomId || req.query.classroomId;

        if (!classroomId) {
            return res.status(400).json({ success: false, message: "classroomId is required for scope verification" });
        }

        // Allow super_admin and admin roles to bypass scope checks
        const isAdmin = req.userRoles?.some(role => role === 'admin' || role === 'super_admin');
        if (isAdmin) {
            return next();
        }

        // Must be a teacher
        const teacher = await Teacher.findOne({ where: { userId } });
        if (!teacher) {
            return res.status(403).json({ success: false, message: "User is not mapped to a Teacher profile." });
        }
        
        req.user.teacherProfileId = teacher.id; // Store for controller use

        // 1. Is Class Teacher?
        const classroom = await Classroom.findOne({
            where: { id: classroomId }
        });
        
        if (!classroom) {
            return res.status(404).json({ success: false, message: "Classroom not found" });
        }

        if (classroom.classTeacherId === teacher.id) {
            return next();
        }

        // 2. Is Subject Teacher for this classroom?
        const isSubjectTeacher = await ClassroomSubject.findOne({
            where: { classroomId, teacherId: teacher.id }
        });

        if (isSubjectTeacher) {
            return next();
        }

        return res.status(403).json({ 
            success: false, 
            message: "Unauthorized: You are not assigned to this classroom." 
        });

    } catch (err) {
        logger.error('Error in enforceAttendanceScope middleware:', err);
        return res.status(500).json({ success: false, message: "Internal Server Error in scope verification" });
    }
};
