'use strict';
import express from 'express';
const router = express.Router();
import { body, param } from 'express-validator';
import * as C from '../controllers/classroomController.js';
import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';

router.use(authenticate);

const isUUID = (name) => param(name).isUUID().withMessage(`${name} must be a UUID`);

// ── Classrooms ────────────────────────────────────────────────────────────────
router.get('/', requirePermission('classrooms', 'read'), C.listClassrooms);
router.get('/:id', [isUUID('id')], validate, requirePermission('classrooms', 'read'), C.getClassroom);
router.post('/',
    [body('name').trim().notEmpty(), body('section').trim().notEmpty(), body('academicYear').trim().notEmpty()],
    validate, requirePermission('classrooms', 'create'), C.createClassroom);
router.put('/:id', [isUUID('id')], validate, requirePermission('classrooms', 'update'), C.updateClassroom);
router.delete('/:id', [isUUID('id')], validate, requirePermission('classrooms', 'delete'), C.deleteClassroom);

// ── Roster ────────────────────────────────────────────────────────────────────
router.get('/:id/students', [isUUID('id')], validate, requirePermission('classrooms', 'read'), C.getRoster);
router.post('/:id/students',
    [isUUID('id'), body('studentIds').isArray({ min: 1 })],
    validate, requirePermission('classrooms', 'update'), C.assignStudents);
router.delete('/:id/students/:studentId',
    [isUUID('id'), isUUID('studentId')], validate,
    requirePermission('classrooms', 'update'), C.removeStudent);

// ── Subjects ──────────────────────────────────────────────────────────────────
router.get('/:id/subjects', [isUUID('id')], validate, requirePermission('classrooms', 'read'), C.getSubjects);
router.post('/:id/subjects',
    [isUUID('id'), body('subjectId').isUUID().withMessage('subjectId must be a UUID')],
    validate, requirePermission('classrooms', 'update'), C.addSubject);
router.delete('/:id/subjects/:subjectId',
    [isUUID('id'), isUUID('subjectId')], validate,
    requirePermission('classrooms', 'update'), C.removeSubject);

// ── Periods ───────────────────────────────────────────────────────────────────
router.post('/:id/periods',
    [isUUID('id'), body('name').notEmpty(), body('startTime').notEmpty(), body('endTime').notEmpty()],
    validate, requirePermission('classrooms', 'update'), C.addPeriod);
router.delete('/:id/periods/:periodId',
    [isUUID('id'), isUUID('periodId')], validate,
    requirePermission('classrooms', 'update'), C.deletePeriod);

// ── Timetable ─────────────────────────────────────────────────────────────────
router.post('/:id/subjects/:subjectId/timetable',
    [
        isUUID('id'), isUUID('subjectId'),
        body('dayOfWeek').isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
        body('startTime').notEmpty(), body('endTime').notEmpty(),
    ],
    validate, requirePermission('classrooms', 'update'), C.upsertTimetableSlot);
router.delete('/:id/subjects/:subjectId/timetable/:slotId',
    [isUUID('id'), isUUID('subjectId'), isUUID('slotId')], validate,
    requirePermission('classrooms', 'update'), C.deleteTimetableSlot);

export default router;
