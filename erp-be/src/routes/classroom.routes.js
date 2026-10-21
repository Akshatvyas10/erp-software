'use strict';
import express from 'express';
const router = express.Router();
import { body, param } from 'express-validator';
import * as C from '../controllers/classroomController.js';
import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';
import enforceClassroomScope from '../middlewares/classroomScope.js';

router.use(authenticate);

const isUUID = (name) => param(name).isUUID().withMessage(`${name} must be a UUID`);

// ── Classrooms ────────────────────────────────────────────────────────────────
router.post('/promotions/bulk',
    [
        body('sourceClassroomId').isUUID().withMessage('sourceClassroomId must be a valid UUID'),
        body('targetAcademicYear').trim().notEmpty().withMessage('targetAcademicYear is required'),
        body('promotions').isArray({ min: 1 }).withMessage('promotions must be a non-empty array'),
        body('promotions.*.studentId').isUUID().withMessage('Each promotion must specify a valid studentId UUID'),
        body('promotions.*.action').isIn(['PROMOTE', 'RETAIN', 'TC', 'ALUMNI']).withMessage('action must be PROMOTE, RETAIN, TC, or ALUMNI'),
        body('promotions.*.targetClassroomId').optional({ checkFalsy: true }).isUUID().withMessage('targetClassroomId must be a valid UUID')
    ],
    validate,
    requirePermission('classrooms', 'manage'),
    C.bulkPromoteStudents
);
router.get('/', requirePermission('classrooms', 'read'), C.listClassrooms);
router.get('/:id', [isUUID('id')], validate, requirePermission('classrooms', 'read'), enforceClassroomScope, C.getClassroom);
router.post('/',
    [
        body('classId').optional().isUUID().withMessage('classId must be a valid UUID'),
        body('name').optional().trim(),
        body('section').trim().toUpperCase().isIn(['A', 'B', 'C', 'D', 'E', 'F', 'G']).withMessage('Section must be between A and G'),
        body('academicYear').trim().notEmpty().withMessage('Academic year is required')
    ],
    validate, requirePermission('classrooms', 'create'), C.createClassroom);
router.put('/:id', [isUUID('id')], validate, requirePermission('classrooms', 'update'), enforceClassroomScope, C.updateClassroom);
router.delete('/:id', [isUUID('id')], validate, requirePermission('classrooms', 'delete'), enforceClassroomScope, C.deleteClassroom);
router.post('/:id/clone-structure', [isUUID('id')], validate, requirePermission('classrooms', 'create'), enforceClassroomScope, C.cloneClassroomStructure);

// ── Roster & Roll Numbers ────────────────────────────────────────────────────
router.get('/:id/students', [isUUID('id')], validate, requirePermission('classrooms', 'read'), enforceClassroomScope, C.getRoster);
router.post('/:id/students',
    [isUUID('id'), body('studentIds').isArray({ min: 1 })],
    validate, requirePermission('classrooms', 'update'), enforceClassroomScope, C.assignStudents);
router.delete('/:id/students/:studentId',
    [isUUID('id'), isUUID('studentId')], validate,
    requirePermission('classrooms', 'update'), enforceClassroomScope, C.removeStudent);
router.put('/:id/students/:studentId/roll-number',
    [isUUID('id'), isUUID('studentId')], validate,
    requirePermission('classrooms', 'update'), enforceClassroomScope, C.updateStudentRollNumber);
router.post('/:id/students/auto-roll-numbers',
    [isUUID('id')], validate,
    requirePermission('classrooms', 'update'), enforceClassroomScope, C.autoAssignRollNumbers);
router.post('/:id/students/:studentId/transfer',
    [isUUID('id'), isUUID('studentId'), body('targetClassroomId').isUUID()], validate,
    requirePermission('classrooms', 'update'), enforceClassroomScope, C.transferStudentSection);

// ── Subjects ──────────────────────────────────────────────────────────────────
router.get('/:id/subjects', [isUUID('id')], validate, requirePermission('classrooms', 'read'), enforceClassroomScope, C.getSubjects);
router.post('/:id/subjects',
    [isUUID('id'), body('subjectId').isUUID().withMessage('subjectId must be a UUID')],
    validate, requirePermission('classrooms', 'update'), enforceClassroomScope, C.addSubject);
router.delete('/:id/subjects/:subjectId',
    [isUUID('id'), isUUID('subjectId')], validate,
    requirePermission('classrooms', 'update'), enforceClassroomScope, C.removeSubject);

// ── Periods ───────────────────────────────────────────────────────────────────
router.post('/:id/periods',
    [isUUID('id'), body('name').notEmpty(), body('startTime').notEmpty(), body('endTime').notEmpty()],
    validate, requirePermission('classrooms', 'update'), enforceClassroomScope, C.addPeriod);
router.delete('/:id/periods/:periodId',
    [isUUID('id'), isUUID('periodId')], validate,
    requirePermission('classrooms', 'update'), enforceClassroomScope, C.deletePeriod);

// ── Timetable ─────────────────────────────────────────────────────────────────
router.post('/:id/subjects/:subjectId/timetable',
    [
        isUUID('id'), isUUID('subjectId'),
        body('dayOfWeek').isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
        body('startTime').notEmpty(), body('endTime').notEmpty(),
    ],
    validate, requirePermission('classrooms', 'update'), enforceClassroomScope, C.upsertTimetableSlot);
router.delete('/:id/subjects/:subjectId/timetable/:slotId',
    [isUUID('id'), isUUID('subjectId'), isUUID('slotId')], validate,
    requirePermission('classrooms', 'update'), enforceClassroomScope, C.deleteTimetableSlot);

// ── Substitutes ───────────────────────────────────────────────────────────────
router.get('/:id/substitutes', [isUUID('id')], validate, requirePermission('classrooms', 'read'), enforceClassroomScope, C.getSubstitutes);
router.post('/:id/substitutes',
    [isUUID('id'), body('timetableId').isUUID(), body('substituteTeacherId').isUUID(), body('date').notEmpty()],
    validate, requirePermission('classrooms', 'update'), enforceClassroomScope, C.assignSubstituteTeacher);
router.delete('/:id/substitutes/:substituteId',
    [isUUID('id'), isUUID('substituteId')], validate,
    requirePermission('classrooms', 'update'), enforceClassroomScope, C.cancelSubstitute);

export default router;
