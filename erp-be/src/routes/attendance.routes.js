'use strict';

import express from 'express';
const router = express.Router();
import { body, param } from 'express-validator';
import * as attendanceController from '../controllers/attendanceController.js';
const { getTeacherAttendance, markAttendance, biometricEntry, getTodayAttendance, } = attendanceController;
import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';

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

export default router;
