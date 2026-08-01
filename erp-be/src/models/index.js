'use strict';

const sequelize = require('../config/database');
const Role = require('./Role');
const Permission = require('./Permission');
const User = require('./User');
const Student = require('./Student');
const Teacher = require('./Teacher');
const TeacherAttendance = require('./TeacherAttendance');
const SalarySlip = require('./SalarySlip');
const Department = require('./Department');
const Classroom = require('./Classroom');
const ClassroomStudent = require('./ClassroomStudent');
const ClassroomSubject = require('./ClassroomSubject');
const ClassroomPeriod = require('./ClassroomPeriod');
const Timetable = require('./Timetable');
const Subject = require('./Subject');

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

module.exports = {
    sequelize, Role, Permission, User, Student, Teacher,
    TeacherAttendance, SalarySlip, Department,
    Classroom, ClassroomStudent, ClassroomPeriod, ClassroomSubject, Timetable,
    Subject,
};
