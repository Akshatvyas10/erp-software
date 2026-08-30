'use strict';

import sequelize from '../config/database.js';
import Role from './Role.js';
import Permission from './Permission.js';
import User from './User.js';
import Student from './Student.js';
import Teacher from './Teacher.js';
import TeacherAttendance from './TeacherAttendance.js';
import SalarySlip from './SalarySlip.js';
import Department from './Department.js';
import Classroom from './Classroom.js';
import ClassroomStudent from './ClassroomStudent.js';
import ClassroomSubject from './ClassroomSubject.js';
import ClassroomPeriod from './ClassroomPeriod.js';
import Timetable from './Timetable.js';
import Subject from './Subject.js';
import Homework from './Homework.js';
import HomeworkSubmission from './HomeworkSubmission.js';
import CalendarEvent from './CalendarEvent.js';
import EventType from './EventType.js';
import StudentAttendance from './StudentAttendance.js';
import PermissionAuditLogInit from './PermissionAuditLog.js';

const PermissionAuditLog = PermissionAuditLogInit(sequelize);

// ─── Role ↔ Permission ────────────────────────────────────────────────────────
Role.belongsToMany(Permission, { through: 'role_permissions', foreignKey: 'role_id', otherKey: 'permission_id', timestamps: false });
Permission.belongsToMany(Role, { through: 'role_permissions', foreignKey: 'permission_id', otherKey: 'role_id', timestamps: false });

// ─── User ↔ Role ──────────────────────────────────────────────────────────────
User.belongsToMany(Role, { through: 'user_roles', foreignKey: 'user_id', otherKey: 'role_id', timestamps: false });
Role.belongsToMany(User, { through: 'user_roles', foreignKey: 'role_id', otherKey: 'user_id', timestamps: false });

// ─── User ↔ Student (1:1) ─────────────────────────────────────────────────────
User.hasOne(Student, { foreignKey: { name: 'userId', type: sequelize.Sequelize.UUID, allowNull: false }, as: 'studentProfile', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Student.belongsTo(User, { foreignKey: { name: 'userId', type: sequelize.Sequelize.UUID, allowNull: false }, as: 'account' });

// ─── User ↔ Teacher (1:1) ─────────────────────────────────────────────────────
User.hasOne(Teacher, { foreignKey: { name: 'userId', type: sequelize.Sequelize.UUID, allowNull: false }, as: 'teacherProfile', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Teacher.belongsTo(User, { foreignKey: { name: 'userId', type: sequelize.Sequelize.UUID, allowNull: false }, as: 'account' });

// ─── Teacher ↔ TeacherAttendance (1:many) ────────────────────────────────────
Teacher.hasMany(TeacherAttendance, { foreignKey: 'teacherId', as: 'attendance', onDelete: 'CASCADE' });
TeacherAttendance.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });

// ─── Teacher ↔ SalarySlip (1:many) ───────────────────────────────────────────
Teacher.hasMany(SalarySlip, { foreignKey: 'teacherId', as: 'salarySlips', onDelete: 'CASCADE' });
SalarySlip.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });

// ─── Department ↔ Teacher ────────────────────────────────────────────────────
Department.belongsTo(Teacher, { foreignKey: 'headId', as: 'head' });
Teacher.hasOne(Department, { foreignKey: 'headId', as: 'managedDepartment' });

// ─── Classroom ↔ Student (many-to-many via ClassroomStudent) ─────────────────
Classroom.hasMany(ClassroomStudent, { foreignKey: 'classroomId', as: 'enrollments', onDelete: 'CASCADE' });
ClassroomStudent.belongsTo(Classroom, { foreignKey: 'classroomId', as: 'classroom' });
ClassroomStudent.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
Student.hasMany(ClassroomStudent, { foreignKey: 'studentId', as: 'classroomEnrollments' });

// ─── Classroom ↔ ClassroomPeriod (1:many) ────────────────────────────────────
Classroom.hasMany(ClassroomPeriod, { foreignKey: 'classroomId', as: 'periods', onDelete: 'CASCADE' });
ClassroomPeriod.belongsTo(Classroom, { foreignKey: 'classroomId', as: 'classroom' });

