'use strict';
import { z } from 'zod';
import { Op } from 'sequelize';
import db from '../models/index.js';
import { success, error } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import { ExamScheduleAutomationService } from '../services/examScheduleAutomationService.js';

const { ExamSchedule, Exam, ExamResult, Subject, Student, User, CalendarEvent, Classroom, ClassroomSubject, sequelize } = db;

const studentAccount = {
    model: User, as: 'account',
    attributes: ['id', 'userId', 'firstName', 'lastName', 'email'],
};

// ── GET /api/exams/schedules ──────────────────────────────────────────────────
export const listSchedules = async (req, res, next) => {
    try {
        const { classroomId } = req.query;
        if (!classroomId) return error(res, 'classroomId is required', 400);

        const schedules = await ExamSchedule.findAll({
            where: { classroomId },
            include: [{
                model: Exam, as: 'exams',
                include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }]
            }],
            order: [['created_at', 'DESC']]
        });
        
        return success(res, { schedules });
    } catch (err) { next(err); }
};

// ── POST /api/exams/schedules ─────────────────────────────────────────────────
export const createSchedule = async (req, res, next) => {
    try {
        const { name, type, classroomId } = req.body;
        if (!name || !type || !classroomId) return error(res, 'Name, type, and classroomId are required', 400);

        const classroom = await Classroom.findByPk(classroomId);
        if (!classroom) return error(res, 'Classroom not found', 404);

        const isStandardTeacher = req.userRoles && req.userRoles.some(r => r.toLowerCase() === 'teacher') && !req.userRoles.some(r => ['admin', 'super_admin'].includes(r.toLowerCase()));
        if (isStandardTeacher && classroom.classTeacherId !== req.user.teacherId) {
            return error(res, 'Forbidden: Only the Class Teacher can manage exam schedules', 403);
        }

        const schedule = await ExamSchedule.create({ name, type, classroomId });
        return success(res, { schedule }, 'Exam schedule created successfully', 201);
    } catch (err) { next(err); }
};

// ── PUT /api/exams/schedules/:id ──────────────────────────────────────────────
export const updateSchedule = async (req, res, next) => {
    try {
        const schedule = await ExamSchedule.findByPk(req.params.id);
        if (!schedule) return error(res, 'Schedule not found', 404);

        const classroom = await Classroom.findByPk(schedule.classroomId);
        const isStandardTeacher = req.userRoles && req.userRoles.some(r => r.toLowerCase() === 'teacher') && !req.userRoles.some(r => ['admin', 'super_admin'].includes(r.toLowerCase()));
        if (isStandardTeacher && classroom.classTeacherId !== req.user.teacherId) {
            return error(res, 'Forbidden: Only the Class Teacher can manage exam schedules', 403);
        }

        const { name, type } = req.body;
        await schedule.update({ name, type });
        return success(res, { schedule }, 'Exam schedule updated successfully');
    } catch (err) { next(err); }
};

// ── DELETE /api/exams/schedules/:id ───────────────────────────────────────────
export const deleteSchedule = async (req, res, next) => {
    try {
        const schedule = await ExamSchedule.findByPk(req.params.id);
        if (!schedule) return error(res, 'Schedule not found', 404);

        const classroom = await Classroom.findByPk(schedule.classroomId);
        const isStandardTeacher = req.userRoles && req.userRoles.some(r => r.toLowerCase() === 'teacher') && !req.userRoles.some(r => ['admin', 'super_admin'].includes(r.toLowerCase()));
        if (isStandardTeacher && classroom.classTeacherId !== req.user.teacherId) {
            return error(res, 'Forbidden: Only the Class Teacher can manage exam schedules', 403);
        }

        await schedule.destroy();
        return success(res, null, 'Exam schedule deleted successfully');
    } catch (err) { next(err); }
};

