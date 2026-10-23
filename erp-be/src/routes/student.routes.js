'use strict';

import express from 'express';
const router = express.Router();
import { body, param, query } from 'express-validator';

import * as studentController from '../controllers/studentController.js';
const { listStudents, getStudent, getMyStudentProfile,
    createStudent, updateStudent, deleteStudent, getStudentExamResults, getStudentAttendance, getStudentAcademicHistory } = studentController;



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
        .isEmail().withMessage('Valid email required for student account')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName')
        .trim().notEmpty().withMessage('First name is required')
        .isLength({ max: 100 }).withMessage('First name cannot exceed 100 characters'),
    body('lastName')
        .trim().notEmpty().withMessage('Last name is required')
        .isLength({ max: 100 }).withMessage('Last name cannot exceed 100 characters'),
    body('admissionNumber')
        .optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
    body('rollNumber')
        .optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('grade')
        .optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('section')
        .optional({ checkFalsy: true }).trim().isLength({ max: 10 }),
    body('dateOfBirth')
        .notEmpty().withMessage('Date of birth is required')
        .isISO8601().withMessage('Invalid date format (YYYY-MM-DD)')
        .custom((val) => {
            if (new Date(val) > new Date()) {
                throw new Error('Date of birth cannot be in the future');
            }
            return true;
        }),
    body('gender')
        .notEmpty().withMessage('Gender is required')
        .isIn(['Male', 'Female', 'Other', 'Prefer not to say'])
        .withMessage('Invalid gender selection'),
    body('bloodGroup')
        .optional({ checkFalsy: true }).trim()
        .isIn(['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'A-', 'B-', 'AB-', 'O-'])
        .withMessage('Invalid blood group'),
    body('transportationMode')
        .optional()
        .isIn(['SCHOOL_BUS', 'PRIVATE_TRANSPORT', 'WALKER'])
        .withMessage('Invalid transport mode'),
    body('guardianName')
        .trim().notEmpty().withMessage('Primary guardian name is required')
        .isLength({ max: 200 }),
    body('guardianRelationship')
        .trim().notEmpty().withMessage('Guardian relationship is required')
        .isLength({ max: 50 }),
    body('guardianPhone')
        .trim().notEmpty().withMessage('Guardian phone number is required')
        .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
        .withMessage('Invalid phone number format'),
    body('guardianEmail')
        .optional({ checkFalsy: true }).isEmail().withMessage('Invalid guardian email'),
    body('permanentAddress')
        .trim().notEmpty().withMessage('Permanent address is required')
        .isLength({ min: 5, max: 1000 }).withMessage('Permanent address must be between 5 and 1000 characters'),
    body('currentAddress')
        .optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('governmentId')
        .optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
    body('medicalNotes')
        .optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('feeQuota')
        .optional()
        .isIn(['REGULAR', 'STAFF_CHILD', 'SCHOLARSHIP_HALF', 'SCHOLARSHIP_FULL']),
    body('status')
        .optional()
        .isIn(['ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED']),
    body('classroomId')
        .optional({ checkFalsy: true })
        .isUUID().withMessage('classroomId must be a valid UUID'),
];

const updateStudentValidation = [
    param('id').isUUID().withMessage('Invalid student ID'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty').isLength({ max: 100 }),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty').isLength({ max: 100 }),
    body('admissionNumber').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
    body('rollNumber').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('grade').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('section').optional({ checkFalsy: true }).trim().isLength({ max: 10 }),
    body('dateOfBirth')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('Invalid date format')
        .custom((val) => {
            if (new Date(val) > new Date()) {
                throw new Error('Date of birth cannot be in the future');
            }
            return true;
        }),
    body('gender')
        .optional()
        .isIn(['Male', 'Female', 'Other', 'Prefer not to say'])
        .withMessage('Invalid gender selection'),
    body('bloodGroup')
        .optional({ checkFalsy: true })
        .isIn(['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'A-', 'B-', 'AB-', 'O-']),
    body('transportationMode')
        .optional()
        .isIn(['SCHOOL_BUS', 'PRIVATE_TRANSPORT', 'WALKER']),
    body('guardianName').optional().trim().notEmpty().withMessage('Guardian name cannot be empty'),
    body('guardianPhone')
        .optional({ checkFalsy: true })
        .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
        .withMessage('Invalid phone number format'),
    body('guardianEmail').optional({ checkFalsy: true }).isEmail().withMessage('Invalid guardian email'),
    body('permanentAddress').optional({ checkFalsy: true }).trim().isLength({ min: 5, max: 1000 }),
    body('currentAddress').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('governmentId').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
    body('medicalNotes').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('feeQuota')
        .optional()
        .isIn(['REGULAR', 'STAFF_CHILD', 'SCHOLARSHIP_HALF', 'SCHOLARSHIP_FULL']),
    body('status')
        .optional()
        .isIn(['ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED']),
    body('classroomId')
        .optional({ checkFalsy: true })
        .isUUID().withMessage('classroomId must be a valid UUID'),
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

// Full Student Academic History Ledger
router.get('/:id/academic-history',
    [param('id').isUUID()], validate,
    requirePermission('students', 'read'),
    getStudentAcademicHistory
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
