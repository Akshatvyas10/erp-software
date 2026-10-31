'use strict';
import { Op } from 'sequelize';
import db from '../models/index.js';
const {
    Classroom, ClassroomStudent, ClassroomSubject, ClassroomPeriod,
    Timetable, Student, Teacher, User, Subject, AcademicClass, Department,
    ClassroomRoom, TimetableSubstitute, sequelize,
    CalendarEvent, TestExamConfig, AcademicYear, ExamSchedule, Exam,
} = db;
import { success, error } from '../utils/apiResponse.js';
import { ClassroomService } from '../services/classroomService.js';
import { ExamScheduleAutomationService } from '../services/examScheduleAutomationService.js';
import { TeacherAvailabilityService } from '../services/teacherAvailability.service.js';

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
        const { search = '', status = '', academicYear = '', classId = '', departmentId = '' } = req.query;
        const where = {};
        if (status) where.status = status;
        if (academicYear) where.academicYear = academicYear;
        if (classId) where.classId = classId;
        if (departmentId && departmentId !== 'all') {
            where[Op.or] = [
                { departmentId },
                { '$academicClass.department_id$': departmentId }
            ];
        }
        
        let searchCondition = null;
        if (search) {
            searchCondition = {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { section: { [Op.iLike]: `%${search}%` } },
                ]
            };
        }

        const rolesLower = (req.userRoles || []).map(r => String(r).toLowerCase());
        const isPrivileged = rolesLower.some(r => ['admin', 'super_admin', 'principal'].includes(r));
        const isStandardTeacher = !isPrivileged && rolesLower.includes('teacher');
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
        } else if (rolesLower.includes('student')) {
            const studentId = req.user.studentId;
            if (!studentId) return success(res, { classrooms: [] });

            const enrolledClassroomIds = await ClassroomStudent.findAll({
                where: { studentId },
                attributes: ['classroomId'],
                raw: true,
            }).then(rows => rows.map(r => r.classroomId));

            if (enrolledClassroomIds.length === 0) {
                return success(res, { classrooms: [] });
            }

            const studentCondition = { id: { [Op.in]: enrolledClassroomIds } };
            if (searchCondition) {
                where[Op.and] = [searchCondition, studentCondition];
            } else {
                Object.assign(where, studentCondition);
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
                },
                {
                    model: AcademicClass, as: 'academicClass',
                    attributes: ['id', 'name', 'code', 'orderIndex', 'departmentId'],
                    include: [{
                        model: Department, as: 'department',
                        attributes: ['id', 'name', 'headId'],
                        include: [{
                            model: Teacher, as: 'head',
                            attributes: ['id', 'teacherId'],
                            include: [teacherAccount()]
                        }]
                    }]
                },
                {
                    model: Department, as: 'departmentRef',
                    attributes: ['id', 'name', 'headId'],
                    include: [{
                        model: Teacher, as: 'head',
                        attributes: ['id', 'teacherId'],
                        include: [teacherAccount()]
                    }]
                }
            ],
            order: [['name', 'ASC'], ['section', 'ASC']],
        });

        // Attach student count to each classroom
        const result = classrooms.map(c => {
            const plain = c.toJSON();
            plain.studentCount = plain.enrollments?.length ?? 0;
            if (plain.academicClass?.department?.head) {
                plain.academicClass.department.incharge = plain.academicClass.department.head;
            }
            if (plain.departmentRef?.head) {
                plain.departmentRef.incharge = plain.departmentRef.head;
            }
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
                        attributes: ['id', 'studentId', 'admissionNumber', 'grade', 'section', 'gender', 'status'],
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
                },
                {
                    model: AcademicClass, as: 'academicClass',
                    attributes: ['id', 'name', 'code', 'orderIndex', 'departmentId'],
                    include: [{
                        model: Department, as: 'department',
                        attributes: ['id', 'name', 'headId'],
                        include: [{
                            model: Teacher, as: 'head',
                            attributes: ['id', 'teacherId'],
                            include: [teacherAccount()]
                        }]
                    }]
                },
                {
                    model: Department, as: 'departmentRef',
                    attributes: ['id', 'name', 'headId'],
                    include: [{
                        model: Teacher, as: 'head',
                        attributes: ['id', 'teacherId'],
                        include: [teacherAccount()]
                    }]
                }
            ],
        });
        if (!classroom) return error(res, 'Classroom not found', 404);

        const rolesLower = (req.userRoles || []).map(r => String(r).toLowerCase());
        const isPrivileged = rolesLower.some(r => ['admin', 'super_admin', 'principal'].includes(r));
        const isStandardTeacher = !isPrivileged && rolesLower.includes('teacher');
        if (isStandardTeacher) {
            const teacherId = req.user.teacherId;
            const isClassTeacher = classroom.classTeacherId === teacherId;
            const hasSubject = classroom.subjects?.some(s => s.teacherId === teacherId);
            const deptHeadId = classroom.departmentRef?.headId || classroom.academicClass?.department?.headId;
            const isDeptIncharge = deptHeadId && deptHeadId === teacherId;

            if (!isClassTeacher && !hasSubject && !isDeptIncharge) {
                return error(res, 'Forbidden: You do not have access to this classroom', 403);
            }
        }

        const isStudent = !isPrivileged && rolesLower.includes('student');

        const plain = classroom.toJSON();
        if (plain.academicClass?.department?.head) {
            plain.academicClass.department.incharge = plain.academicClass.department.head;
        }
        if (plain.departmentRef?.head) {
            plain.departmentRef.incharge = plain.departmentRef.head;
        }

        // Student-safe sanitization: Never leak full classmate rosters or administrative configurations to students
        if (isStudent) {
            const studentId = req.user.studentId;
            delete plain.enrollments; // Exclude full roster
            delete plain.maleMonitor;
            delete plain.femaleMonitor;
            delete plain.monitorMaleId;
            delete plain.monitorFemaleId;

            // Retain safe student count and enrolled confirmation
            plain.studentCount = classroom.enrollments?.length || 0;
            plain.isEnrolled = classroom.enrollments?.some(e => e.studentId === studentId);
        }

        return success(res, { classroom: plain });
    } catch (err) { next(err); }
};

