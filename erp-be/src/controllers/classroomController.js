'use strict';
import { Op } from 'sequelize';
import db from '../models/index.js';
const {
    Classroom, ClassroomStudent, ClassroomSubject, ClassroomPeriod,
    Timetable, Student, Teacher, User, Subject,
} = db;
import { success, error } from '../utils/apiResponse.js';

const studentAccount = () => ({
    model: User, as: 'account',
    attributes: ['id', 'userId', 'firstName', 'lastName', 'email', 'isActive'],
});

const teacherAccount = () => ({
    model: User, as: 'account',
    attributes: ['id', 'userId', 'firstName', 'lastName'],
});

// ── GET /api/classrooms ──────────────────────────────────────────────────────
const listClassrooms = async (req, res, next) => {
    try {
        const { search = '', status = '', academicYear = '' } = req.query;
        const where = {};
        if (status) where.status = status;
        if (academicYear) where.academicYear = academicYear;
        
        let searchCondition = null;
        if (search) {
            searchCondition = {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { section: { [Op.iLike]: `%${search}%` } },
                ]
            };
        }

        const isStandardTeacher = req.userRoles && req.userRoles.includes('TEACHER') && !req.userRoles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r));
        if (isStandardTeacher) {
            const teacherId = req.user.teacherId;
            if (!teacherId) return success(res, { classrooms: [] });

            const subjectClassroomIds = await ClassroomSubject.findAll({
                where: { teacherId },
                attributes: ['classroomId'],
                raw: true
            }).then(rows => rows.map(r => r.classroomId));

            const teacherCondition = {
                [Op.or]: [
                    { classTeacherId: teacherId },
                    { id: { [Op.in]: subjectClassroomIds } }
                ]
            };

            if (searchCondition) {
                where[Op.and] = [searchCondition, teacherCondition];
            } else {
                Object.assign(where, teacherCondition);
            }
        } else if (searchCondition) {
            Object.assign(where, searchCondition);
        }

        const classrooms = await Classroom.findAll({
            where,
            include: [
                {
                    model: ClassroomStudent, as: 'enrollments', attributes: ['id'],
                    required: false,
                },
                {
                    model: ClassroomSubject, as: 'subjects',
                    attributes: ['id', 'subjectId', 'teacherId'],
                    required: false,
                    include: [
                        { model: Teacher, as: 'teacher', attributes: ['id'], include: [teacherAccount()] },
                        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'type'] }
                    ],
                },
                {
                    model: Teacher, as: 'classTeacher',
                    attributes: ['id', 'teacherId'],
                    include: [teacherAccount()]
                }
            ],
            order: [['name', 'ASC'], ['section', 'ASC']],
        });

        // Attach student count to each classroom
        const result = classrooms.map(c => {
            const plain = c.toJSON();
            plain.studentCount = plain.enrollments?.length ?? 0;
            return plain;
        });

        return success(res, { classrooms: result });
    } catch (err) { next(err); }
};

// ── GET /api/classrooms/:id ──────────────────────────────────────────────────
const getClassroom = async (req, res, next) => {
    try {
        const classroom = await Classroom.findByPk(req.params.id, {
            include: [
                {
                    model: ClassroomPeriod, as: 'periods',
                    attributes: ['id', 'name', 'startTime', 'endTime', 'order'],
                },
                {
                    model: ClassroomStudent, as: 'enrollments',
                    include: [{
                        model: Student, as: 'student',
                        attributes: ['id', 'studentId', 'grade', 'section'],
                        include: [studentAccount()],
                    }],
                },
                {
                    model: ClassroomSubject, as: 'subjects',
                    include: [
                        { model: Teacher, as: 'teacher', attributes: ['id', 'teacherId'], include: [teacherAccount()] },
                        { model: Subject, as: 'subject' },
                        { model: Timetable, as: 'schedule', order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']] },
                    ],
                },
                {
                    model: Teacher, as: 'classTeacher',
                    attributes: ['id', 'teacherId'],
                    include: [teacherAccount()]
                },
                {
                    model: Student, as: 'maleMonitor',
                    attributes: ['id', 'studentId'],
                    include: [studentAccount()]
                },
                {
                    model: Student, as: 'femaleMonitor',
                    attributes: ['id', 'studentId'],
                    include: [studentAccount()]
                }
            ],
        });
        if (!classroom) return error(res, 'Classroom not found', 404);

        const isStandardTeacher = req.userRoles && req.userRoles.includes('TEACHER') && !req.userRoles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r));
        if (isStandardTeacher) {
            const teacherId = req.user.teacherId;
            if (classroom.classTeacherId !== teacherId) {
                const hasSubject = classroom.subjects.some(s => s.teacherId === teacherId);
                if (!hasSubject) return error(res, 'Forbidden: You do not have access to this classroom', 403);
            }
        }

        return success(res, { classroom });
    } catch (err) { next(err); }
};

