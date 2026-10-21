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
    Subject
} = db;

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
     * Bulk promote students across academic years / sections.
     * Transactional and atomic. Removes old classroom enrollments upon promotion.
     */
    static async bulkPromoteStudents({ sourceClassroomId, targetAcademicYear, promotions }) {
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
            let tcCount = 0;

            for (const p of promotions) {
                const { studentId, action, targetClassroomId } = p;
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
                        section: targetClass.section
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
                                section: targetClass.section
                            }, { transaction: t });
                        }
                    }
                    retainedCount++;
                } else if (action === 'TC' || action === 'ALUMNI') {
                    // Soft-inactivate student
                    await student.update({ status: 'INACTIVE' }, { transaction: t });

                    // De-enroll from active classroom
                    await ClassroomStudent.destroy({
                        where: { classroomId: sourceClassroom.id, studentId: student.id },
                        transaction: t
                    });

                    tcCount++;
                }
            }

            await t.commit();
            return {
                summary: { promotedCount, retainedCount, tcCount, totalProcessed: promotions.length },
                message: `Processed promotions: ${promotedCount} Promoted, ${retainedCount} Retained, ${tcCount} TC/Alumni.`
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

            if (sourceClassroom.academicYear !== targetClassroom.academicYear) {
                const err = new Error('Section transfer is only permitted within the same academic year.');
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
     * Assign a substitute teacher to a scheduled slot with clash detection.
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

        const dayOfWeek = slot.dayOfWeek || dateDayOfWeek;

        // Check regular lecture clash
        const regularClash = await Timetable.findOne({
            include: [{
                model: ClassroomSubject,
                as: 'classroomSubject',
                where: { teacherId: substituteTeacherId },
                include: [
                    {
                        model: Classroom,
                        as: 'classroom',
                        where: { academicYear: classroom.academicYear, status: 'ACTIVE' },
                        attributes: ['id', 'name', 'section']
                    },
                    {
                        model: Subject,
                        as: 'subject',
                        attributes: ['id', 'name', 'code']
                    }
                ]
            }],
            where: {
                dayOfWeek,
                startTime: { [Op.lt]: slot.endTime },
                endTime: { [Op.gt]: slot.startTime },
            }
        });

        if (regularClash) {
            const clashClass = regularClash.classroomSubject?.classroom;
            const clashSubj = regularClash.classroomSubject?.subject;
            const cName = clashClass ? `${clashClass.name} - Section ${clashClass.section}` : 'another classroom';
            const sName = clashSubj ? clashSubj.name : 'a lecture';
            const tName = substituteTeacher.account ? `${substituteTeacher.account.firstName} ${substituteTeacher.account.lastName}` : 'Teacher';
            const err = new Error(`${tName} already has a regular lecture (${sName}) in ${cName} at this time (${regularClash.startTime.slice(0, 5)} - ${regularClash.endTime.slice(0, 5)}).`);
            err.statusCode = 409;
            throw err;
        }

        // Check proxy duty clash on same date
        const proxyClash = await TimetableSubstitute.findOne({
            where: {
                substituteTeacherId,
                date,
                status: 'ASSIGNED'
            },
            include: [{
                model: Timetable,
                as: 'slot',
                where: {
                    startTime: { [Op.lt]: slot.endTime },
                    endTime: { [Op.gt]: slot.startTime }
                }
            }]
        });

        if (proxyClash) {
            const tName = substituteTeacher.account ? `${substituteTeacher.account.firstName} ${substituteTeacher.account.lastName}` : 'Teacher';
            const err = new Error(`${tName} is already assigned as a substitute teacher for another lecture at this time on ${date}.`);
            err.statusCode = 409;
            throw err;
        }

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
            }
        });

        if (!created) {
            await substitute.update({
                substituteTeacherId,
                reason,
                status: 'ASSIGNED',
                assignedBy: userId
            });
        }

        const result = await TimetableSubstitute.findByPk(substitute.id, {
            include: [
                { model: Teacher, as: 'substituteTeacher', attributes: ['id', 'teacherId'], include: [teacherAccount()] },
                { model: Teacher, as: 'originalTeacher', attributes: ['id', 'teacherId'], include: [teacherAccount()] }
            ]
        });

        return result;
    }
}