// ── POST /api/classrooms ─────────────────────────────────────────────────────
const createClassroom = async (req, res, next) => {
    const t = await db.sequelize.transaction();
    try {
        let {
            name, section, academicYear, roomNumber, classTeacherId, status = 'ACTIVE',
            department, departmentId, buildingBlock, blockId, roomId,
            maxCapacity = 40, monitorMaleId, monitorFemaleId, classId
        } = req.body;

        // If classId is provided, resolve name and department if missing
        if (classId) {
            const parentClass = await AcademicClass.findByPk(classId, { transaction: t });
            if (!parentClass) {
                await t.rollback();
                return error(res, 'Specified Academic Class does not exist', 400);
            }
            if (!name) name = parentClass.name;
            if (!departmentId && parentClass.departmentId) departmentId = parentClass.departmentId;
        }

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

        const classroom = await Classroom.create({
            classId, name, section, academicYear, roomNumber, classTeacherId, status,
            department, departmentId, buildingBlock, blockId, roomId,
            maxCapacity, monitorMaleId, monitorFemaleId
        }, { transaction: t });

        // Auto-generate class-targeted Calendar Events for tests and exams according to Department Evaluation Rules
        if (departmentId) {
            const rule = await TestExamConfig.findOne({
                where: { departmentId, academicYear, isActive: true },
                transaction: t
            });

            if (rule) {
                // Find session start date to calculate monthly dates or fallback to academic year boundaries
                let sessionStartDate = new Date();
                const yearRecord = await AcademicYear.findOne({
                    where: { name: academicYear },
                    transaction: t
                });
                if (yearRecord?.startDate) {
                    sessionStartDate = new Date(yearRecord.startDate);
                }

                const eventsToCreate = [];
                const creatorId = req.user?.id || (classTeacherId ? (await Teacher.findByPk(classTeacherId, { transaction: t }))?.userId : null);

                if (creatorId) {
                    // 1. Generate Tests according to department rule
                    if (Array.isArray(rule.testTemplates) && rule.testTemplates.length > 0) {
                        for (let i = 0; i < rule.testTemplates.length; i++) {
                            const template = rule.testTemplates[i];
                            const monthOffset = template.monthOffset || (i + 1);
                            const duration = template.durationDays || 2;

                            const sDate = new Date(sessionStartDate);
                            sDate.setMonth(sDate.getMonth() + monthOffset - 1);
                            sDate.setDate(15); // Standard mid-month test slot

                            const eDate = new Date(sDate);
                            eDate.setDate(sDate.getDate() + (duration - 1));

                            eventsToCreate.push({
                                title: `${name} - ${section}: ${template.name || `Periodic Test ${i + 1}`}`,
                                description: `Department aligned test for ${name} ${section}. Evaluation Rule: ${rule.rulesDescription || 'Periodic Assessment'}`,
                                type: 'TEST',
                                start_date: sDate,
                                end_date: eDate,
                                day_type: 'SPECIAL',
                                status: 'PUBLISHED',
                                target_audience: 'CLASS',
                                target_class_id: classroom.id,
                                created_by: creatorId,
                                is_auto_generated: true,
                                location: roomNumber ? `Room ${roomNumber}` : null
                            });
                        }
                    }

                    // 2. Generate Exams according to department rule
                    if (Array.isArray(rule.examTemplates) && rule.examTemplates.length > 0) {
                        for (let i = 0; i < rule.examTemplates.length; i++) {
                            const template = rule.examTemplates[i];
                            const monthOffset = template.monthOffset || (i + 1) * Math.floor(12 / (rule.totalExamsPerYear + 1));
                            const duration = template.durationDays || 5;

                            const sDate = new Date(sessionStartDate);
                            sDate.setMonth(sDate.getMonth() + monthOffset - 1);
                            sDate.setDate(20); // Standard examination period slot

                            const eDate = new Date(sDate);
                            eDate.setDate(sDate.getDate() + (duration - 1));

                            eventsToCreate.push({
                                title: `${name} - ${section}: ${template.name || `Exam ${i + 1}`}`,
                                description: `Department examination milestone for ${name} ${section}. Academic Year: ${academicYear}`,
                                type: 'EXAM',
                                start_date: sDate,
                                end_date: eDate,
                                day_type: 'SPECIAL',
                                status: 'PUBLISHED',
                                target_audience: 'CLASS',
                                target_class_id: classroom.id,
                                created_by: creatorId,
                                is_auto_generated: true,
                                location: roomNumber ? `Room ${roomNumber}` : null
                            });
                        }
                    }

                    if (eventsToCreate.length > 0) {
                        await CalendarEvent.bulkCreate(eventsToCreate, { transaction: t });
                    }

                    // Also auto-create official DRAFT ExamSchedules for the classroom
                    const schedulesToInsert = [];
                    if (Array.isArray(rule.testTemplates)) {
                        for (const tmpl of rule.testTemplates) {
                            schedulesToInsert.push({
                                name: tmpl.name,
                                type: 'UNIT_TEST',
                                classroomId: classroom.id,
                                academicYearId: yearRecord?.id || null,
                                status: 'DRAFT'
                            });
                        }
                    }
                    if (Array.isArray(rule.examTemplates)) {
                        for (const tmpl of rule.examTemplates) {
                            let sType = 'ANNUAL';
                            const lName = (tmpl.name || '').toLowerCase();
                            if (lName.includes('quarter')) sType = 'QUARTERLY';
                            else if (lName.includes('half') || lName.includes('mid')) sType = 'HALF_YEARLY';
                            else if (lName.includes('unit')) sType = 'UNIT_TEST';

                            schedulesToInsert.push({
                                name: tmpl.name,
                                type: sType,
                                classroomId: classroom.id,
                                academicYearId: yearRecord?.id || null,
                                status: 'DRAFT'
                            });
                        }
                    }

                    if (schedulesToInsert.length > 0) {
                        await ExamSchedule.bulkCreate(schedulesToInsert, {
                            transaction: t,
                            ignoreDuplicates: true
                        });
                    }
                }
            }
        }

        await t.commit();
        return success(res, { classroom }, 'Classroom created', 201);
    } catch (err) { 
        await t.rollback();
        next(err); 
    }
};