// ── POST /api/classrooms ─────────────────────────────────────────────────────
const createClassroom = async (req, res, next) => {
    const t = await db.sequelize.transaction();
    try {
        const { name, section, academicYear, roomNumber, classTeacherId, status = 'ACTIVE', department, buildingBlock, maxCapacity = 40, monitorMaleId, monitorFemaleId } = req.body;

        const existing = await Classroom.findOne({ where: { name, section, academicYear }, transaction: t });
        if (existing) {
            await t.rollback();
            return error(res, 'Classroom already exists for this name/section/year', 409);
        }

        if (classTeacherId && status === 'ACTIVE') {
            const existingAssignment = await Classroom.findOne({
                where: { classTeacherId, status: 'ACTIVE' },
                transaction: t
            });
            if (existingAssignment) {
                await t.rollback();
                return error(res, `Teacher is already assigned as Class Teacher for ${existingAssignment.name} ${existingAssignment.section}`, 409);
            }
            
            const teacher = await Teacher.findByPk(classTeacherId, { transaction: t });
            if (teacher && (!teacher.designation || teacher.designation === 'SUBJECT_TEACHER')) {
                await teacher.update({ designation: 'CLASS_TEACHER' }, { transaction: t });
            }
        }

        const classroom = await Classroom.create({ name, section, academicYear, roomNumber, classTeacherId, status, department, buildingBlock, maxCapacity, monitorMaleId, monitorFemaleId }, { transaction: t });
        await t.commit();
        return success(res, { classroom }, 'Classroom created', 201);
    } catch (err) { 
        await t.rollback();
        next(err); 
    }
};

// ── PUT /api/classrooms/:id ──────────────────────────────────────────────────
const updateClassroom = async (req, res, next) => {
    const t = await db.sequelize.transaction();
    try {
        const classroom = await Classroom.findByPk(req.params.id, { transaction: t });
        if (!classroom) {
            await t.rollback();
            return error(res, 'Classroom not found', 404);
        }
        
        const { name, section, academicYear, roomNumber, classTeacherId, status, department, buildingBlock, maxCapacity, monitorMaleId, monitorFemaleId } = req.body;
        
        if (classTeacherId && status !== 'INACTIVE') {
            const existingAssignment = await Classroom.findOne({
                where: { classTeacherId, status: 'ACTIVE' },
                transaction: t
            });
            if (existingAssignment && existingAssignment.id !== classroom.id) {
                await t.rollback();
                return error(res, `Teacher is already assigned as Class Teacher for ${existingAssignment.name} ${existingAssignment.section}`, 409);
            }
            
            const teacher = await Teacher.findByPk(classTeacherId, { transaction: t });
            if (teacher && (!teacher.designation || teacher.designation === 'SUBJECT_TEACHER')) {
                await teacher.update({ designation: 'CLASS_TEACHER' }, { transaction: t });
            }
        }

        if (maxCapacity !== undefined) {
            const currentStudentsCount = await ClassroomStudent.count({ where: { classroomId: classroom.id }, transaction: t });
            if (maxCapacity < currentStudentsCount) {
                await t.rollback();
                return error(res, `Cannot reduce max capacity to ${maxCapacity} because there are already ${currentStudentsCount} students enrolled.`, 422);
            }
        }

        
        await classroom.update({ name, section, academicYear, roomNumber, classTeacherId, status, department, buildingBlock, maxCapacity, monitorMaleId, monitorFemaleId }, { transaction: t });
        await t.commit();
        return success(res, { classroom }, 'Classroom updated');
    } catch (err) { 
        await t.rollback();
        next(err); 
    }
};

