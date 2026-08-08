'use strict';

import express from 'express';
const router = express.Router();
import { body, param } from 'express-validator';
import * as teacherController from '../controllers/teacherController.js';
const { listTeachers, getMyTeacherProfile, getTeacher,
    createTeacher, updateTeacher, deleteTeacher, } = teacherController;
import authenticate from '../middlewares/authenticate.js';
import { requirePermission, requireRole } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';

router.use(authenticate);

const createValidation = [
// body('userId').trim().notEmpty(), // Auto-generated now
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('employmentType').optional().isIn(['part_time', 'full_time', 'double_shift', 'casual', 'hourly']),
    body('salaryType').optional().isIn(['fixed_monthly', 'hourly']),
    body('fixedMonthlySalary').optional().isDecimal(),
    body('hourlyRate').optional().isDecimal(),
    body('dailyWorkingHours').optional().isDecimal(),
    body('casualLeaveBalance').optional().isInt({ min: 0 }),
    body('sickLeaveBalance').optional().isInt({ min: 0 }),
];

// /me MUST come before /:id to avoid Express treating "me" as a UUID param
router.get('/me', requireRole('teacher', 'admin', 'super_admin'), getMyTeacherProfile);

router.get('/', requirePermission('teachers', 'read'), listTeachers);

router.get('/:id',
    [param('id').isUUID()], validate,
    requirePermission('teachers', 'read'),
    getTeacher
);

router.post('/',
    createValidation, validate,
    requirePermission('teachers', 'create'),
    createTeacher
);

router.put('/:id',
    [param('id').isUUID()], validate,
    requirePermission('teachers', 'update'),
    updateTeacher
);

router.delete('/:id',
    [param('id').isUUID()], validate,
    requirePermission('teachers', 'delete'),
    deleteTeacher
);

export default router;