// ── PUT /api/classrooms/:id ──────────────────────────────────────────────────
const updateClassroom = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const classroom = await Classroom.findByPk(req.params.id, { transaction: t });
        if (!classroom) {
            await t.rollback();
            return error(res, 'Classroom not found', 404);
        }
        
        const {
            name, section, academicYear, roomNumber, classTeacherId, status,
            department, departmentId, buildingBlock, blockId, roomId,
            maxCapacity, monitorMaleId, monitorFemaleId
        } = req.body;
        
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

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (section !== undefined) updateData.section = section;
        if (academicYear !== undefined) updateData.academicYear = academicYear;
        if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
        if (classTeacherId !== undefined) updateData.classTeacherId = classTeacherId || null;
        if (status !== undefined) updateData.status = status;
        if (department !== undefined) updateData.department = department;
        if (departmentId !== undefined) updateData.departmentId = departmentId || null;
        if (buildingBlock !== undefined) updateData.buildingBlock = buildingBlock;
        if (blockId !== undefined) updateData.blockId = blockId || null;
        if (roomId !== undefined) updateData.roomId = roomId || null;
        if (maxCapacity !== undefined) updateData.maxCapacity = maxCapacity;
        if (monitorMaleId !== undefined) updateData.monitorMaleId = monitorMaleId || null;
        if (monitorFemaleId !== undefined) updateData.monitorFemaleId = monitorFemaleId || null;

        await classroom.update(updateData, { transaction: t });
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
        const rolesLower = (req.userRoles || []).map(r => String(r).toLowerCase());
        const isPrivileged = rolesLower.some(r => ['admin', 'super_admin', 'principal'].includes(r));
        const isStudent = !isPrivileged && rolesLower.includes('student');

        // Fetch classroom to identify monitors
        const classroom = await Classroom.findByPk(req.params.id, {
            attributes: ['id', 'monitorMaleId', 'monitorFemaleId']
        });
        if (!classroom) return error(res, 'Classroom not found', 404);

        if (isStudent) {
            // Student-safe classmate view: safe DTO only (no emails, phones, medical notes, or guardian info)
            const enrollments = await ClassroomStudent.findAll({
                where: { classroomId: req.params.id },
                include: [{
                    model: Student, as: 'student',
                    attributes: ['id', 'gender'],
                    include: [{
                        model: User, as: 'account',
                        attributes: ['id', 'firstName', 'lastName']
                    }],
                }],
                order: [
                    ['rollNumber', 'ASC'],
                    [{ model: Student, as: 'student' }, { model: User, as: 'account' }, 'firstName', 'ASC']
                ],
            });

            const classmates = enrollments.map(e => {
                const isMonitor = Boolean(
                    (classroom.monitorMaleId && classroom.monitorMaleId === e.studentId) ||
                    (classroom.monitorFemaleId && classroom.monitorFemaleId === e.studentId)
                );
                const firstName = e.student?.account?.firstName || '';
                const lastName = e.student?.account?.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim() || 'Classmate';

                return {
                    id: e.id,
                    studentId: e.studentId,
                    fullName,
                    rollNumber: e.rollNumber || '-',
                    gender: e.student?.gender || null,
                    isMonitor,
                };
            });

            return success(res, { classmates, enrollments: [] });
        }

        // Staff/Admin view: full administrative enrollment records
        const enrollments = await ClassroomStudent.findAll({
            where: { classroomId: req.params.id },
            include: [{
                model: Student, as: 'student',
                attributes: ['id', 'studentId', 'admissionNumber', 'grade', 'section', 'gender', 'status'],
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
        const classroom = await Classroom.findByPk(req.params.id);
        if (!classroom) return error(res, 'Classroom not found', 404);

        const subject = await ClassroomSubject.findOne({
            where: { id: req.params.subjectId, classroomId: req.params.id },
            include: [
                { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
                { model: Teacher, as: 'teacher', attributes: ['id'], include: [teacherAccount()] },
            ]
        });
        if (!subject) return error(res, 'Subject not found in this classroom', 404);

        // 1. Check if ANY subject is already booked in THIS classroom at this overlapping time
        const existingClassroomSlot = await Timetable.findOne({
            include: [{
                model: ClassroomSubject,
                as: 'classroomSubject',
                where: { classroomId: req.params.id },
                include: [{ model: Subject, as: 'subject', attributes: ['id', 'name'] }]
            }],
            where: {
                dayOfWeek,
                startTime: { [Op.lt]: endTime },
                endTime: { [Op.gt]: startTime },
            }
        });

        if (existingClassroomSlot) {
            if (existingClassroomSlot.classroomSubjectId === subject.id && existingClassroomSlot.startTime === startTime && existingClassroomSlot.endTime === endTime) {
                return success(res, { slot: existingClassroomSlot }, 'Slot already exists', 200);
            }
            const bookedSubjName = existingClassroomSlot.classroomSubject?.subject?.name || 'Another subject';
            return error(res, `Classroom Conflict: ${bookedSubjName} is already scheduled in this section on ${dayOfWeek} from ${existingClassroomSlot.startTime.slice(0, 5)} to ${existingClassroomSlot.endTime.slice(0, 5)}.`, 409);
        }

        // 2. Check Cross-Classroom Teacher Conflict (across active classrooms in same academic year)
        if (subject.teacherId) {
            const teacherClash = await Timetable.findOne({
                include: [{
                    model: ClassroomSubject,
                    as: 'classroomSubject',
                    where: { teacherId: subject.teacherId },
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
                    startTime: { [Op.lt]: endTime },
                    endTime: { [Op.gt]: startTime },
                }
            });

            if (teacherClash) {
                const clashClass = teacherClash.classroomSubject?.classroom;
                const clashSubj = teacherClash.classroomSubject?.subject;
                const teacherName = subject.teacher?.account ? `${subject.teacher.account.firstName} ${subject.teacher.account.lastName}` : 'Teacher';
                const className = clashClass ? `${clashClass.name} - Section ${clashClass.section}` : 'another classroom';
                const subjName = clashSubj ? clashSubj.name : 'a lecture';
                return error(res, `Teacher Conflict: ${teacherName} is already scheduled to teach ${subjName} in ${className} on ${dayOfWeek} from ${teacherClash.startTime.slice(0, 5)} to ${teacherClash.endTime.slice(0, 5)}.`, 409);
            }
        }

        // 3. Check Physical Room Conflict (across all active classrooms using this roomId)
        if (classroom.roomId) {
            const roomClash = await Timetable.findOne({
                include: [{
                    model: ClassroomSubject,
                    as: 'classroomSubject',
                    where: { classroomId: { [Op.ne]: classroom.id } },
                    include: [{
                        model: Classroom,
                        as: 'classroom',
                        where: {
                            roomId: classroom.roomId,
                            academicYear: classroom.academicYear,
                            status: 'ACTIVE'
                        },
                        attributes: ['id', 'name', 'section', 'roomNumber']
                    }]
                }],
                where: {
                    dayOfWeek,
                    startTime: { [Op.lt]: endTime },
                    endTime: { [Op.gt]: startTime },
                }
            });

            if (roomClash) {
                const clashClass = roomClash.classroomSubject?.classroom;
                const roomNum = clashClass?.roomNumber || 'the assigned room';
                const className = clashClass ? `${clashClass.name} - Section ${clashClass.section}` : 'another classroom';
                return error(res, `Room Conflict: Room ${roomNum} is already occupied by ${className} on ${dayOfWeek} from ${roomClash.startTime.slice(0, 5)} to ${roomClash.endTime.slice(0, 5)}.`, 409);
            }
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

// ── POST /api/classrooms/:id/periods/generate ─────────────────────────────────
const generatePeriods = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { periods } = req.body;
        const classroom = await Classroom.findByPk(req.params.id, { transaction: t });
        if (!classroom) {
            await t.rollback();
            return error(res, 'Classroom not found', 404);
        }

        // 1. Delete all existing periods for this classroom
        await ClassroomPeriod.destroy({
            where: { classroomId: classroom.id },
            transaction: t,
        });

        // 2. Format and bulk-create the newly generated periods
        const recordsToCreate = periods.map((p, idx) => ({
            classroomId: classroom.id,
            name: p.name,
            startTime: p.startTime,
            endTime: p.endTime,
            order: p.order || idx + 1,
        }));

        const createdPeriods = await ClassroomPeriod.bulkCreate(recordsToCreate, {
            transaction: t,
            returning: true,
        });

        await t.commit();
        return success(res, { periods: createdPeriods }, 'Lectures & periods generated successfully', 201);
    } catch (err) {
        await t.rollback();
        next(err);
    }
};

// ── DELETE /api/classrooms/:id/periods/:periodId ──────────────────────────────
const deletePeriod = async (req, res, next) => {
    try {
        const deleted = await ClassroomPeriod.destroy({ where: { id: req.params.periodId, classroomId: req.params.id } });
        if (!deleted) return error(res, 'Period not found', 404);
        return success(res, null, 'Period deleted');
    } catch (err) { next(err); }
};

// ── PUT /api/classrooms/:id/students/:studentId/roll-number ──────────────────
const updateStudentRollNumber = async (req, res, next) => {
    try {
        const { studentId } = req.params;
        const { rollNumber } = req.body;
        const classroom = await Classroom.findByPk(req.params.id);
        if (!classroom) return error(res, 'Classroom not found', 404);

        const enrollment = await ClassroomStudent.findOne({
            where: { classroomId: classroom.id, studentId }
        });
        if (!enrollment) return error(res, 'Student is not enrolled in this classroom', 404);

        if (rollNumber) {
            const existing = await ClassroomStudent.findOne({
                where: {
                    classroomId: classroom.id,
                    rollNumber: String(rollNumber).trim(),
                    studentId: { [Op.ne]: studentId }
                }
            });
            if (existing) {
                return error(res, `Roll number '${rollNumber}' is already assigned to another student in this classroom.`, 409);
            }
        }

        await enrollment.update({ rollNumber: rollNumber ? String(rollNumber).trim() : null });
        return success(res, { enrollment }, 'Roll number updated successfully');
    } catch (err) { next(err); }
};

// ── POST /api/classrooms/:id/students/auto-roll-numbers ──────────────────────
const autoAssignRollNumbers = async (req, res, next) => {
    try {
        const { sortBy = 'ALPHABETICAL', startFrom = 1, prefix = '' } = req.body;
        const result = await ClassroomService.autoAssignRollNumbers({
            classroomId: req.params.id,
            sortBy,
            startFrom,
            prefix
        });
        return success(res, { enrollments: result.enrollments }, result.message);
    } catch (err) {
        next(err);
    }
};

// ── POST /api/classrooms/:id/students/:studentId/transfer ───────────────────
const transferStudentSection = async (req, res, next) => {
    try {
        const { studentId } = req.params;
        const { targetClassroomId, reason } = req.body;
        const result = await ClassroomService.transferStudentSection({
            sourceClassroomId: req.params.id,
            studentId,
            targetClassroomId,
            reason
        });
        return success(res, { transfer: result.transfer }, result.message);
    } catch (err) {
        next(err);
    }
};

// ── POST /api/classrooms/:id/clone-structure ──────────────────────────────────
const cloneClassroomStructure = async (req, res, next) => {
    try {
        const sourceClassroomId = req.params.id;
        const { targetClassroomId, copyPeriods = true, copySubjects = true, copyTimetable = false } = req.body;
        const result = await ClassroomService.cloneClassroomStructure({
            sourceClassroomId,
            targetClassroomId,
            copyPeriods,
            copySubjects,
            copyTimetable
        });
        return success(res, { summary: result.summary }, result.message);
    } catch (err) {
        next(err);
    }
};

// ── POST /api/classrooms/:id/substitutes ──────────────────────────────────────
const assignSubstituteTeacher = async (req, res, next) => {
    try {
        const { timetableId, substituteTeacherId, date, reason } = req.body;
        const classroomId = req.params.id;
        const result = await ClassroomService.assignSubstituteTeacher({
            classroomId,
            timetableId,
            substituteTeacherId,
            date,
            reason,
            userId: req.user.id
        });
        return success(res, { substitute: result }, 'Substitute teacher assigned successfully', 201);
    } catch (err) {
        next(err);
    }
};

// ── GET /api/classrooms/:id/substitutes ───────────────────────────────────────
const getSubstitutes = async (req, res, next) => {
    try {
        const { date } = req.query;
        const where = { classroomId: req.params.id };
        if (date) where.date = date;

        const substitutes = await TimetableSubstitute.findAll({
            where,
            include: [
                { model: Teacher, as: 'substituteTeacher', attributes: ['id', 'teacherId'], required: false, include: [teacherAccount()] },
                { model: Teacher, as: 'originalTeacher', attributes: ['id', 'teacherId'], required: false, include: [teacherAccount()] },
                { model: Timetable, as: 'slot', attributes: ['id', 'dayOfWeek', 'startTime', 'endTime'] }
            ],
            order: [['date', 'ASC']]
        });

        return success(res, { substitutes });
    } catch (err) { next(err); }
};

// ── GET /api/classrooms/:id/substitutes/candidates ────────────────────────────
const getSubstituteCandidates = async (req, res, next) => {
    try {
        const { date, startTime, endTime, excludeTeacherId, subjectId, subjectName, department } = req.query;
        if (!date || !startTime || !endTime) {
            return error(res, 'date, startTime, and endTime are required query parameters', 400);
        }

        const candidates = await TeacherAvailabilityService.getTeachersWithAvailability({
            date,
            startTime,
            endTime,
            excludeTeacherId,
            subjectId,
            subjectName,
            department
        });

        return success(res, { candidates });
    } catch (err) { next(err); }
};

// ── DELETE /api/classrooms/:id/substitutes/:substituteId ──────────────────────
const cancelSubstitute = async (req, res, next) => {
    try {
        const substitute = await TimetableSubstitute.findOne({
            where: { id: req.params.substituteId, classroomId: req.params.id }
        });
        if (!substitute) return error(res, 'Substitute assignment not found', 404);

        await substitute.destroy();
        return success(res, null, 'Substitute assignment cancelled');
    } catch (err) { next(err); }
};

// ── POST /api/classrooms/promotions/bulk ──────────────────────────────────────
const bulkPromoteStudents = async (req, res, next) => {
    try {
        const { sourceClassroomId, targetAcademicYear, ruleId, promotions } = req.body;
        const result = await ClassroomService.bulkPromoteStudents({
            sourceClassroomId,
            targetAcademicYear,
            ruleId,
            promotions,
            promotedBy: req.user?.id
        });
        return success(res, { summary: result.summary }, result.message);
    } catch (err) {
        next(err);
    }
};

// ── GET /api/classrooms/:id/promotions/evaluate ───────────────────────────────
const evaluatePromotionCandidates = async (req, res, next) => {
    try {
        const result = await ClassroomService.evaluatePromotionCandidates(req.params.id);
        return success(res, result);
    } catch (err) {
        next(err);
    }
};

// ── GET /api/classrooms/promotions/rules ───────────────────────────────────────
const getPromotionRules = async (req, res, next) => {
    try {
        const { PromotionRule, AcademicClass } = db;
        const rules = await PromotionRule.findAll({
            include: [{ model: AcademicClass, as: 'academicClass', attributes: ['id', 'name', 'code'] }],
            order: [['created_at', 'DESC']]
        });
        return success(res, { rules });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/classrooms/promotions/rules ──────────────────────────────────────
const createPromotionRule = async (req, res, next) => {
    try {
        const { PromotionRule } = db;
        const {
            name,
            academicClassId,
            minOverallPercentage,
            mustPassAllSubjects,
            minSubjectPercentage,
            maxCompartmentSubjects,
            minAttendancePercentage
        } = req.body;

        const rule = await PromotionRule.create({
            name,
            academicClassId: academicClassId || null,
            minOverallPercentage: minOverallPercentage ?? 33.0,
            mustPassAllSubjects: mustPassAllSubjects ?? true,
            minSubjectPercentage: minSubjectPercentage ?? 33.0,
            maxCompartmentSubjects: maxCompartmentSubjects ?? 0,
            minAttendancePercentage: minAttendancePercentage || null,
            status: 'ACTIVE'
        });
        return success(res, { rule }, 'Promotion rule created successfully', 201);
    } catch (err) {
        next(err);
    }
};

// ── PUT /api/classrooms/promotions/rules/:ruleId ───────────────────────────────
const updatePromotionRule = async (req, res, next) => {
    try {
        const { PromotionRule } = db;
        const rule = await PromotionRule.findByPk(req.params.ruleId);
        if (!rule) return error(res, 'Promotion rule not found', 404);

        const allowedFields = [
            'name', 'academicClassId', 'minOverallPercentage',
            'mustPassAllSubjects', 'minSubjectPercentage',
            'maxCompartmentSubjects', 'minAttendancePercentage', 'status'
        ];
        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        await rule.update(updateData);
        return success(res, { rule }, 'Promotion rule updated successfully');
    } catch (err) {
        next(err);
    }
};

export {
    listClassrooms, getClassroom, createClassroom, updateClassroom, deleteClassroom,
    getRoster, assignStudents, removeStudent,
    getSubjects, addSubject, removeSubject,
    upsertTimetableSlot, deleteTimetableSlot,
    addPeriod, generatePeriods, deletePeriod,
    updateStudentRollNumber, autoAssignRollNumbers,
    transferStudentSection, cloneClassroomStructure,
    assignSubstituteTeacher, getSubstitutes, getSubstituteCandidates, cancelSubstitute,
    bulkPromoteStudents,
    evaluatePromotionCandidates,
    getPromotionRules,
    createPromotionRule,
    updatePromotionRule,
};
