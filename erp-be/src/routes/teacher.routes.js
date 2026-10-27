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
import { handleTeacherPhotoUpload } from '../middlewares/uploadMiddleware.js';

router.use(authenticate);

const createValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Gender must be MALE, FEMALE, or OTHER'),
    body('dob').optional({ checkFalsy: true }).isISO8601().withMessage('Date of birth must be a valid date'),
    body('phone').optional({ checkFalsy: true }).matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Valid phone number required'),
    body('aadhaarNo').optional({ checkFalsy: true }).matches(/^[0-9]{12}$/).withMessage('Aadhaar must be exactly 12 digits'),
    body('panNo').optional({ checkFalsy: true }).matches(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/).withMessage('PAN must follow standard format (e.g., ABCDE1234F)'),
    body('ifscCode').optional({ checkFalsy: true }).matches(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/).withMessage('IFSC code must follow standard format (e.g., SBIN0001234)'),
    body('employmentType').optional().isIn(['part_time', 'full_time', 'double_shift', 'casual', 'hourly']),
    body('salaryType').optional().isIn(['fixed_monthly', 'hourly']),
    body('fixedMonthlySalary').optional({ checkFalsy: true }).isDecimal(),
    body('hourlyRate').optional({ checkFalsy: true }).isDecimal(),
    body('dailyWorkingHours').optional({ checkFalsy: true }).isDecimal(),
    body('casualLeaveBalance').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('sickLeaveBalance').optional({ checkFalsy: true }).isInt({ min: 0 }),
];

const updateValidation = [
    param('id').isUUID().withMessage('Valid teacher ID is required'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']),
    body('dob').optional({ checkFalsy: true }).isISO8601(),
    body('phone').optional({ checkFalsy: true }).matches(/^[0-9+\-\s()]{7,20}$/),
    body('aadhaarNo').optional({ checkFalsy: true }).matches(/^[0-9]{12}$/),
    body('panNo').optional({ checkFalsy: true }).matches(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/),
    body('ifscCode').optional({ checkFalsy: true }).matches(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/),
    body('employmentType').optional().isIn(['part_time', 'full_time', 'double_shift', 'casual', 'hourly']),
    body('salaryType').optional().isIn(['fixed_monthly', 'hourly']),
    body('fixedMonthlySalary').optional({ checkFalsy: true }).isDecimal(),
    body('hourlyRate').optional({ checkFalsy: true }).isDecimal(),
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
    handleTeacherPhotoUpload,
    createValidation, validate,
    requirePermission('teachers', 'create'),
    createTeacher
);

router.put('/:id',
    handleTeacherPhotoUpload,
    updateValidation, validate,
    requirePermission('teachers', 'update'),
    updateTeacher
);

router.delete('/:id',
    [param('id').isUUID()], validate,
    requirePermission('teachers', 'delete'),
    deleteTeacher
);

export default router;

