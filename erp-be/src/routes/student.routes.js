'use strict';

import express from 'express';
const router = express.Router();
import { body, param, query } from 'express-validator';

import * as studentController from '../controllers/studentController.js';
const { listStudents, getStudent, getMyStudentProfile,
    createStudent, updateStudent, deleteStudent, getStudentExamResults, getStudentAttendance } = studentController;



import authenticate from '../middlewares/authenticate.js';
import { requirePermission, requireRole } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';
import { handleProfilePhotoUpload } from '../middlewares/uploadMiddleware.js';

// ─── All routes require a valid JWT ──────────────────────────────────────────
router.use(authenticate);

// ─── Shared validation chains ─────────────────────────────────────────────────

// Validation for POST — multipart form; body fields arrive as strings
const createStudentValidation = [
    body('email')
        .isEmail().withMessage('Valid email required')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName')
        .trim().notEmpty().withMessage('First name is required')
        .isLength({ max: 100 }),
    body('lastName')
        .trim().notEmpty().withMessage('Last name is required')
        .isLength({ max: 100 }),
    body('admissionNumber')
        .optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
    body('rollNumber')
        .optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('grade')
        .optional().trim().isLength({ max: 20 }),
    body('section')
        .optional().trim().isLength({ max: 10 }),
    body('dateOfBirth')
        .optional().isISO8601().withMessage('Invalid date (YYYY-MM-DD)'),
    body('gender')
        .optional().trim().isLength({ max: 20 }),
    body('bloodGroup')
        .optional().trim().isLength({ max: 5 }),
    body('transportationMode')
        .optional()
        .isIn(['SCHOOL_BUS', 'PRIVATE_TRANSPORT', 'WALKER'])
        .withMessage('Invalid transport mode'),
    body('guardianPhone')
        .optional().trim().isLength({ max: 20 }),
    body('guardianEmail')
        .optional().isEmail().withMessage('Invalid guardian email'),
    body('feeQuota')
        .optional()
        .isIn(['REGULAR', 'STAFF_CHILD', 'SCHOLARSHIP_HALF', 'SCHOLARSHIP_FULL']),
    body('status')
        .optional()
        .isIn(['ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED']),
    // Optional classroom junction
    body('classroomId')
        .optional()
        .isUUID().withMessage('classroomId must be a valid UUID'),
];

const updateStudentValidation = [
    param('id').isUUID().withMessage('Invalid student ID'),
    body('email').optional().isEmail(),
    body('firstName').optional().trim().isLength({ max: 100 }),
    body('lastName').optional().trim().isLength({ max: 100 }),
    body('admissionNumber').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
    body('rollNumber').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('grade').optional().trim().isLength({ max: 20 }),
    body('section').optional().trim().isLength({ max: 10 }),
    body('dateOfBirth').optional().isISO8601(),
    body('gender').optional().trim().isLength({ max: 20 }),
    body('bloodGroup').optional().trim().isLength({ max: 5 }),
    body('transportationMode')
        .optional()
        .isIn(['SCHOOL_BUS', 'PRIVATE_TRANSPORT', 'WALKER']),
    body('guardianEmail').optional().isEmail(),
    body('feeQuota')
        .optional()
        .isIn(['REGULAR', 'STAFF_CHILD', 'SCHOLARSHIP_HALF', 'SCHOLARSHIP_FULL']),
    body('status')
        .optional()
        .isIn(['ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED']),
];

const listQueryValidation = [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('status').optional().isIn(['ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED']),
    query('classroomId').optional().isUUID(),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// Own profile — student role only
router.get('/me',
    requireRole('student', 'admin', 'super_admin'),
    getMyStudentProfile
);

// List (paginated, filtered)
router.get('/',
    listQueryValidation, validate,
    requirePermission('students', 'read'),
    listStudents
);

// Single record
router.get('/:id',
    [param('id').isUUID()], validate,
    requirePermission('students', 'read'),
    getStudent
);

// Exam results
router.get('/:id/exam-results',
    [param('id').isUUID()], validate,
    requirePermission('students', 'read'),
    getStudentExamResults
);

// Attendance
router.get('/:id/attendance',
    [param('id').isUUID()], validate,
    requirePermission('students', 'read'),
    getStudentAttendance
);

// Create — multipart/form-data (file upload + text fields)
// Middleware order: auth → upload → validate → permission → controller
router.post('/',
    handleProfilePhotoUpload,          // multer — must run before validators
    createStudentValidation, validate,
    requirePermission('students', 'create'),
    createStudent
);

// Update — also accepts optional file replacement
router.put('/:id',
    handleProfilePhotoUpload,
    updateStudentValidation, validate,
    requirePermission('students', 'update'),
    updateStudent
);

// Soft delete
router.delete('/:id',
    [param('id').isUUID()], validate,
    requirePermission('students', 'delete'),
    deleteStudent
);

export default router;
