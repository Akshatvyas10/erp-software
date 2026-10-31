
import { z } from 'zod';
import db from '../models/index.js';
import logger from '../utils/logger.js';

const { Homework, HomeworkSubmission, ClassroomStudent, ClassroomSubject, Student, Teacher, Subject, Classroom, User, ClassroomRemark, sequelize } = db;

const homeworkSchema = z.object({
    title: z.string().min(1, 'Title is required').max(150, 'Title cannot exceed 150 characters'),
    description: z.string().optional().nullable().transform(v => v || ''),
    dueDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
    subjectId: z.string().uuid('Please select a valid subject'),
    classId: z.string().uuid('Please select a valid classroom').optional(),
    classroomId: z.string().uuid('Please select a valid classroom').optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED')
}).refine(data => !!(data.classId || data.classroomId), {
    message: 'Classroom ID is required',
    path: ['classId']
});

const submissionUpdateSchema = z.object({
    grade: z.string().max(50).optional(),
    feedback: z.string().optional(),
    remark: z.string().optional(),
    status: z.enum(['PENDING', 'SUBMITTED', 'REVIEWED', 'OVERDUE', 'COMPLETED', 'NOT_COMPLETED'])
});

export const getHomeworks = async (req, res) => {
    try {
        const { subjectId, classId, status } = req.query;
        const where = {};

        if (subjectId) where.subjectId = subjectId;
        if (classId) where.classroomId = classId;
        if (status) where.status = status;

        const isStudent = req.userRoles?.some(r => r.toUpperCase() === 'STUDENT');
        const isTeacher = req.userRoles?.some(r => r.toUpperCase() === 'TEACHER');
        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN');

        if (isStudent) {
            const student = await Student.findOne({ where: { userId: req.user.id } });
            if (student) {
                // Student only sees published homework for their enrolled classes
                const enrollments = await ClassroomStudent.findAll({
                    where: { studentId: student.id },
                    attributes: ['classroomId']
                });
                const enrolledClassIds = enrollments.map(e => e.classroomId);

                where.classroomId = enrolledClassIds;
                where.status = 'PUBLISHED';
            }
        } else if (isTeacher && !isAdmin) {
            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (teacher) {
                // Teacher only sees their own assigned homework
                where.teacherId = teacher.id;
            }
        }

        const homeworks = await Homework.findAll({
            where,
            include: [
                { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
                { model: Classroom, as: 'classroom', attributes: ['id', 'name', 'section'] },
                {
                    model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        const formatted = homeworks.map(h => {
            const json = h.toJSON();
            // We use createdBy for the assigned by display.
            if (json.createdBy) {
                json.teacher = {
                    firstName: json.createdBy.firstName,
                    lastName: json.createdBy.lastName
                };
                delete json.createdBy;
            }
            return json;
        });

        res.json(formatted);
    } catch (err) {
        logger.error('Error fetching homeworks:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getHomeworkDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const homework = await Homework.findByPk(id, {
            include: [
                { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
                { model: Classroom, as: 'classroom', attributes: ['id', 'name', 'section'] },
                {
                    model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName']
                }
            ]
        });

        if (!homework) {
            return res.status(404).json({ message: 'Homework not found' });
        }

        const json = homework.toJSON();
        const formatted = json;
        if (formatted.createdBy) {
            formatted.teacher = {
                firstName: formatted.createdBy.firstName,
                lastName: formatted.createdBy.lastName
            };
            delete formatted.createdBy;
        }

        const isStudent = req.userRoles?.some(r => r.toUpperCase() === 'STUDENT');
        const isTeacher = req.userRoles?.some(r => r.toUpperCase() === 'TEACHER');
        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN');

        if (isTeacher && !isAdmin) {
            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (!teacher) return res.status(403).json({ message: 'Access denied' });
            
            const classroom = await Classroom.findByPk(homework.classroomId);
            const subject = await ClassroomSubject.findOne({ where: { classroomId: homework.classroomId, subjectId: homework.subjectId } });
            
            if (classroom?.classTeacherId !== teacher.id && (!subject || subject.teacherId !== teacher.id)) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        if (isStudent) {
            if (homework.status !== 'PUBLISHED') {
                return res.status(403).json({ message: 'Access denied' });
            }
            const student = await Student.findOne({ where: { userId: req.user.id } });
            if (!student) return res.status(403).json({ message: 'Student profile missing' });

            // Check enrollment
            const enrollment = await ClassroomStudent.findOne({
                where: { studentId: student.id, classroomId: homework.classroomId }
            });
            if (!enrollment) {
                return res.status(403).json({ message: 'Not enrolled in this classroom' });
            }

            // Include student's own submission
            const submission = await HomeworkSubmission.findOne({
                where: { homeworkId: id, studentId: student.id }
            });
            return res.json({ homework: json, submission });
        }

        res.json({ homework: json });
    } catch (err) {
        logger.error('Error fetching homework details:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createHomework = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const payload = homeworkSchema.parse(req.body);
        const targetClassId = payload.classId || payload.classroomId;

        const isTeacher = req.userRoles?.some(r => r.toUpperCase() === 'TEACHER');
        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN' || r.toUpperCase() === 'PRINCIPAL');
        if (!isTeacher && !isAdmin) {
            await t.rollback();
            return res.status(403).json({ message: 'Only teachers or administrators can create homework' });
        }

        let teacherId = null;
        if (isTeacher) {
            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (teacher) teacherId = teacher.id;
        }

        if (!teacherId && isAdmin) {
            // First check if a subject teacher is assigned for this classroom
            const subject = await ClassroomSubject.findOne({ where: { classroomId: targetClassId, subjectId: payload.subjectId }, transaction: t });
            if (subject && subject.teacherId) {
                teacherId = subject.teacherId;
            } else {
                const classroom = await Classroom.findByPk(targetClassId, { transaction: t });
                if (classroom && classroom.classTeacherId) {
                    teacherId = classroom.classTeacherId;
                } else {
                    // Fallback to any teacher record if available, or first teacher
                    const anyTeacher = await Teacher.findOne({ transaction: t });
                    if (anyTeacher) teacherId = anyTeacher.id;
                }
            }
        }

        if (isTeacher && !isAdmin) {
            if (!teacherId) {
                await t.rollback();
                return res.status(403).json({ message: 'Teacher profile not found for current user' });
            }
            const classroom = await Classroom.findByPk(targetClassId, { transaction: t });
            const subject = await ClassroomSubject.findOne({ where: { classroomId: targetClassId, subjectId: payload.subjectId }, transaction: t });
            
            if (classroom?.classTeacherId !== teacherId && (!subject || subject.teacherId !== teacherId)) {
                await t.rollback();
                return res.status(403).json({ message: 'You are not authorized to assign homework for this subject' });
            }
        }

        const homework = await Homework.create({
            title: payload.title,
            description: payload.description || '',
            dueDate: payload.dueDate,
            subjectId: payload.subjectId,
            classroomId: targetClassId,
            status: payload.status,
            teacherId: teacherId,
            createdById: req.user.id
        }, { transaction: t });

        // If published immediately, explicitly create submissions for all enrolled students
        if (payload.status === 'PUBLISHED') {
            const enrollments = await ClassroomStudent.findAll({
                where: { classroomId: targetClassId },
                transaction: t
            });

            if (enrollments.length > 0) {
                const submissions = enrollments.map(e => ({
                    homeworkId: homework.id,
                    studentId: e.studentId,
                    status: 'PENDING'
                }));
                await HomeworkSubmission.bulkCreate(submissions, { transaction: t });
            }
        }

        await t.commit();
        res.status(201).json(homework);
    } catch (err) {
        await t.rollback();
        if (err instanceof z.ZodError) {
            const firstError = err.errors[0]?.message || 'Validation failed';
            return res.status(400).json({ message: firstError, errors: err.errors });
        }
        logger.error('Error creating homework:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateHomework = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const payload = homeworkSchema.parse(req.body);
        const targetClassId = payload.classId || payload.classroomId;

        const homework = await Homework.findByPk(id, { transaction: t });
        if (!homework) {
            await t.rollback();
            return res.status(404).json({ message: 'Homework not found' });
        }

        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN' || r.toUpperCase() === 'PRINCIPAL');
        const isTeacher = req.userRoles?.some(r => r.toUpperCase() === 'TEACHER');
        let teacherId = null;
        if (isTeacher) {
            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (teacher) teacherId = teacher.id;
        }

        if (!isAdmin && isTeacher) {
            const classroom = await Classroom.findByPk(homework.classroomId, { transaction: t });
            const subject = await ClassroomSubject.findOne({ where: { classroomId: homework.classroomId, subjectId: homework.subjectId }, transaction: t });
            
            if (classroom?.classTeacherId !== teacherId && (!subject || subject.teacherId !== teacherId)) {
                await t.rollback();
                return res.status(403).json({ message: 'You can only edit homework for your assigned subjects or classes' });
            }
        }

        const previousStatus = homework.status;
        const previousClassId = homework.classroomId;

        await homework.update({
            title: payload.title,
            description: payload.description || '',
            dueDate: payload.dueDate,
            subjectId: payload.subjectId,
            classroomId: targetClassId,
            status: payload.status
        }, { transaction: t });

        // If transitioned to PUBLISHED, or if class changed while PUBLISHED
        if ((previousStatus !== 'PUBLISHED' && payload.status === 'PUBLISHED') ||
            (payload.status === 'PUBLISHED' && previousClassId !== targetClassId)) {

            // Re-sync submissions for the new class (simple approach: create missing ones)
            const enrollments = await ClassroomStudent.findAll({
                where: { classroomId: targetClassId },
                transaction: t
            });

            for (const e of enrollments) {
                await HomeworkSubmission.findOrCreate({
                    where: { homeworkId: homework.id, studentId: e.studentId },
                    defaults: { status: 'PENDING' },
                    transaction: t
                });
            }
        }

        await t.commit();
        res.json(homework);
    } catch (err) {
        await t.rollback();
        if (err instanceof z.ZodError) {
            const firstError = err.errors[0]?.message || 'Validation failed';
            return res.status(400).json({ message: firstError, errors: err.errors });
        }
        logger.error('Error updating homework:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteHomework = async (req, res) => {
    try {
        const { id } = req.params;
        const homework = await Homework.findByPk(id);

        if (!homework) {
            return res.status(404).json({ message: 'Homework not found' });
        }

        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN');
        let teacherId = null;
        const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
        if (teacher) teacherId = teacher.id;
        const isTeacher = req.userRoles?.some(r => r.toUpperCase() === 'TEACHER');

        if (!isAdmin && isTeacher) {
            const classroom = await Classroom.findByPk(homework.classroomId);
            const subject = await ClassroomSubject.findOne({ where: { classroomId: homework.classroomId, subjectId: homework.subjectId } });
            
            if (classroom?.classTeacherId !== teacherId && (!subject || subject.teacherId !== teacherId)) {
                return res.status(403).json({ message: 'You can only delete homework for your assigned subjects or classes' });
            }
        }

        await homework.destroy();
        res.status(204).send();
    } catch (err) {
        logger.error('Error deleting homework:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getHomeworkSubmissions = async (req, res) => {
    try {
        const { id } = req.params;
        const homework = await Homework.findByPk(id);

        if (!homework) {
            return res.status(404).json({ message: 'Homework not found' });
        }

        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN');
        let teacherId = null;
        const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
        if (teacher) teacherId = teacher.id;
        const isTeacher = req.userRoles?.some(r => r.toUpperCase() === 'TEACHER');

        if (!isAdmin && isTeacher) {
            const classroom = await Classroom.findByPk(homework.classroomId);
            const subject = await ClassroomSubject.findOne({ where: { classroomId: homework.classroomId, subjectId: homework.subjectId } });
            
            if (classroom?.classTeacherId !== teacherId && (!subject || subject.teacherId !== teacherId)) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        const submissions = await HomeworkSubmission.findAll({
            where: { homeworkId: id },
            include: [
                {
                    model: Student,
                    as: 'student',
                    attributes: ['id', 'admissionNumber'],
                    include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName'] }]
                }
            ]
        });

        const formattedSubmissions = submissions.map(s => {
            const json = s.toJSON();
            if (json.student && json.student.account) {
                json.student.firstName = json.student.account.firstName;
                json.student.lastName = json.student.account.lastName;
                delete json.student.account;
            }
            return json;
        });

        res.json(formattedSubmissions);
    } catch (err) {
        logger.error('Error fetching submissions:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateSubmission = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const payload = submissionUpdateSchema.parse(req.body);

        const submission = await HomeworkSubmission.findByPk(id, {
            include: [{ model: Homework, as: 'homework' }],
            transaction: t
        });

        if (!submission) {
            await t.rollback();
            return res.status(404).json({ message: 'Submission not found' });
        }

        const isStudent = req.userRoles?.some(r => r.toUpperCase() === 'STUDENT');
        let studentId = null;
        if (isStudent) {
            const student = await Student.findOne({ where: { userId: req.user.id }, transaction: t });
            if (student) studentId = student.id;
        }

        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN' || r.toUpperCase() === 'PRINCIPAL');
        let teacherId = null;
        let teacherRecord = null;
        const isTeacher = req.userRoles?.some(r => r.toUpperCase() === 'TEACHER');
        if (isTeacher) {
            teacherRecord = await Teacher.findOne({
                where: { userId: req.user.id },
                include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName'] }],
                transaction: t
            });
            if (teacherRecord) teacherId = teacherRecord.id;
        }

        if (isStudent) {
            if (submission.studentId !== studentId) {
                await t.rollback();
                return res.status(403).json({ message: 'Access denied' });
            }
            // Student can only change status to SUBMITTED
            if (payload.status === 'SUBMITTED') {
                submission.status = 'SUBMITTED';
                submission.submittedAt = new Date();
            } else {
                await t.rollback();
                return res.status(400).json({ message: 'Students can only submit homework' });
            }
        } else if (isAdmin) {
            // Admin can review or mark COMPLETED / NOT_COMPLETED
            submission.status = payload.status;
            if (payload.grade !== undefined) submission.grade = payload.grade;
            if (payload.feedback !== undefined) submission.feedback = payload.feedback;
        } else if (teacherId) {
            const classroom = await Classroom.findByPk(submission.homework.classroomId, { transaction: t });
            const subject = await ClassroomSubject.findOne({ where: { classroomId: submission.homework.classroomId, subjectId: submission.homework.subjectId }, transaction: t });
            
            if (classroom?.classTeacherId !== teacherId && (!subject || subject.teacherId !== teacherId)) {
                await t.rollback();
                return res.status(403).json({ message: 'Access denied' });
            }
            
            submission.status = payload.status;
            if (payload.grade !== undefined) submission.grade = payload.grade;
            if (payload.feedback !== undefined) submission.feedback = payload.feedback;
        } else {
            await t.rollback();
            return res.status(403).json({ message: 'Access denied' });
        }

        // When marking NOT_COMPLETED, a remark is required and logged into ClassroomRemark
        if (payload.status === 'NOT_COMPLETED') {
            const remarkText = payload.remark || payload.feedback;
            if (!remarkText || !remarkText.trim()) {
                await t.rollback();
                return res.status(400).json({ message: 'A remark is required when marking homework as not completed' });
            }

            const teacherName = teacherRecord?.account
                ? `${teacherRecord.account.firstName} ${teacherRecord.account.lastName}`.trim()
                : `${req.user.firstName || 'Teacher'} ${req.user.lastName || ''}`.trim();

            await ClassroomRemark.create({
                classroomId: submission.homework.classroomId,
                studentId: submission.studentId,
                teacherId: teacherId || null,
                createdById: req.user.id,
                teacherName,
                type: 'Homework',
                remark: remarkText.trim(),
                homeworkId: submission.homeworkId
            }, { transaction: t });

            // Store in submission feedback as well so it's always accessible
            submission.feedback = remarkText.trim();
        }

        await submission.save({ transaction: t });
        await t.commit();
        res.json(submission);
    } catch (err) {
        await t.rollback();
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0]?.message || 'Validation failed', errors: err.errors });
        }
        logger.error('Error updating submission:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
