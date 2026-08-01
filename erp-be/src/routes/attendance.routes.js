'use strict';

const router = require('express').Router();
const { body, param } = require('express-validator');
const {
    getTeacherAttendance, markAttendance, biometricEntry, getTodayAttendance,
} = require('../controllers/attendanceController');
const authenticate = require('../middlewares/authenticate');
const { requirePermission } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

// Biometric device webhook — no JWT (secured by device API key in future)
// For now kept open for testing; add IP allowlist in production
router.post('/biometric', biometricEntry);

router.use(authenticate);

router.get('/teacher/:teacherId',
    [param('teacherId').isUUID()], validate,
    requirePermission('teachers', 'read'),
    getTeacherAttendance
);

router.get('/teacher/:teacherId/today',
    [param('teacherId').isUUID()], validate,
    requirePermission('teachers', 'read'),
    getTodayAttendance
);

router.post('/teacher',
    [
        body('teacherId').isUUID(),
        body('date').isDate(),
        body('status').isIn(['present', 'absent', 'half_day', 'late', 'on_leave', 'holiday']),
    ],
    validate,
    requirePermission('teachers', 'update'),
    markAttendance
);

module.exports = router;