// ── GET /api/exams/schedules/preview ──────────────────────────────────────────
export const previewAutoSchedule = async (req, res, next) => {
    try {
        const { classroomId, includeUnitTests, includeMajorExams, academicYear } = req.query;
        if (!classroomId) return error(res, 'classroomId is required', 400);

        const preview = await ExamScheduleAutomationService.previewGeneration(classroomId, {
            includeUnitTests: includeUnitTests !== 'false',
            includeMajorExams: includeMajorExams !== 'false',
            academicYear
        });

        return success(res, preview, 'Exam schedule generation preview generated successfully');
    } catch (err) { next(err); }
};

// ── POST /api/exams/schedules/auto-generate ───────────────────────────────────
export const autoGenerateSchedules = async (req, res, next) => {
    try {
        const { classroomId, includeUnitTests, includeMajorExams, overwriteDrafts, academicYear } = req.body;
        if (!classroomId) return error(res, 'classroomId is required', 400);

        const classroom = await Classroom.findByPk(classroomId);
        if (!classroom) return error(res, 'Classroom not found', 404);

        const isStandardTeacher = req.userRoles && req.userRoles.some(r => r.toLowerCase() === 'teacher') && !req.userRoles.some(r => ['admin', 'super_admin'].includes(r.toLowerCase()));
        if (isStandardTeacher && classroom.classTeacherId !== req.user.teacherId) {
            return error(res, 'Forbidden: Only the Class Teacher or Admins can generate exam schedules', 403);
        }

        const result = await ExamScheduleAutomationService.generateForClassroom(
            classroomId,
            {
                includeUnitTests: includeUnitTests !== false,
                includeMajorExams: includeMajorExams !== false,
                overwriteDrafts: overwriteDrafts !== false,
                academicYear
            },
            req.user?.id
        );

        return success(res, result, 'Exam schedules and papers auto-generated successfully', 201);
    } catch (err) { next(err); }
};

// ── POST /api/exams/schedules/:id/publish ─────────────────────────────────────
export const publishSchedule = async (req, res, next) => {
    try {
        const schedule = await ExamScheduleAutomationService.publishSchedule(req.params.id, req.user);
        return success(res, { schedule }, 'Exam schedule published successfully. Marks entry is now unlocked.');
    } catch (err) { next(err); }
};

// ── GET /api/exams ────────────────────────────────────────────────────────────
export const listExams = async (req, res, next) => {
    try {
        const { examScheduleId, classroomId, subjectId } = req.query;
        const where = {};
        if (examScheduleId) where.examScheduleId = examScheduleId;
        if (classroomId) where.classroomId = classroomId;
        if (subjectId) where.subjectId = subjectId;

        const exams = await Exam.findAll({
            where,
            include: [
                { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }
            ],
            order: [['date', 'DESC'], ['id', 'DESC']]
        });
        
        return success(res, { exams });
    } catch (err) { next(err); }
};

// ── POST /api/exams ───────────────────────────────────────────────────────────
export const createExam = async (req, res, next) => {
    try {
        const { examScheduleId, date, maxMarks, status, classroomId, subjectId } = req.body;
        if (!examScheduleId || !classroomId || !subjectId || !date) return error(res, 'examScheduleId, date, classroomId, and subjectId are required', 400);

        const classroom = await Classroom.findByPk(classroomId);
        if (!classroom) return error(res, 'Classroom not found', 404);
        
        const subject = await ClassroomSubject.findOne({ where: { subjectId, classroomId } });
        
        const isStandardTeacher = req.userRoles && req.userRoles.some(r => r.toLowerCase() === 'teacher') && !req.userRoles.some(r => ['admin', 'super_admin'].includes(r.toLowerCase()));
        if (isStandardTeacher) {
            if (classroom.classTeacherId !== req.user.teacherId) {
                return error(res, 'Forbidden: Only the Class Teacher can create exams', 403);
            }
        }

        // Check if date is a holiday
        const holidays = await CalendarEvent.findAll({
            where: {
                day_type: 'HOLIDAY',
                start_date: { [Op.lte]: date },
                end_date: { [Op.gte]: date }
            }
        });

        if (holidays.length > 0) {
            return error(res, `Cannot set exam on a holiday: ${holidays[0].title}`, 400);
        }

        const exam = await Exam.create({ examScheduleId, date, maxMarks, status, classroomId, subjectId });
        return success(res, { exam }, 'Exam created successfully', 201);
    } catch (err) { next(err); }
};

