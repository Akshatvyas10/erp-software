'use strict';

const router = require('express').Router();
const { body, param } = require('express-validator');
const {
    listTeachers, getMyTeacherProfile, getTeacher,
    createTeacher, updateTeacher, deleteTeacher,
} = require('../controllers/teacherController');
const authenticate = require('../middlewares/authenticate');
const { requirePermission, requireRole } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

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

module.exports = router;
