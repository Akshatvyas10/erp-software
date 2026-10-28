'use strict';
import { Op } from 'sequelize';
import db from '../models/index.js';

const {
    sequelize,
    Classroom,
    ClassroomStudent,
    ClassroomSubject,
    ClassroomPeriod,
    Timetable,
    TimetableSubstitute,
    Teacher,
    Student,
    User,
    Subject,
    PromotionRule,
    PromotionLog,
    Exam,
    ExamResult,
    AcademicClass,
    StudentAcademicHistory,
    StudentAttendance,
    AcademicYear
} = db;
import { TeacherAvailabilityService } from './teacherAvailability.service.js';


const teacherAccount = () => ({
    model: User,
    as: 'account',
    attributes: ['id', 'userId', 'firstName', 'lastName']
});

const studentAccount = () => ({
    model: User,
    as: 'account',
    attributes: ['id', 'userId', 'firstName', 'lastName', 'email']
});

export class ClassroomService {
    /**
     * Get or create default promotion rule for a classroom's academic class.
     */
     static async getApplicablePromotionRule(classroomId) {
         const classroom = await Classroom.findByPk(classroomId, {
             include: [{ model: AcademicClass, as: 'academicClass' }]
         });
         if (!classroom) {
             const err = new Error('Classroom not found.');
             err.statusCode = 404;
             throw err;
         }

         let rule = null;
         if (classroom.classId) {
             rule = await PromotionRule.findOne({
                 where: { academicClassId: classroom.classId, status: 'ACTIVE' }
             });
         }
         if (!rule) {
             rule = await PromotionRule.findOne({
                 where: { academicClassId: null, status: 'ACTIVE' }
             });
         }
         if (!rule) {
             // Create standard fallback default
             rule = await PromotionRule.create({
                 name: 'Default Promotion Standard',
                 academicClassId: null,
                 minOverallPercentage: 33.00,
                 mustPassAllSubjects: true,
                 minSubjectPercentage: 33.00,
                 maxCompartmentSubjects: 0,
                 status: 'ACTIVE'
             });
         }
         return { classroom, rule };
     }

    /**
     * Evaluate classroom students against promotion rules.
     * Segregates students into eligible vs. failing with diagnostic reasons.
     */
    static async evaluatePromotionCandidates(classroomId) {
        const { classroom, rule } = await this.getApplicablePromotionRule(classroomId);

        const enrollments = await ClassroomStudent.findAll({
            where: { classroomId },
            include: [{
                model: Student,
                as: 'student',
                include: [studentAccount()]
            }],
            order: [[{ model: Student, as: 'student' }, 'admissionNumber', 'ASC']]
        });

        const eligibleStudents = [];
        const failingStudents = [];

        for (const enr of enrollments) {
            const student = enr.student;
            if (!student || student.status !== 'ACTIVE') continue;

            // Fetch exams in this classroom
            const examResults = await ExamResult.findAll({
                where: { studentId: student.id },
                include: [{
                    model: Exam,
                    as: 'exam',
                    where: { classroomId },
                    include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }]
                }]
            });

            let totalMarksObtained = 0;
            let totalMaxMarks = 0;
            const failedSubjects = [];

            if (examResults.length > 0) {
                for (const res of examResults) {
                    const marks = Number(res.marksObtained || 0);
                    const max = Number(res.exam?.maxMarks || 100);
                    totalMarksObtained += marks;
                    totalMaxMarks += max;

                    const subjectPct = max > 0 ? (marks / max) * 100 : 0;
                    if (subjectPct < Number(rule.minSubjectPercentage) || res.status === 'FAILED') {
                        failedSubjects.push({
                            subjectName: res.exam?.subject?.name || 'Subject',
                            subjectCode: res.exam?.subject?.code || '',
                            marksObtained: marks,
                            maxMarks: max,
                            percentage: Math.round(subjectPct * 10) / 10
                        });
                    }
                }
            }

            const overallPercentage = totalMaxMarks > 0
                ? Math.round(((totalMarksObtained / totalMaxMarks) * 100) * 10) / 10
                : null;

            // Evaluation rules
            const isBelowOverall = overallPercentage !== null && overallPercentage < Number(rule.minOverallPercentage);
            const hasSubjectFailures = rule.mustPassAllSubjects && failedSubjects.length > rule.maxCompartmentSubjects;