// ── PUT /api/exams/:id ────────────────────────────────────────────────────────
export const updateExam = async (req, res, next) => {
    try {
        const exam = await Exam.findByPk(req.params.id);
        if (!exam) return error(res, 'Exam not found', 404);

        const classroom = await Classroom.findByPk(exam.classroomId);
        const subject = await ClassroomSubject.findOne({ where: { subjectId: exam.subjectId, classroomId: exam.classroomId } });
        
        const isStandardTeacher = req.userRoles && req.userRoles.some(r => r.toLowerCase() === 'teacher') && !req.userRoles.some(r => ['admin', 'super_admin'].includes(r.toLowerCase()));
        if (isStandardTeacher) {
            if (classroom.classTeacherId !== req.user.teacherId) {
                return error(res, 'Forbidden: Only the Class Teacher can update this exam', 403);
            }
        }

        const { date, maxMarks, status } = req.body;
        
        if (date) {
            const holidays = await CalendarEvent.findAll({
                where: {
                    day_type: 'HOLIDAY',
                    start_date: { [Op.lte]: date },
                    end_date: { [Op.gte]: date }
                }
            });
            if (holidays.length > 0) return error(res, `Cannot set exam on a holiday: ${holidays[0].title}`, 400);
        }

        await exam.update({ date, maxMarks, status });

        return success(res, { exam }, 'Exam updated successfully');
    } catch (err) { next(err); }
};

// ── DELETE /api/exams/:id ─────────────────────────────────────────────────────
export const deleteExam = async (req, res, next) => {
    try {
        const exam = await Exam.findByPk(req.params.id);
        if (!exam) return error(res, 'Exam not found', 404);

        const classroom = await Classroom.findByPk(exam.classroomId);
        const subject = await ClassroomSubject.findOne({ where: { subjectId: exam.subjectId, classroomId: exam.classroomId } });
        
        const isStandardTeacher = req.userRoles && req.userRoles.some(r => r.toLowerCase() === 'teacher') && !req.userRoles.some(r => ['admin', 'super_admin'].includes(r.toLowerCase()));
        if (isStandardTeacher) {
            if (classroom.classTeacherId !== req.user.teacherId) {
                return error(res, 'Forbidden: Only the Class Teacher can delete this exam', 403);
            }
        }

        await exam.destroy();
        return success(res, null, 'Exam deleted successfully');
    } catch (err) { next(err); }
};

// ── GET /api/exams/:id/results ────────────────────────────────────────────────
export const getResults = async (req, res, next) => {
    try {
        const exam = await Exam.findByPk(req.params.id);
        if (!exam) return error(res, 'Exam not found', 404);

        const results = await ExamResult.findAll({
            where: { examId: exam.id },
            include: [{
                model: Student, as: 'student',
                attributes: ['id', 'studentId', 'grade', 'section'],
                include: [studentAccount]
            }]
        });

        return success(res, { results });
    } catch (err) { next(err); }
};

