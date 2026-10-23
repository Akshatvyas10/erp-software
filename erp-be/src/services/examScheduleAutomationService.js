'use strict';
import { Op } from 'sequelize';
import db from '../models/index.js';
import logger from '../utils/logger.js';

const {
    Classroom, ClassroomSubject, Subject, ExamSchedule, Exam,
    TestExamConfig, AcademicYear, CalendarEvent, Teacher, Department, sequelize
} = db;

export class ExamScheduleAutomationService {
    /**
     * Preview exam schedules that would be generated for a classroom based on department rules.
     */
    static async previewGeneration(classroomId, options = {}) {
        const {
            includeUnitTests = true,
            includeMajorExams = true,
            academicYear: requestedYear = null
        } = options;

        const classroom = await Classroom.findByPk(classroomId, {
            include: [
                { model: Department, as: 'departmentRef', attributes: ['id', 'name'] },
                {
                    model: db.AcademicClass,
                    as: 'academicClass',
                    include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }]
                },
                {
                    model: ClassroomSubject,
                    as: 'classroomSubjects',
                    include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }]
                }
            ]
        });

        if (!classroom) {
            throw new Error('Classroom not found');
        }

        const effectiveDepartmentId = classroom.departmentId || classroom.academicClass?.departmentId;
        const departmentName = classroom.departmentRef?.name || classroom.academicClass?.department?.name || 'General';

        if (!effectiveDepartmentId) {
            throw new Error(`Classroom "${classroom.name}" is not associated with any Academic Department.`);
        }

        // Determine active academic year
        const effectiveAcademicYear = requestedYear || classroom.academicYear || '2026-2027';
        const yearRecord = await AcademicYear.findOne({
            where: {
                [Op.or]: [
                    { name: effectiveAcademicYear },
                    { isCurrent: true }
                ]
            }
        });

        const academicYearName = yearRecord?.name || effectiveAcademicYear;
        const academicYearId = yearRecord?.id || null;
        const sessionStartDate = yearRecord?.startDate ? new Date(yearRecord.startDate) : new Date();

        // Fetch Department Evaluation Rule
        const rule = await TestExamConfig.findOne({
            where: {
                departmentId: effectiveDepartmentId,
                academicYear: academicYearName,
                isActive: true
            }
        });

        if (!rule) {
            throw new Error(
                `No active Evaluation Rule configured for department "${departmentName}" in Academic Year ${academicYearName}. Please configure rules in School Config.`
            );
        }

        // Available subjects for exam papers
        const assignedSubjects = (classroom.classroomSubjects || [])
            .map(cs => cs.subject)
            .filter(Boolean);

        const previewSchedules = [];

        // 1. Major Exams Preview
        if (includeMajorExams && Array.isArray(rule.examTemplates) && rule.examTemplates.length > 0) {
            for (let i = 0; i < rule.examTemplates.length; i++) {
                const tmpl = rule.examTemplates[i];
                const monthOffset = tmpl.monthOffset || (i + 1) * Math.floor(12 / (rule.totalExamsPerYear + 1));
                const duration = tmpl.durationDays || 5;

                const startDate = new Date(sessionStartDate);
                startDate.setMonth(startDate.getMonth() + monthOffset - 1);
                startDate.setDate(20);

                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + (duration - 1));

                // Determine type
                let scheduleType = 'ANNUAL';
                const lowerName = (tmpl.name || '').toLowerCase();
                if (lowerName.includes('quarter')) scheduleType = 'QUARTERLY';
                else if (lowerName.includes('half') || lowerName.includes('mid')) scheduleType = 'HALF_YEARLY';
                else if (lowerName.includes('unit')) scheduleType = 'UNIT_TEST';

                previewSchedules.push({
                    name: tmpl.name || `Exam ${i + 1}`,
                    type: scheduleType,
                    plannedStartDate: startDate.toISOString().split('T')[0],
                    plannedEndDate: endDate.toISOString().split('T')[0],
                    paperCount: assignedSubjects.length,
                    status: 'DRAFT',
                    subjects: assignedSubjects.map((s, sIdx) => {
                        const paperDate = new Date(startDate);
                        paperDate.setDate(startDate.getDate() + (sIdx % duration));
                        return {
                            subjectId: s.id,
                            subjectName: s.name,
                            subjectCode: s.code,
                            date: paperDate.toISOString().split('T')[0],
                            maxMarks: 100
                        };
                    })
                });
            }
        }

        // 2. Periodic Unit Tests Preview
        if (includeUnitTests && Array.isArray(rule.testTemplates) && rule.testTemplates.length > 0) {
            for (let i = 0; i < rule.testTemplates.length; i++) {
                const tmpl = rule.testTemplates[i];
                const monthOffset = tmpl.monthOffset || (i + 1);
                const duration = tmpl.durationDays || 2;

                const startDate = new Date(sessionStartDate);
                startDate.setMonth(startDate.getMonth() + monthOffset - 1);
                startDate.setDate(15);

                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + (duration - 1));

                previewSchedules.push({
                    name: tmpl.name || `Unit Test ${i + 1}`,
                    type: 'UNIT_TEST',
                    plannedStartDate: startDate.toISOString().split('T')[0],
                    plannedEndDate: endDate.toISOString().split('T')[0],
                    paperCount: assignedSubjects.length,
                    status: 'DRAFT',
                    subjects: assignedSubjects.map((s, sIdx) => {
                        const paperDate = new Date(startDate);
                        paperDate.setDate(startDate.getDate() + (sIdx % duration));
                        return {
                            subjectId: s.id,
                            subjectName: s.name,
                            subjectCode: s.code,
                            date: paperDate.toISOString().split('T')[0],
                            maxMarks: 40
                        };
                    })
                });
            }
        }

        // Fetch existing schedules for conflict comparison
        const existingSchedules = await ExamSchedule.findAll({
            where: { classroomId },
            attributes: ['id', 'name', 'type', 'status']
        });

        return {
            classroom: {
                id: classroom.id,
                name: classroom.name,
                section: classroom.section,
                departmentName,
                academicYear: academicYearName,
                assignedSubjectsCount: assignedSubjects.length,
            },
            rule: {
                totalExamsPerYear: rule.totalExamsPerYear,
                totalTestsPerYear: rule.totalTestsPerYear,
                description: rule.rulesDescription || `${rule.totalExamsPerYear} Exams & ${rule.totalTestsPerYear} Periodic Tests`
            },
            previewSchedules,
            existingSchedules
        };
    }

    /**
     * Generate or regenerate Exam Schedules for a classroom section based on department rules.
     */
    static async generateForClassroom(classroomId, options = {}, creatorUserId = null) {
        const {
            includeUnitTests = true,
            includeMajorExams = true,
            overwriteDrafts = true,
            academicYear: requestedYear = null
        } = options;

        const previewData = await this.previewGeneration(classroomId, {
            includeUnitTests,
            includeMajorExams,
            academicYear: requestedYear
        });

        const { classroom, previewSchedules } = previewData;

        if (previewSchedules.length === 0) {
            throw new Error('No exam or test templates found in department rule to generate.');
        }

        const t = await sequelize.transaction();
        try {
            // Find AcademicYear ID
            const yearRecord = await AcademicYear.findOne({
                where: {
                    [Op.or]: [
                        { name: classroom.academicYear },
                        { isCurrent: true }
                    ]
                },
                transaction: t
            });
            const academicYearId = yearRecord?.id || null;

            // Fetch school holidays to avoid scheduling papers on holidays
            const holidays = await CalendarEvent.findAll({
                where: {
                    day_type: 'HOLIDAY',
                    [Op.or]: [
                        { target_audience: 'ALL' },
                        { target_class_id: classroomId }
                    ]
                },
                attributes: ['start_date', 'end_date', 'title'],
                transaction: t
            });

            const isHolidayDate = (dateStr) => {
                const target = new Date(dateStr).getTime();
                return holidays.some(h => {
                    const s = new Date(h.start_date).setHours(0, 0, 0, 0);
                    const e = new Date(h.end_date).setHours(23, 59, 59, 999);
                    return target >= s && target <= e;
                });
            };

            const createdOrUpdatedSchedules = [];
            let totalPapersCreated = 0;
            const calendarEventsToInsert = [];

            for (const item of previewSchedules) {
                // Check if an existing schedule exists by classroomId and name
                let schedule = await ExamSchedule.findOne({
                    where: {
                        classroomId,
                        name: item.name
                    },
                    transaction: t
                });

                if (schedule) {
                    if (schedule.status === 'COMPLETED') {
                        // Never touch completed historical schedules
                        continue;
                    }
                    if (schedule.status === 'PUBLISHED' && !overwriteDrafts) {
                        // Preserve published schedules if overwriteDrafts is false
                        continue;
                    }

                    // Update existing DRAFT schedule
                    if (schedule.status === 'DRAFT' && overwriteDrafts) {
                        await schedule.update({
                            type: item.type,
                            academicYearId
                        }, { transaction: t });

                        // Remove existing draft exams so we can re-populate clean papers
                        await Exam.destroy({
                            where: { examScheduleId: schedule.id, status: 'DRAFT' },
                            transaction: t
                        });
                    }
                } else {
                    // Create new Schedule
                    schedule = await ExamSchedule.create({
                        name: item.name,
                        type: item.type,
                        classroomId,
                        academicYearId,
                        status: 'DRAFT'
                    }, { transaction: t });
                }

                // Create Subject Papers (Exams)
                for (const paper of item.subjects) {
                    let assignedDate = paper.date;

                    // If proposed date falls on a holiday or Sunday, shift by 1-2 days
                    let dObj = new Date(assignedDate);
                    while (dObj.getDay() === 0 || isHolidayDate(dObj.toISOString().split('T')[0])) {
                        dObj.setDate(dObj.getDate() + 1);
                    }
                    assignedDate = dObj.toISOString().split('T')[0];

                    const existingExam = await Exam.findOne({
                        where: {
                            examScheduleId: schedule.id,
                            subjectId: paper.subjectId
                        },
                        transaction: t
                    });

                    if (!existingExam) {
                        await Exam.create({
                            examScheduleId: schedule.id,
                            classroomId,
                            subjectId: paper.subjectId,
                            date: assignedDate,
                            maxMarks: paper.maxMarks,
                            status: 'DRAFT'
                        }, { transaction: t });
                        totalPapersCreated++;
                    }
                }

                // Add or sync class-targeted Calendar Event for the whole schedule block
                const eventType = item.type === 'UNIT_TEST' ? 'TEST' : 'EXAM';
                calendarEventsToInsert.push({
                    title: `${classroom.name} ${classroom.section}: ${item.name}`,
                    description: `Official ${item.type} assessment for ${classroom.name} ${classroom.section}`,
                    type: eventType,
                    start_date: new Date(item.plannedStartDate),
                    end_date: new Date(item.plannedEndDate),
                    day_type: 'SPECIAL',
                    status: 'PUBLISHED',
                    target_audience: 'CLASS',
                    target_class_id: classroomId,
                    created_by: creatorUserId,
                    is_auto_generated: true
                });

                createdOrUpdatedSchedules.push(schedule);
            }

            // Clean previous auto-generated test/exam calendar events for this classroom
            await CalendarEvent.destroy({
                where: {
                    target_class_id: classroomId,
                    is_auto_generated: true,
                    type: { [Op.in]: ['TEST', 'EXAM'] }
                },
                transaction: t
            });

            if (calendarEventsToInsert.length > 0 && creatorUserId) {
                await CalendarEvent.bulkCreate(calendarEventsToInsert, { transaction: t });
            }

            await t.commit();

            logger.info(`[ExamAutomation] Created/updated ${createdOrUpdatedSchedules.length} schedules and ${totalPapersCreated} papers for classroom ${classroomId}`);

            return {
                classroomId,
                schedulesCount: createdOrUpdatedSchedules.length,
                papersCount: totalPapersCreated,
                calendarEventsCount: calendarEventsToInsert.length
            };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }

    /**
     * Publish an exam schedule so that marks entry is unlocked and students/teachers can view it.
     */
    static async publishSchedule(scheduleId, user) {
        const schedule = await ExamSchedule.findByPk(scheduleId, {
            include: [{ model: Exam, as: 'exams' }]
        });

        if (!schedule) {
            throw new Error('Exam schedule not found');
        }

        if (schedule.status === 'PUBLISHED') {
            return schedule;
        }

        if (schedule.status === 'COMPLETED') {
            throw new Error('Cannot publish an already completed schedule.');
        }

        if (!schedule.exams || schedule.exams.length === 0) {
            throw new Error('Cannot publish an exam schedule with no subject papers.');
        }

        const t = await sequelize.transaction();
        try {
            await schedule.update({ status: 'PUBLISHED' }, { transaction: t });

            // Mark all child papers as SCHEDULED / PUBLISHED so teachers can enter grades
            await Exam.update(
                { status: 'SCHEDULED' },
                {
                    where: { examScheduleId: schedule.id, status: 'DRAFT' },
                    transaction: t
                }
            );

            await t.commit();
            return schedule;
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }
}
