import { z } from 'zod';
import db from '../models/index.js';
import logger from '../utils/logger.js';

const { ClassroomRemark, Classroom, Student, Teacher, User, Homework, ClassroomStudent, ClassroomSubject } = db;

const remarkCreateSchema = z.object({
    classroomId: z.string().uuid('Valid classroom ID required'),
    studentId: z.string().uuid('Valid student ID required'),
    type: z.enum(['Homework', 'Academic', 'Behavior', 'General']).default('General'),
    remark: z.string().min(1, 'Remark text cannot be empty'),
    homeworkId: z.string().uuid().optional().nullable()
});

/**
 * GET /api/classrooms/:classroomId/remarks
 * Teachers/Admins: view remarks for classroom (optionally filtered by studentId or type)
 * Students: only view their own remarks
 */
export const getClassroomRemarks = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const { studentId, type } = req.query;

        const isStudent = req.userRoles?.some(r => r.toUpperCase() === 'STUDENT');
        const isTeacher = req.userRoles?.some(r => r.toUpperCase() === 'TEACHER');
        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN' || r.toUpperCase() === 'PRINCIPAL');

        const where = { classroomId };

        if (isStudent) {
            const student = await Student.findOne({ where: { userId: req.user.id } });
            if (!student) {
                return res.status(403).json({ message: 'Student profile not found' });
            }
            // Strict role guard: students can only ever see their own remarks
            where.studentId = student.id;
        } else if (studentId) {
            where.studentId = studentId;
        }

        if (type) {
            where.type = type;
        }

        const remarks = await ClassroomRemark.findAll({
            where,
            include: [
                {
                    model: Student,
                    as: 'student',
                    attributes: ['id', 'admissionNumber'],
                    include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName'] }]
                },
                {
                    model: Homework,
                    as: 'homework',
                    attributes: ['id', 'title']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        const formatted = remarks.map(r => {
            const json = r.toJSON();
            json.createdAt = json.created_at || json.createdAt;
            json.updatedAt = json.updated_at || json.updatedAt;
            if (json.student && json.student.account) {
                json.student.firstName = json.student.account.firstName;
                json.student.lastName = json.student.account.lastName;
            }
            return json;
        });

        res.json({
            success: true,
            data: { remarks: formatted },
            remarks: formatted
        });
    } catch (err) {
        logger.error('Error fetching classroom remarks:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * POST /api/classrooms/:classroomId/remarks
 * Teacher or Admin creates a remark for a student in this classroom
 */
export const createClassroomRemark = async (req, res) => {
    try {
        const isTeacher = req.userRoles?.some(r => r.toUpperCase() === 'TEACHER');
        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN' || r.toUpperCase() === 'PRINCIPAL');

        if (!isTeacher && !isAdmin) {
            return res.status(403).json({ message: 'Only teachers or administrators can add classroom remarks' });
        }

        const payload = remarkCreateSchema.parse({
            ...req.body,
            classroomId: req.params.classroomId || req.body.classroomId
        });

        // Verify student is enrolled in classroom
        const enrollment = await ClassroomStudent.findOne({
            where: { classroomId: payload.classroomId, studentId: payload.studentId }
        });
        if (!enrollment) {
            return res.status(400).json({ message: 'Student is not enrolled in this classroom' });
        }

        let teacherId = null;
        let teacherName = `${req.user.firstName || 'Teacher'} ${req.user.lastName || ''}`.trim();

        if (isTeacher) {
            const teacherRecord = await Teacher.findOne({
                where: { userId: req.user.id },
                include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName'] }]
            });
            if (teacherRecord) {
                teacherId = teacherRecord.id;
                if (teacherRecord.account) {
                    teacherName = `${teacherRecord.account.firstName} ${teacherRecord.account.lastName}`.trim();
                }
            }
        }

        const newRemark = await ClassroomRemark.create({
            classroomId: payload.classroomId,
            studentId: payload.studentId,
            teacherId,
            createdById: req.user.id,
            teacherName,
            type: payload.type,
            remark: payload.remark.trim(),
            homeworkId: payload.homeworkId || null
        });

        res.status(201).json({ remark: newRemark });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0]?.message || 'Validation failed', errors: err.errors });
        }
        logger.error('Error creating classroom remark:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * DELETE /api/classrooms/:classroomId/remarks/:id
 * Teacher who created the remark or Admin can delete
 */
export const deleteClassroomRemark = async (req, res) => {
    try {
        const { id } = req.params;
        const remark = await ClassroomRemark.findByPk(id);
        if (!remark) {
            return res.status(404).json({ message: 'Remark not found' });
        }

        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN' || r.toUpperCase() === 'PRINCIPAL');
        if (!isAdmin && remark.createdById !== req.user.id) {
            return res.status(403).json({ message: 'You can only delete your own remarks' });
        }

        await remark.destroy();
        res.status(204).send();
    } catch (err) {
        logger.error('Error deleting remark:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
