import db from '../models/index.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

import { isSaturday, isSunday, parseISO } from 'date-fns';

const { StudentAttendance, Classroom, ClassroomSubject, Teacher, Student, CalendarEvent, EventType } = db;

export const getMyClassrooms = async (req, res) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.Roles?.some(r => r.name === 'admin' || r.name === 'super_admin');

        if (isAdmin) {
            const allClassrooms = await Classroom.findAll();
            return res.json({ success: true, classrooms: allClassrooms });
        }

        const teacher = await Teacher.findOne({ where: { userId } });
        if (!teacher) {
            return res.status(403).json({ success: false, message: "User is not a teacher." });
        }

        // Get class teacher classrooms
        const classTeacherClassrooms = await Classroom.findAll({
            where: { classTeacherId: teacher.id }
        });

        // Get subject teacher classrooms
        const subjectAssigned = await ClassroomSubject.findAll({
            where: { teacherId: teacher.id },
            include: [{ model: Classroom, as: 'classroom' }]
        });

        const subjectClassrooms = subjectAssigned
            .filter(cs => cs.classroom)
            .map(cs => cs.classroom);

        // Merge and unique
        const map = new Map();
        classTeacherClassrooms.forEach(c => map.set(c.id, c));
        subjectClassrooms.forEach(c => map.set(c.id, c));

        return res.json({ success: true, classrooms: Array.from(map.values()) });
    } catch (err) {
        logger.error('Error in getMyClassrooms:', err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getClassroomAttendance = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, message: "date query param is required" });
        }

        const rolesLower = (req.userRoles || []).map(r => String(r).toLowerCase());
        const isPrivileged = rolesLower.some(r => ['admin', 'super_admin', 'principal'].includes(r));
        const isStudent = !isPrivileged && rolesLower.includes('student');

        const whereClause = {
            classroomId,
            attendanceDate: date
        };

        if (isStudent) {
            whereClause.studentId = req.user.studentId;
        }

        const attendance = await StudentAttendance.findAll({
            where: whereClause
        });

        return res.json({ success: true, attendance });
    } catch (err) {
        logger.error('Error in getClassroomAttendance:', err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const bulkCreateAttendance = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { classroomId, academicYearId, date, records } = req.body;
        const classroom = await Classroom.findByPk(classroomId);
        if (!classroom) {
            return res.status(404).json({ success: false, message: "Classroom not found" });
        }

        const userTeacherId = req.user.teacherProfileId || req.user.teacherId;
        const effectiveTeacherId = userTeacherId || classroom.classTeacherId || null;

        const isStandardTeacher = req.userRoles && req.userRoles.includes('TEACHER') && !req.userRoles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r));
        if (isStandardTeacher) {
            const subject = await ClassroomSubject.findOne({ where: { classroomId, teacherId: userTeacherId } });
            
            if (classroom.classTeacherId !== userTeacherId && !subject) {
                return res.status(403).json({ success: false, message: "Forbidden: You cannot take attendance for this classroom" });
            }

            // Validation: Temporal Immutability (Block edits older than 48 hours for standard teachers)
            const attendanceDateObj = parseISO(date);
            const diffInHours = Math.abs(new Date() - attendanceDateObj) / 36e5;
            if (diffInHours > 48 && !req.userRoles.includes('ADMIN_ATTENDANCE_OVERRIDE')) {
                return res.status(403).json({ success: false, message: "Forbidden: Cannot modify attendance records older than 48 hours" });
            }
        }

        // Validation 1: Prevent attendance on weekends
        const attendanceDate = parseISO(date);
        if (isSaturday(attendanceDate) || isSunday(attendanceDate)) {
            return res.status(400).json({ success: false, message: "Cannot take attendance on weekends (Saturday/Sunday)." });
        }

        // Validation 2: Prevent attendance on holidays
        const eventsOnDate = await CalendarEvent.findAll({
            where: {
                start_date: { [Op.lte]: date },
                end_date: { [Op.gte]: date },
                status: 'PUBLISHED'
            }
        });

        for (const event of eventsOnDate) {
            if (event.day_type === 'HOLIDAY') {
                return res.status(400).json({ success: false, message: `Cannot take attendance on a holiday: ${event.title}` });
            }
            
            const eventType = await EventType.findOne({ where: { code: event.type } });
            if (eventType && eventType.is_leave_day) {
                return res.status(400).json({ success: false, message: `Cannot take attendance on a holiday: ${event.title}` });
            }
        }

        const basePayload = {
            classroomId,
            academicYearId,
            attendanceDate: date,
            teacherId: effectiveTeacherId,
            createdBy: req.user.id,
            updatedBy: req.user.id
        };

        // Remove any prior records for this classroom, date and subjectId to prevent duplicate rows on edit
        const studentIds = records.map(r => r.studentId);
        await StudentAttendance.destroy({
            where: {
                classroomId,
                attendanceDate: date,
                studentId: { [Op.in]: studentIds },
                subjectId: null
            },
            transaction: t
        });

        const insertPayloads = records.map(record => ({
            ...basePayload,
            studentId: record.studentId,
            subjectId: record.subjectId || null,
            status: record.status,
            remarks: record.remarks
        }));

        await StudentAttendance.bulkCreate(insertPayloads, { transaction: t });
        await t.commit();

        return res.json({ success: true, message: "Attendance saved successfully." });
    } catch (err) {
        await t.rollback();
        logger.error('Error in bulkCreateAttendance:', err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;

        const record = await StudentAttendance.findOne({ where: { id } });
        if (!record) return res.status(404).json({ success: false, message: "Record not found" });

        await record.update({ status, remarks, updatedBy: req.user.id });

        return res.json({ success: true, message: "Attendance updated successfully.", record });
    } catch (err) {
        logger.error('Error in updateAttendance:', err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
