'use strict';

const router = require('express').Router();
const { body, param, query } = require('express-validator');

const {
    listStudents, getStudent, getMyStudentProfile,
    createStudent, updateStudent, deleteStudent,
} = require('../controllers/studentController');

const authenticate = require('../middlewares/authenticate');
const { requirePermission, requireRole } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { handleProfilePhotoUpload } = require('../middlewares/uploadMiddleware');

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
    // NOTE: admissionNumber is now auto-generated — do NOT accept it from client
    body('rollNumber')
        .optional().trim().isLength({ max: 20 }),
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
    body('rollNumber').optional().trim().isLength({ max: 20 }),
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
    query('limit').optional().isInt({ min: 1, max: 100 }),
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

module.exports = router;