            const studentData = {
                studentId: student.id,
                admissionNumber: student.admissionNumber || student.studentId || '—',
                name: `${student.account?.firstName || ''} ${student.account?.lastName || ''}`.trim(),
                rollNumber: enr.rollNumber,
                overallPercentage,
                failedSubjects,
                totalExamsEvaluated: examResults.length
            };

            if (isBelowOverall || hasSubjectFailures) {
                failingStudents.push({
                    ...studentData,
                    failureReasons: [
                        ...(isBelowOverall ? [`Overall percentage (${overallPercentage}%) below minimum required (${rule.minOverallPercentage}%)`] : []),
                        ...(hasSubjectFailures ? [`Failed in ${failedSubjects.length} subject(s): ${failedSubjects.map(s => s.subjectName).join(', ')}`] : [])
                    ]
                });
            } else {
                eligibleStudents.push(studentData);
            }
        }

        return {
            classroom: {
                id: classroom.id,
                name: classroom.name,
                section: classroom.section,
                academicYear: classroom.academicYear,
                academicClass: classroom.academicClass
            },
            rule,
            summary: {
                totalStudents: eligibleStudents.length + failingStudents.length,
                eligibleCount: eligibleStudents.length,
                failingCount: failingStudents.length
            },
            eligibleStudents,
            failingStudents
        };
    }

    /**
     * Bulk promote students across academic years / sections.
     * Transactional and atomic. Updates status for GRADUATED / TRANSFERRED.
     * Records audit trail into promotion_logs.
     */
    static async bulkPromoteStudents({ sourceClassroomId, targetAcademicYear, ruleId, promotions, promotedBy }) {
        if (!sourceClassroomId || !targetAcademicYear || !Array.isArray(promotions) || promotions.length === 0) {
            const err = new Error('sourceClassroomId, targetAcademicYear, and promotions array are required.');
            err.statusCode = 422;
            throw err;
        }

        const t = await sequelize.transaction();

        try {
            const sourceClassroom = await Classroom.findByPk(sourceClassroomId, { transaction: t });
            if (!sourceClassroom) {
                const err = new Error('Source classroom not found.');
                err.statusCode = 404;
                throw err;
            }

            let promotedCount = 0;
            let retainedCount = 0;
            let graduatedCount = 0;
            let transferredCount = 0;

            for (const p of promotions) {
                const {
                    studentId,
                    action,
                    targetClassroomId,
                    isManualOverride = false,
                    overrideReason = null,
                    evaluationSummary = {}
                } = p;

                const student = await Student.findByPk(studentId, { transaction: t });
                if (!student) continue;

                if (action === 'PROMOTE') {
                    if (!targetClassroomId) {
                        const err = new Error(`Target classroom must be specified for promoted student ${student.studentId || student.id}`);
                        err.statusCode = 422;
                        throw err;
                    }
                    const targetClass = await Classroom.findByPk(targetClassroomId, { transaction: t });
                    if (!targetClass) {
                        const err = new Error(`Target classroom not found for student ${student.studentId || student.id}`);
                        err.statusCode = 404;
                        throw err;
                    }

                    // 1. Create or ensure enrollment in target classroom
                    await ClassroomStudent.findOrCreate({
                        where: { classroomId: targetClass.id, studentId: student.id },
                        defaults: { classroomId: targetClass.id, studentId: student.id, rollNumber: null },
                        transaction: t
                    });

                    // 2. Remove enrollment from source classroom so student is not duplicated across classes
                    await ClassroomStudent.destroy({
                        where: { classroomId: sourceClassroom.id, studentId: student.id },
                        transaction: t
                    });

                    // 3. Update student grade & section metadata
                    await student.update({
                        grade: targetClass.name,
                        section: targetClass.section,
                        status: 'ACTIVE'
                    }, { transaction: t });

                    promotedCount++;
                } else if (action === 'RETAIN') {
                    if (targetClassroomId && targetClassroomId !== sourceClassroom.id) {
                        const targetClass = await Classroom.findByPk(targetClassroomId, { transaction: t });
                        if (targetClass) {
                            await ClassroomStudent.findOrCreate({
                                where: { classroomId: targetClass.id, studentId: student.id },
                                defaults: { classroomId: targetClass.id, studentId: student.id, rollNumber: null },
                                transaction: t
                            });

                            await ClassroomStudent.destroy({
                                where: { classroomId: sourceClassroom.id, studentId: student.id },
                                transaction: t
                            });

                            await student.update({
                                grade: targetClass.name,
                                section: targetClass.section,
                                status: 'ACTIVE'
                            }, { transaction: t });
                        }
                    }
                    retainedCount++;
                } else if (action === 'GRADUATE' || action === 'ALUMNI') {
                    // Final Class 12 / Graduated
                    await student.update({
                        status: 'GRADUATED',
                        grade: 'Graduated',
                        section: null
                    }, { transaction: t });

                    // De-enroll from active classroom
                    await ClassroomStudent.destroy({
                        where: { classroomId: sourceClassroom.id, studentId: student.id },
                        transaction: t
                    });

                    graduatedCount++;
                } else if (action === 'TRANSFER' || action === 'TC') {
                    // Transferred / TC issued
                    await student.update({
                        status: 'TRANSFERRED',
                        grade: 'Transferred',
                        section: null
                    }, { transaction: t });

                    // De-enroll from active classroom
                    await ClassroomStudent.destroy({
                        where: { classroomId: sourceClassroom.id, studentId: student.id },
                        transaction: t
                    });

                    transferredCount++;
                }

                // Calculate student's overall attendance % in sourceClassroom if not provided
                let attendancePercentage = evaluationSummary.attendancePercentage || null;
                if (attendancePercentage == null) {
                    const attCount = await StudentAttendance.count({
                        where: { studentId: student.id, classroomId: sourceClassroom.id },
                        transaction: t
                    });
                    if (attCount > 0) {
                        const presentCount = await StudentAttendance.count({
                            where: {
                                studentId: student.id,
                                classroomId: sourceClassroom.id,
                                status: { [Op.in]: ['PRESENT', 'LATE', 'HALF_DAY'] }
                            },
                            transaction: t
                        });
                        attendancePercentage = Math.round((presentCount / attCount) * 1000) / 10;
                    }
                }

                // Snapshot past class records permanently into StudentAcademicHistory
                await StudentAcademicHistory.findOrCreate({
                    where: {
                        studentId: student.id,
                        academicYear: sourceClassroom.academicYear,
                        className: sourceClassroom.name
                    },
                    defaults: {
                        studentId: student.id,
                        classroomId: sourceClassroom.id,
                        academicClassId: sourceClassroom.classId,
                        className: sourceClassroom.name,
                        sectionName: sourceClassroom.section,
                        academicYear: sourceClassroom.academicYear,
                        rollNumber: p.rollNumber || null,
                        attendancePercentage,
                        overallPercentage: evaluationSummary.overallPercentage || null,
                        resultStatus: action === 'PROMOTE' ? 'PROMOTED' : (action === 'RETAIN' ? 'DETAINED' : action),
                        finalExamResults: evaluationSummary.failedSubjects || [],
                        teacherRemarks: isManualOverride ? `Manual Override: ${overrideReason}` : null
                    },
                    transaction: t
                });

                // Create audit log entry
                await PromotionLog.create({
                    studentId: student.id,
                    sourceClassroomId: sourceClassroom.id,
                    targetClassroomId: (action === 'PROMOTE' || action === 'RETAIN') ? targetClassroomId : null,
                    sourceAcademicYear: sourceClassroom.academicYear,
                    targetAcademicYear,
                    action,
                    ruleId: ruleId || null,
                    isManualOverride: Boolean(isManualOverride),
                    overrideReason: overrideReason || null,
                    evaluationSummary,
                    promotedBy: promotedBy || null
                }, { transaction: t });
            }

            await t.commit();
            return {
                summary: {
                    promotedCount,
                    retainedCount,
                    graduatedCount,
                    transferredCount,
                    totalProcessed: promotions.length
                },
                message: `Processed promotions: ${promotedCount} Promoted, ${retainedCount} Retained, ${graduatedCount} Graduated, ${transferredCount} Transferred.`
            };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }

    /**
     * Transfer a student to another section within the same academic year.
     */
    static async transferStudentSection({ sourceClassroomId, studentId, targetClassroomId, reason }) {
        if (!targetClassroomId) {
            const err = new Error('Target classroom is required.');
            err.statusCode = 422;
            throw err;
        }

        if (targetClassroomId === sourceClassroomId) {
            const err = new Error('Student is already in this section.');
            err.statusCode = 400;
            throw err;
        }

        const t = await sequelize.transaction();

        try {
            const sourceClassroom = await Classroom.findByPk(sourceClassroomId, { transaction: t });
            const targetClassroom = await Classroom.findByPk(targetClassroomId, { transaction: t });

            if (!sourceClassroom || !targetClassroom) {
                const err = new Error('Source or target classroom not found.');
                err.statusCode = 404;
                throw err;
            }

            // Helper to normalize academic year strings (e.g. '2026-2027' and '2026-27' both become '2026-27')
            const normalizeYear = (yr) => {
                if (!yr) return '';
                const parts = String(yr).trim().split('-');
                if (parts.length === 2) {
                    const start = parts[0].trim();
                    const end = parts[1].trim().slice(-2);
                    return `${start}-${end}`;
                }
                return String(yr).trim();
            };

            const sourceYearNorm = normalizeYear(sourceClassroom.academicYear);
            const targetYearNorm = normalizeYear(targetClassroom.academicYear);

            // Fetch current active academic year for context if exists
            let isCurrentSession = false;
            try {
                const currentYearRecord = await AcademicYear.findOne({ where: { isCurrent: true }, transaction: t });
                if (currentYearRecord) {
                    const activeNorm = normalizeYear(currentYearRecord.name);
                    if (sourceYearNorm === activeNorm && targetYearNorm === activeNorm) {
                        isCurrentSession = true;
                    }
                }
            } catch (_) {}

            // Both classrooms must belong to the same session or both be currently active
            if (sourceYearNorm !== targetYearNorm && !isCurrentSession) {
                // If both are ACTIVE sections of the school, synchronize to current year or target year
                if (sourceClassroom.status === 'ACTIVE' && targetClassroom.status === 'ACTIVE') {
                    // Synchronize the section's year representation so they remain aligned
                    await targetClassroom.update({ academicYear: sourceClassroom.academicYear }, { transaction: t });
                } else {
                    const err = new Error('Section transfer is only permitted within the same academic year.');
                    err.statusCode = 400;
                    throw err;
                }
            }

            // Enforce that section transfers only occur between sections of the same Academic Class
            const sourceClassId = sourceClassroom.classId || sourceClassroom.name;
            const targetClassId = targetClassroom.classId || targetClassroom.name;
            if (sourceClassId && targetClassId && sourceClassId !== targetClassId) {
                const err = new Error('Section transfer is only permitted between sections of the same class.');
                err.statusCode = 400;
                throw err;
            }

            const enrollment = await ClassroomStudent.findOne({
                where: { classroomId: sourceClassroom.id, studentId },
                transaction: t
            });
            if (!enrollment) {
                const err = new Error('Student is not enrolled in the source section.');
                err.statusCode = 404;
                throw err;
            }

            const targetCount = await ClassroomStudent.count({
                where: { classroomId: targetClassroom.id },
                transaction: t
            });
            if (targetCount >= targetClassroom.maxCapacity) {
                const err = new Error(`Target classroom (${targetClassroom.name} - Section ${targetClassroom.section}) has reached maximum capacity (${targetClassroom.maxCapacity}).`);
                err.statusCode = 422;
                throw err;
            }

            // Transfer enrollment and reset rollNumber
            await enrollment.update({
                classroomId: targetClassroom.id,
                rollNumber: null
            }, { transaction: t });

            const student = await Student.findByPk(studentId, { transaction: t });
            if (student) {
                await student.update({ section: targetClassroom.section }, { transaction: t });
            }

            await t.commit();
            return {
                transfer: {
                    studentId,
                    from: `${sourceClassroom.name} - ${sourceClassroom.section}`,
                    to: `${targetClassroom.name} - ${targetClassroom.section}`,
                    reason
                },
                message: `Student transferred to ${targetClassroom.name} - Section ${targetClassroom.section} successfully.`
            };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }

    /**
     * Auto assign roll numbers sequentially based on alphabetical or admission number sorting.
     */
    static async autoAssignRollNumbers({ classroomId, sortBy = 'ALPHABETICAL', startFrom = 1, prefix = '' }) {
        const t = await sequelize.transaction();

        try {
            const classroom = await Classroom.findByPk(classroomId, { transaction: t });
            if (!classroom) {
                const err = new Error('Classroom not found');
                err.statusCode = 404;
                throw err;
            }

            const enrollments = await ClassroomStudent.findAll({
                where: { classroomId: classroom.id },
                include: [{
                    model: Student, as: 'student',
                    attributes: ['id', 'admissionNumber'],
                    include: [studentAccount()]
                }],
                transaction: t
            });

            if (enrollments.length === 0) {
                const err = new Error('No students enrolled in this classroom to assign roll numbers.');
                err.statusCode = 400;
                throw err;
            }

            // Sort enrollments
            enrollments.sort((a, b) => {
                if (sortBy === 'ADMISSION_NO') {
                    const admA = a.student?.admissionNumber || '';
                    const admB = b.student?.admissionNumber || '';
                    return admA.localeCompare(admB, undefined, { numeric: true, sensitivity: 'base' });
                }
                const nameA = `${a.student?.account?.firstName || ''} ${a.student?.account?.lastName || ''}`.trim().toLowerCase();
                const nameB = `${b.student?.account?.firstName || ''} ${b.student?.account?.lastName || ''}`.trim().toLowerCase();
                return nameA.localeCompare(nameB);
            });

            // Clear existing roll numbers to prevent unique index violation
            await ClassroomStudent.update(
                { rollNumber: null },
                { where: { classroomId: classroom.id }, transaction: t }
            );

            let currentNum = parseInt(startFrom, 10) || 1;
            for (const enr of enrollments) {
                const formattedNum = prefix ? `${prefix}${currentNum}` : String(currentNum);
                await enr.update({ rollNumber: formattedNum }, { transaction: t });
                currentNum++;
            }

            await t.commit();

            const updatedEnrollments = await ClassroomStudent.findAll({
                where: { classroomId: classroom.id },
                include: [{
                    model: Student, as: 'student',
                    attributes: ['id', 'studentId', 'admissionNumber', 'grade', 'section', 'gender', 'status'],
                    include: [studentAccount()],
                }],
                order: [
                    ['rollNumber', 'ASC'],
                    [{ model: Student, as: 'student' }, { model: User, as: 'account' }, 'firstName', 'ASC']
                ]
            });

            return {
                enrollments: updatedEnrollments,
                message: `${enrollments.length} roll number(s) auto-assigned successfully.`
            };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }

    /**
     * Clone classroom structure (periods, subjects, timetable) to another section.
     */
    static async cloneClassroomStructure({ sourceClassroomId, targetClassroomId, copyPeriods = true, copySubjects = true, copyTimetable = false }) {
        if (!targetClassroomId || targetClassroomId === sourceClassroomId) {
            const err = new Error('Valid distinct target classroom is required.');
            err.statusCode = 422;
            throw err;
        }

        const t = await sequelize.transaction();

        try {
            const sourceClass = await Classroom.findByPk(sourceClassroomId, {
                include: [
                    { model: ClassroomPeriod, as: 'periods' },
                    {
                        model: ClassroomSubject, as: 'subjects',
                        include: [{ model: Timetable, as: 'schedule' }]
                    }
                ],
                transaction: t
            });
            const targetClass = await Classroom.findByPk(targetClassroomId, { transaction: t });

            if (!sourceClass || !targetClass) {
                const err = new Error('Source or target classroom not found.');
                err.statusCode = 404;
                throw err;
            }

            let copiedPeriodsCount = 0;
            let copiedSubjectsCount = 0;
            let copiedSlotsCount = 0;

            // 1. Copy Periods
            if (copyPeriods && sourceClass.periods?.length > 0) {
                for (const p of sourceClass.periods) {
                    const [, created] = await ClassroomPeriod.findOrCreate({
                        where: {
                            classroomId: targetClass.id,
                            name: p.name,
                            startTime: p.startTime,
                            endTime: p.endTime
                        },
                        defaults: {
                            classroomId: targetClass.id,
                            name: p.name,
                            startTime: p.startTime,
                            endTime: p.endTime,
                            order: p.order
                        },
                        transaction: t
                    });
                    if (created) copiedPeriodsCount++;
                }
            }

            // 2. Copy Subjects
            if (copySubjects && sourceClass.subjects?.length > 0) {
                for (const s of sourceClass.subjects) {
                    const [targetSubj, created] = await ClassroomSubject.findOrCreate({
                        where: { classroomId: targetClass.id, subjectId: s.subjectId },
                        defaults: {
                            classroomId: targetClass.id,
                            subjectId: s.subjectId,
                            teacherId: null
                        },
                        transaction: t
                    });
                    if (created) copiedSubjectsCount++;

                    // 3. Copy Timetable Matrix
                    if (copyTimetable && s.schedule?.length > 0) {
                        for (const slot of s.schedule) {
                            const [, slotCreated] = await Timetable.findOrCreate({
                                where: {
                                    classroomSubjectId: targetSubj.id,
                                    dayOfWeek: slot.dayOfWeek,
                                    startTime: slot.startTime,
                                    endTime: slot.endTime
                                },
                                defaults: {
                                    classroomSubjectId: targetSubj.id,
                                    dayOfWeek: slot.dayOfWeek,
                                    startTime: slot.startTime,
                                    endTime: slot.endTime
                                },
                                transaction: t
                            });
                            if (slotCreated) copiedSlotsCount++;
                        }
                    }
                }
            }

            await t.commit();
            return {
                summary: {
                    copiedPeriods: copiedPeriodsCount,
                    copiedSubjects: copiedSubjectsCount,
                    copiedSlots: copiedSlotsCount
                },
                message: `Cloned structure successfully: ${copiedPeriodsCount} periods, ${copiedSubjectsCount} subjects, and ${copiedSlotsCount} schedule slots.`
            };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }

    /**
     * Assign a substitute teacher to a scheduled slot with strict clash and availability detection.
     */
    static async assignSubstituteTeacher({ classroomId, timetableId, substituteTeacherId, date, reason, userId }) {
        const classroom = await Classroom.findByPk(classroomId);
        if (!classroom) {
            const err = new Error('Classroom not found');
            err.statusCode = 404;
            throw err;
        }

        const slot = await Timetable.findByPk(timetableId, {
            include: [{
                model: ClassroomSubject,
                as: 'classroomSubject',
                where: { classroomId },
                include: [{ model: Teacher, as: 'teacher', attributes: ['id'] }]
            }]
        });
        if (!slot) {
            const err = new Error('Timetable slot not found in this classroom');
            err.statusCode = 404;
            throw err;
        }

        const substituteTeacher = await Teacher.findByPk(substituteTeacherId, {
            include: [teacherAccount()]
        });
        if (!substituteTeacher) {
            const err = new Error('Substitute teacher not found');
            err.statusCode = 404;
            throw err;
        }

        const [y, m, d] = date.split('-').map(Number);
        const targetDate = new Date(y, m - 1, d);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dateDayOfWeek = dayNames[targetDate.getDay()];

        if (slot.dayOfWeek && dateDayOfWeek.toLowerCase() !== slot.dayOfWeek.toLowerCase()) {
            const err = new Error(`The selected date (${date}, ${dateDayOfWeek}) does not match this lecture's scheduled day (${slot.dayOfWeek}). Please choose a ${slot.dayOfWeek}.`);
            err.statusCode = 422;
            throw err;
        }

        // Run thorough availability check (Leaves, Timetable overlap, Substitute conflicts)
        const availability = await TeacherAvailabilityService.checkAvailability({
            teacherId: substituteTeacherId,
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
        });

        if (!availability.isFree) {
            const tName = substituteTeacher.account
                ? `${substituteTeacher.account.firstName} ${substituteTeacher.account.lastName}`.trim()
                : 'Selected faculty';
            const primaryMsg = availability.conflicts.map((c) => c.message).join(' | ');
            const err = new Error(`Cannot assign ${tName}: ${primaryMsg}`);
            err.statusCode = 409;
            err.conflicts = availability.conflicts;
            throw err;
        }

        return await sequelize.transaction(async (t) => {
            const [substitute, created] = await TimetableSubstitute.findOrCreate({
                where: { timetableId, date },
                defaults: {
                    classroomId,
                    timetableId,
                    originalTeacherId: slot.classroomSubject?.teacherId || null,
                    substituteTeacherId,
                    date,
                    reason,
                    status: 'ASSIGNED',
                    assignedBy: userId
                },
                transaction: t,
            });

            if (!created) {
                await substitute.update({
                    substituteTeacherId,
                    reason,
                    status: 'ASSIGNED',
                    assignedBy: userId
                }, { transaction: t });
            }

            const result = await TimetableSubstitute.findByPk(substitute.id, {
                include: [
                    { model: Teacher, as: 'substituteTeacher', attributes: ['id', 'teacherId'], include: [teacherAccount()] },
                    { model: Teacher, as: 'originalTeacher', attributes: ['id', 'teacherId'], include: [teacherAccount()] }
                ],
                transaction: t,
            });

            return result;
        });
    }
}