// ── DELETE /api/classrooms/:id ───────────────────────────────────────────────
const deleteClassroom = async (req, res, next) => {
    try {
        const classroom = await Classroom.findByPk(req.params.id);
        if (!classroom) return error(res, 'Classroom not found', 404);
        await classroom.destroy();
        return success(res, null, 'Classroom deleted');
    } catch (err) { next(err); }
};

// ── GET /api/classrooms/:id/students ────────────────────────────────────────
const getRoster = async (req, res, next) => {
    try {
        const enrollments = await ClassroomStudent.findAll({
            where: { classroomId: req.params.id },
            include: [{
                model: Student, as: 'student',
                attributes: ['id', 'studentId', 'grade', 'section', 'status'],
                include: [studentAccount()],
            }],
            order: [[{ model: Student, as: 'student' }, { model: User, as: 'account' }, 'firstName', 'ASC']],
        });
        return success(res, { enrollments });
    } catch (err) { next(err); }
};

// ── POST /api/classrooms/:id/students ────────────────────────────────────────
// Body: { studentIds: UUID[] }
const assignStudents = async (req, res, next) => {
    try {
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0)
            return error(res, 'studentIds array is required', 422);

        const classroom = await Classroom.findByPk(req.params.id);
        if (!classroom) return error(res, 'Classroom not found', 404);

        // Enforce that students cannot be in multiple classrooms in the same academic year
        const existingEnrollments = await ClassroomStudent.findAll({
            where: { studentId: { [Op.in]: studentIds } },
            include: [{
                model: Classroom,
                as: 'classroom',
                where: { academicYear: classroom.academicYear }
            }]
        });

        const conflicts = existingEnrollments.filter(e => e.classroomId !== classroom.id);
        if (conflicts.length > 0) {
            return error(res, 'One or more selected students are already enrolled in a different classroom for this academic year.', 422);
        }

        const currentCount = await ClassroomStudent.count({ where: { classroomId: classroom.id } });
        const existingInThisClass = existingEnrollments.filter(e => e.classroomId === classroom.id).map(e => e.studentId);
        const newStudentIds = studentIds.filter(id => !existingInThisClass.includes(id));

        if (currentCount + newStudentIds.length > classroom.maxCapacity) {
            return error(res, `Cannot assign students. Max capacity is ${classroom.maxCapacity}, currently enrolled: ${currentCount}, adding: ${newStudentIds.length}.`, 422);
        }

        const rows = studentIds.map(sid => ({ classroomId: classroom.id, studentId: sid }));
        const created = await ClassroomStudent.bulkCreate(rows, { ignoreDuplicates: true });

        return success(res, { assigned: created.length }, `${created.length} student(s) assigned`);
    } catch (err) { next(err); }
};

// ── DELETE /api/classrooms/:id/students/:studentId ──────────────────────────
const removeStudent = async (req, res, next) => {
    try {
        const deleted = await ClassroomStudent.destroy({
            where: { classroomId: req.params.id, studentId: req.params.studentId },
        });
        if (!deleted) return error(res, 'Enrollment not found', 404);
        return success(res, null, 'Student removed from classroom');
    } catch (err) { next(err); }
};

