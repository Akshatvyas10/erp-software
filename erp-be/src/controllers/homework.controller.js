
import { z } from 'zod';
import db from '../models/index.js';
import logger from '../utils/logger.js';

const { Homework, HomeworkSubmission, ClassroomStudent, Student, Teacher, Subject, Classroom, User, sequelize } = db;

const homeworkSchema = z.object({
    title: z.string().min(3).max(150),
    description: z.string().min(10),
    dueDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
    subjectId: z.string().uuid(),
    classId: z.string().uuid(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
});

const submissionUpdateSchema = z.object({
    grade: z.string().max(50).optional(),
    feedback: z.string().optional(),
    status: z.enum(['PENDING', 'SUBMITTED', 'REVIEWED', 'OVERDUE'])
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
                    model: Teacher, as: 'teacher', attributes: ['id'],
                    include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName'] }]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        const formatted = homeworks.map(h => {
            const json = h.toJSON();
            if (json.teacher && json.teacher.account) {
                json.teacher.firstName = json.teacher.account.firstName;
                json.teacher.lastName = json.teacher.account.lastName;
                delete json.teacher.account;
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
                    model: Teacher, as: 'teacher', attributes: ['id'],
                    include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName'] }]
                }
            ]
        });

        if (!homework) {
            return res.status(404).json({ message: 'Homework not found' });
        }

        const json = homework.toJSON();
        if (json.teacher && json.teacher.account) {
            json.teacher.firstName = json.teacher.account.firstName;
            json.teacher.lastName = json.teacher.account.lastName;
            delete json.teacher.account;
        }

        const isStudent = req.userRoles?.some(r => r.toUpperCase() === 'STUDENT');
        const isTeacher = req.userRoles?.some(r => r.toUpperCase() === 'TEACHER');
        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN');

        if (isTeacher && !isAdmin) {
            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (teacher && homework.teacherId !== teacher.id) {
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

        const isTeacher = req.userRoles?.some(r => r.toUpperCase() === 'TEACHER');
        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN');
        if (!isTeacher && !isAdmin) {
            return res.status(403).json({ message: 'Only teachers or admins can create homework' });
        }

        let teacherId = null;
        if (isTeacher) {
            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (!teacher) return res.status(400).json({ message: 'Teacher profile missing' });
            teacherId = teacher.id;
        }

        if (!teacherId && !isAdmin) {
            return res.status(400).json({ message: 'A valid teacher profile is required to assign homework' });
        }

        const homework = await Homework.create({
            title: payload.title,
            description: payload.description,
            dueDate: payload.dueDate,
            subjectId: payload.subjectId,
            classroomId: payload.classId,
            status: payload.status,
            teacherId: teacherId
        }, { transaction: t });

        // If published immediately, explicitly create submissions for all enrolled students
        if (payload.status === 'PUBLISHED') {
            const enrollments = await ClassroomStudent.findAll({
                where: { classroomId: payload.classId },
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
            return res.status(400).json({ message: 'Validation failed', errors: err.errors });
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

        const homework = await Homework.findByPk(id, { transaction: t });
        if (!homework) {
            await t.rollback();
            return res.status(404).json({ message: 'Homework not found' });
        }

        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN');
        let teacherId = null;
        const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
        if (teacher) teacherId = teacher.id;

        if (!isAdmin && homework.teacherId !== teacherId) {
            await t.rollback();
            return res.status(403).json({ message: 'You can only edit your own homework' });
        }

        const previousStatus = homework.status;
        const previousClassId = homework.classroomId;

        await homework.update({
            title: payload.title,
            description: payload.description,
            dueDate: payload.dueDate,
            subjectId: payload.subjectId,
            classroomId: payload.classId,
            status: payload.status
        }, { transaction: t });

        // If transitioned to PUBLISHED, or if class changed while PUBLISHED
        if ((previousStatus !== 'PUBLISHED' && payload.status === 'PUBLISHED') ||
            (payload.status === 'PUBLISHED' && previousClassId !== payload.classId)) {

            // Re-sync submissions for the new class (simple approach: create missing ones)
            const enrollments = await ClassroomStudent.findAll({
                where: { classroomId: payload.classId },
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
            return res.status(400).json({ message: 'Validation failed', errors: err.errors });
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

        if (!isAdmin && homework.teacherId !== teacherId) {
            return res.status(403).json({ message: 'You can only delete your own homework' });
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

        if (!isAdmin && homework.teacherId !== teacherId) {
            return res.status(403).json({ message: 'Access denied' });
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
    try {
        const { id } = req.params;
        const payload = submissionUpdateSchema.parse(req.body);

        const submission = await HomeworkSubmission.findByPk(id, {
            include: [{ model: Homework, as: 'homework' }]
        });

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        const isStudent = req.userRoles?.some(r => r.toUpperCase() === 'STUDENT');
        let studentId = null;
        if (isStudent) {
            const student = await Student.findOne({ where: { userId: req.user.id } });
            if (student) studentId = student.id;
        }

        const isAdmin = req.userRoles?.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN');
        let teacherId = null;
        const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
        if (teacher) teacherId = teacher.id;

        if (isStudent) {
            if (submission.studentId !== studentId) {
                return res.status(403).json({ message: 'Access denied' });
            }
            // Student can only change status to SUBMITTED
            if (payload.status === 'SUBMITTED') {
                submission.status = 'SUBMITTED';
                submission.submittedAt = new Date();
            } else {
                return res.status(400).json({ message: 'Students can only submit homework' });
            }
        } else if (isAdmin || submission.homework.teacherId === teacherId) {
            // Teacher/Admin can review
            submission.status = payload.status;
            if (payload.grade !== undefined) submission.grade = payload.grade;
            if (payload.feedback !== undefined) submission.feedback = payload.feedback;
        } else {
            return res.status(403).json({ message: 'Access denied' });
        }

        await submission.save();
        res.json(submission);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: err.errors });
        }
        logger.error('Error updating submission:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