// ── POST /api/exams/:id/results ───────────────────────────────────────────────
export const upsertResults = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const exam = await Exam.findByPk(req.params.id);
        if (!exam) {
            await t.rollback();
            return error(res, 'Exam not found', 404);
        }

        if (exam.status === 'PUBLISHED') {
            await t.rollback();
            return error(res, 'Cannot edit marks for a published exam.', 403);
        }

        const classroom = await Classroom.findByPk(exam.classroomId);
        const subject = await ClassroomSubject.findOne({ where: { subjectId: exam.subjectId, classroomId: exam.classroomId } });
        
        const isStandardTeacher = req.userRoles && req.userRoles.some(r => r.toLowerCase() === 'teacher') && !req.userRoles.some(r => ['admin', 'super_admin'].includes(r.toLowerCase()));
        if (isStandardTeacher) {
            if (classroom.classTeacherId !== req.user.teacherId && (!subject || subject.teacherId !== req.user.teacherId)) {
                await t.rollback();
                return error(res, 'Forbidden: Only the Class Teacher or Subject Teacher can enter marks for this exam', 403);
            }
        }

        const { results } = req.body; // Array of { studentId, marksObtained, isAbsent, remarks }
        if (!Array.isArray(results)) {
            await t.rollback();
            return error(res, 'results must be an array', 400);
        }

        // Validate max marks before processing
        for (const r of results) {
            const isAbsent = r.isAbsent === true;
            let marksObtained = isAbsent ? 0 : parseFloat(r.marksObtained);
            if (!isNaN(marksObtained) && marksObtained !== null && marksObtained > exam.maxMarks) {
                await t.rollback();
                return error(res, `Marks entered (${marksObtained}) cannot exceed max marks (${exam.maxMarks}).`, 400);
            }
        }

        const upsertPromises = results.map(async r => {
            const isAbsent = r.isAbsent === true;
            let marksObtained = isAbsent ? 0 : parseFloat(r.marksObtained);
            if (isNaN(marksObtained)) marksObtained = null;
            
            let percentage = null;
            let grade = null;
            let status = null;

            if (marksObtained !== null && exam.maxMarks > 0) {
                percentage = parseFloat(((marksObtained / exam.maxMarks) * 100).toFixed(2));
                
                // Pass/Fail Logic (33% threshold)
                status = percentage >= 33 ? 'PASSED' : 'FAILED';
                
                // Grade Mapping
                if (percentage >= 90) grade = 'A+';
                else if (percentage >= 80) grade = 'A';
                else if (percentage >= 70) grade = 'B';
                else if (percentage >= 60) grade = 'C';
                else if (percentage >= 33) grade = 'D';
                else grade = 'F';
            }

            if (isAbsent) {
                status = 'FAILED';
                grade = 'F';
            }

            const payload = {
                marksObtained,
                isAbsent,
                percentage,
                grade,
                status,
                remarks: r.remarks || null
            };

            const existing = await ExamResult.findOne({
                where: { examId: exam.id, studentId: r.studentId },
                transaction: t
            });

            if (existing) {
                return existing.update(payload, { transaction: t });
            } else {
                return ExamResult.create({
                    examId: exam.id,
                    studentId: r.studentId,
                    ...payload
                }, { transaction: t });
            }
        });

        await Promise.all(upsertPromises);
        
        // Auto-update exam status to DRAFT if it was SCHEDULED
        if (exam.status === 'SCHEDULED') {
            await exam.update({ status: 'DRAFT' }, { transaction: t });
        }

        await t.commit();

        return success(res, null, 'Results saved successfully');
    } catch (err) {
        await t.rollback();
        next(err);
    }
};

// ── POST /api/exams/:id/publish ───────────────────────────────────────────────
export const publishResults = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const exam = await Exam.findByPk(req.params.id);
        if (!exam) {
            await t.rollback();
            return error(res, 'Exam not found', 404);
        }

        if (exam.status === 'PUBLISHED') {
            await t.rollback();
            return error(res, 'Exam is already published', 400);
        }

        const classroom = await Classroom.findByPk(exam.classroomId);
        
        const isStandardTeacher = req.userRoles && req.userRoles.some(r => r.toLowerCase() === 'teacher') && !req.userRoles.some(r => ['admin', 'super_admin'].includes(r.toLowerCase()));
        if (isStandardTeacher) {
            // Only Class teacher can publish results for the whole class, subject teacher shouldn't publish directly
            if (classroom.classTeacherId !== req.user.teacherId) {
                await t.rollback();
                return error(res, 'Forbidden: Only the Class Teacher or Admin can publish results', 403);
            }
        }

        await exam.update({ status: 'PUBLISHED' }, { transaction: t });
        await t.commit();

        // Trigger notifications
        const { notifyUsers } = req.body;
        if (notifyUsers !== false) {
            logger.info(`[Notification] Results published for Exam ID: ${exam.id}. Notifying students and parents...`);
        }

        return success(res, { exam }, 'Results published successfully');
    } catch (err) {
        await t.rollback();
        next(err);
    }
};