// ─── Classroom ↔ ClassroomSubject (1:many) ───────────────────────────────────
Classroom.hasMany(ClassroomSubject, { foreignKey: 'classroomId', as: 'subjects', onDelete: 'CASCADE' });
ClassroomSubject.belongsTo(Classroom, { foreignKey: 'classroomId', as: 'classroom' });
ClassroomSubject.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });
Teacher.hasMany(ClassroomSubject, { foreignKey: 'teacherId', as: 'assignedSubjects' });

// ─── ClassroomSubject ↔ Timetable (1:many) ───────────────────────────────────
ClassroomSubject.hasMany(Timetable, { foreignKey: 'classroomSubjectId', as: 'schedule', onDelete: 'CASCADE' });
Timetable.belongsTo(ClassroomSubject, { foreignKey: 'classroomSubjectId', as: 'classroomSubject' });

// ─── Subject ↔ ClassroomSubject (1:many) ─────────────────────────────────────
Subject.hasMany(ClassroomSubject, { foreignKey: 'subjectId', as: 'classroomSubjects' });
ClassroomSubject.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

// ─── Homework ↔ Classroom / Subject / Teacher ──────────────────────────────────
Classroom.hasMany(Homework, { foreignKey: 'classroomId', as: 'homeworks', onDelete: 'CASCADE' });
Homework.belongsTo(Classroom, { foreignKey: 'classroomId', as: 'classroom' });

Subject.hasMany(Homework, { foreignKey: 'subjectId', as: 'homeworks', onDelete: 'CASCADE' });
Homework.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

Teacher.hasMany(Homework, { foreignKey: 'teacherId', as: 'homeworks', onDelete: 'CASCADE' });
Homework.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });

// ─── Homework ↔ HomeworkSubmission ───────────────────────────────────────────
Homework.hasMany(HomeworkSubmission, { foreignKey: 'homeworkId', as: 'submissions', onDelete: 'CASCADE' });
HomeworkSubmission.belongsTo(Homework, { foreignKey: 'homeworkId', as: 'homework' });

Student.hasMany(HomeworkSubmission, { foreignKey: 'studentId', as: 'homeworkSubmissions', onDelete: 'CASCADE' });
HomeworkSubmission.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

// ─── CalendarEvent ↔ User / Classroom ────────────────────────────────────────
CalendarEvent.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(CalendarEvent, { foreignKey: 'created_by', as: 'createdEvents' });

CalendarEvent.belongsTo(Classroom, { foreignKey: 'target_class_id', as: 'targetClass' });
Classroom.hasMany(CalendarEvent, { foreignKey: 'target_class_id', as: 'events' });

// ─── StudentAttendance Associations ──────────────────────────────────────
StudentAttendance.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Student.hasMany(StudentAttendance, { foreignKey: 'student_id', as: 'attendanceRecords' });

StudentAttendance.belongsTo(Classroom, { foreignKey: 'classroom_id', as: 'classroom' });
Classroom.hasMany(StudentAttendance, { foreignKey: 'classroom_id', as: 'attendanceRecords' });

StudentAttendance.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
Teacher.hasMany(StudentAttendance, { foreignKey: 'teacher_id', as: 'markedAttendance' });

StudentAttendance.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
Subject.hasMany(StudentAttendance, { foreignKey: 'subject_id', as: 'attendanceRecords' });

// ─── PermissionAuditLog ↔ User ─────────────────────────────────────────────
PermissionAuditLog.belongsTo(User, { foreignKey: 'target_user_id', as: 'TargetUser' });
User.hasMany(PermissionAuditLog, { foreignKey: 'target_user_id', as: 'permissionAuditsReceived' });
PermissionAuditLog.belongsTo(User, { foreignKey: 'changed_by', as: 'AdminUser' });
User.hasMany(PermissionAuditLog, { foreignKey: 'changed_by', as: 'permissionAuditsPerformed' });

export default {
    sequelize, Role, Permission, User, Student, Teacher,
    TeacherAttendance, SalarySlip, Department,
    Classroom, ClassroomStudent, ClassroomPeriod, ClassroomSubject, Timetable,
    Subject, Homework, HomeworkSubmission, CalendarEvent, EventType, StudentAttendance,
    PermissionAuditLog
};