// ── GET /api/classrooms/:id/subjects ────────────────────────────────────────
const getSubjects = async (req, res, next) => {
    try {
        const subjects = await ClassroomSubject.findAll({
            where: { classroomId: req.params.id },
            include: [
                { model: Teacher, as: 'teacher', attributes: ['id', 'teacherId'], include: [teacherAccount()] },
                { model: Subject, as: 'subject' },
                { model: Timetable, as: 'schedule', order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']] },
            ],
        });
        return success(res, { subjects });
    } catch (err) { next(err); }
};

// ── POST /api/classrooms/:id/subjects ────────────────────────────────────────
const addSubject = async (req, res, next) => {
    try {
        const { subjectId, teacherId } = req.body;
        const classroom = await Classroom.findByPk(req.params.id);
        if (!classroom) return error(res, 'Classroom not found', 404);

        const globalSubject = await Subject.findByPk(subjectId);
        if (!globalSubject) return error(res, 'Subject not found', 404);

        const [subject, created] = await ClassroomSubject.findOrCreate({
            where: { classroomId: classroom.id, subjectId },
            defaults: { classroomId: classroom.id, subjectId, teacherId },
        });
        if (!created && teacherId) await subject.update({ teacherId });

        const result = await ClassroomSubject.findByPk(subject.id, {
            include: [
                { model: Teacher, as: 'teacher', attributes: ['id', 'teacherId'], include: [teacherAccount()] },
                { model: Subject, as: 'subject' }
            ],
        });
        return success(res, { subject: result }, created ? 'Subject added' : 'Subject updated', 201);
    } catch (err) { next(err); }
};

// ── DELETE /api/classrooms/:id/subjects/:subjectId ───────────────────────────
const removeSubject = async (req, res, next) => {
    try {
        const deleted = await ClassroomSubject.destroy({
            where: { id: req.params.subjectId, classroomId: req.params.id },
        });
        if (!deleted) return error(res, 'Subject not found', 404);
        return success(res, null, 'Subject removed');
    } catch (err) { next(err); }
};

// ── POST /api/classrooms/:id/subjects/:subjectId/timetable ──────────────────
const upsertTimetableSlot = async (req, res, next) => {
    try {
        const { dayOfWeek, startTime, endTime } = req.body;
        const subject = await ClassroomSubject.findOne({
            where: { id: req.params.subjectId, classroomId: req.params.id },
        });
        if (!subject) return error(res, 'Subject not found in this classroom', 404);

        // Check if ANY subject is already booked in this classroom at this exact time
        const existingSlot = await Timetable.findOne({
            include: [{
                model: ClassroomSubject,
                as: 'classroomSubject',
                where: { classroomId: req.params.id }
            }],
            where: { dayOfWeek, startTime, endTime }
        });

        if (existingSlot) {
            if (existingSlot.classroomSubjectId === subject.id) {
                return success(res, { slot: existingSlot }, 'Slot already exists', 200);
            }
            return error(res, 'Another subject is already booked at this time in this classroom', 409);
        }

        const slot = await Timetable.create({
            classroomSubjectId: subject.id, dayOfWeek, startTime, endTime
        });
        return success(res, { slot }, 'Slot added', 201);
    } catch (err) { next(err); }
};

// ── DELETE /api/classrooms/:id/subjects/:subjectId/timetable/:slotId ─────────
const deleteTimetableSlot = async (req, res, next) => {
    try {
        const deleted = await Timetable.destroy({ where: { id: req.params.slotId } });
        if (!deleted) return error(res, 'Slot not found', 404);
        return success(res, null, 'Slot deleted');
    } catch (err) { next(err); }
};

// ── POST /api/classrooms/:id/periods ──────────────────────────────────────────
const addPeriod = async (req, res, next) => {
    try {
        const { name, startTime, endTime, order = 1 } = req.body;
        const classroom = await Classroom.findByPk(req.params.id);
        if (!classroom) return error(res, 'Classroom not found', 404);

        const period = await ClassroomPeriod.create({
            classroomId: classroom.id,
            name, startTime, endTime, order
        });
        return success(res, { period }, 'Period added', 201);
    } catch (err) { next(err); }
};

// ── DELETE /api/classrooms/:id/periods/:periodId ──────────────────────────────
const deletePeriod = async (req, res, next) => {
    try {
        const deleted = await ClassroomPeriod.destroy({ where: { id: req.params.periodId, classroomId: req.params.id } });
        if (!deleted) return error(res, 'Period not found', 404);
        return success(res, null, 'Period deleted');
    } catch (err) { next(err); }
};

export {
    listClassrooms, getClassroom, createClassroom, updateClassroom, deleteClassroom,
    getRoster, assignStudents, removeStudent,
    getSubjects, addSubject, removeSubject,
    upsertTimetableSlot, deleteTimetableSlot,
    addPeriod, deletePeriod,
};
